import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
import joblib
import os
import sys
import traceback
import json
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('train.log')
    ]
)
logger = logging.getLogger(__name__)

logger.info("Starting train.py...")

# Define the EmotionTransformer model
class EmotionTransformer(nn.Module):
    def __init__(self, input_dim, hidden_dim, n_layers, n_heads, dropout, n_classes):
        super().__init__()
        self.input_proj = nn.Linear(input_dim, hidden_dim)
        encoder_layer = nn.TransformerEncoderLayer(
            d_model=hidden_dim,
            nhead=n_heads,
            dim_feedforward=hidden_dim * 4,
            dropout=dropout,
            batch_first=True
        )
        self.transformer = nn.TransformerEncoder(encoder_layer, num_layers=n_layers)
        self.fc = nn.Linear(hidden_dim, n_classes)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x):
        x = self.input_proj(x)
        x = x.unsqueeze(1)
        x = self.transformer(x)
        x = x.squeeze(1)
        x = self.dropout(x)
        x = self.fc(x)
        return x

# Custom dataset class
class EmotionDataset(Dataset):
    def __init__(self, features, labels, augment=False):
        self.features = torch.FloatTensor(features)
        self.labels = torch.LongTensor(labels)
        self.augment = augment

    def __len__(self):
        return len(self.labels)

    def __getitem__(self, idx):
        features = self.features[idx]
        if self.augment:
            noise = torch.normal(0, 0.01, features.shape)
            features = features + noise
        return features, self.labels[idx]

# Load and preprocess data
def load_data(file_path):
    logger.info(f"Loading dataset from: {file_path}")
    try:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Dataset file {file_path} not found")
        df = pd.read_excel(file_path)
        logger.info(f"Raw dataset shape: {df.shape}")
        logger.debug(f"Columns: {list(df.columns)}")

        # Check for required columns
        if 'Expression' not in df.columns:
            raise KeyError("Dataset must contain 'Expression' column")
        
        df = df.dropna(subset=['Expression'])
        df = df[df['Expression'].astype(str).str.lower() != 'nan']
        logger.info(f"Shape after removing invalid labels: {df.shape}")
        
        valid_emotions = ['Angry', 'Disgust', 'Fear', 'Happy', 'Neutral', 'Sad']
        df = df[df['Expression'].isin(valid_emotions)]
        if df.empty:
            raise ValueError("No valid emotions found in dataset after filtering")
        logger.info(f"Shape after filtering valid emotions: {df.shape}")
        
        feature_cols = [col for col in df.columns if col not in ['Expression', 'FileName']]
        expected_features = 468 * 3
        if len(feature_cols) != expected_features:
            logger.warning(f"Expected {expected_features} features, got {len(feature_cols)}")
            if len(feature_cols) < expected_features:
                logger.info("Padding missing features with zeros")
                for i in range(len(feature_cols), expected_features):
                    col_name = f"x_{i//3}" if i % 3 == 0 else f"y_{i//3}" if i % 3 == 1 else f"z_{i//3}"
                    df[col_name] = 0
                feature_cols = [col for col in df.columns if col not in ['Expression', 'FileName']]
        
        logger.debug(f"Feature columns: {len(feature_cols)}")
        features = df[feature_cols].values
        if np.any(np.isnan(features)) or np.any(np.isinf(features)):
            logger.warning("Found NaN or infinite values in features. Imputing with zeros...")
            features = np.nan_to_num(features, nan=0.0, posinf=0.0, neginf=0.0)
        
        scaler = StandardScaler()
        features = scaler.fit_transform(features)
        logger.info(f"Features shape after scaling: {features.shape}")
        
        label_encoder = LabelEncoder()
        labels = label_encoder.fit_transform(df['Expression'])
        logger.info(f"Unique emotions: {df['Expression'].unique()}")
        logger.info(f"Label mapping: {dict(zip(label_encoder.classes_, range(len(label_encoder.classes_))))}")
        return features, labels, label_encoder, scaler
    except Exception as e:
        logger.error(f"Error in load_data: {e}")
        traceback.print_exc()
        sys.exit(1)

# Evaluate model on test set
def evaluate_model(model, data_loader, criterion, device):
    model.eval()
    total_loss = 0
    correct = 0
    total = 0
    with torch.no_grad():
        for batch_features, batch_labels in data_loader:
            batch_features = batch_features.to(device)
            batch_labels = batch_labels.to(device)
            outputs = model(batch_features)
            loss = criterion(outputs, batch_labels)
            total_loss += loss.item()
            _, predicted = torch.max(outputs.data, 1)
            total += batch_labels.size(0)
            correct += (predicted == batch_labels).sum().item()
    avg_loss = total_loss / len(data_loader)
    accuracy = 100 * correct / total
    return avg_loss, accuracy

# Main training function
def train_model(train_file):
    logger.info("Entering train_model...")
    # Hyperparameters
    input_dim = 468 * 3
    hidden_dim = 128
    n_layers = 1
    n_heads = 8
    dropout = 0.3
    batch_size = 32
    epochs = 50
    learning_rate = 0.0001
    patience = 10

    # Load training data
    try:
        features, labels, label_encoder, scaler = load_data(train_file)
    except Exception as e:
        logger.error(f"Failed to load training data: {e}")
        sys.exit(1)
    n_classes = len(label_encoder.classes_)
    logger.info(f"Number of classes: {n_classes}")
    if n_classes != 6:
        logger.warning(f"Expected 6 classes, got {n_classes}")

    # Check dataset size
    if len(features) < 10:
        logger.error("Dataset too small for training. Minimum 10 samples required.")
        sys.exit(1)

    # Save scaler and hyperparameters
    try:
        os.makedirs('backend', exist_ok=True)
        joblib.dump(scaler, 'backend/scaler.pkl')
        logger.info("Saved scaler to backend/scaler.pkl")
        hyperparams = {
            'input_dim': input_dim,
            'hidden_dim': hidden_dim,
            'n_layers': n_layers,
            'n_heads': n_heads,
            'dropout': dropout,
            'n_classes': n_classes
        }
        with open('backend/model_hyperparams.json', 'w') as f:
            json.dump(hyperparams, f)
        logger.info("Saved hyperparameters to backend/model_hyperparams.json")
    except Exception as e:
        logger.error(f"Error saving scaler or hyperparameters: {e}")
        traceback.print_exc()
        sys.exit(1)

    # Split data into 80% train, 20% test
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            features, labels, test_size=0.2, random_state=42, stratify=labels
        )
        logger.info(f"Train: {len(X_train)}, Test: {len(X_test)}")
    except Exception as e:
        logger.error(f"Error splitting data: {e}")
        traceback.print_exc()
        sys.exit(1)

    # Create datasets
    try:
        train_dataset = EmotionDataset(X_train, y_train, augment=True)
        train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
        test_dataset = EmotionDataset(X_test, y_test, augment=False)
        test_loader = DataLoader(test_dataset, batch_size=batch_size)
    except Exception as e:
        logger.error(f"Error creating datasets: {e}")
        traceback.print_exc()
        sys.exit(1)

    # Initialize model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"Using device: {device}")
    try:
        model = EmotionTransformer(
            input_dim=input_dim,
            hidden_dim=hidden_dim,
            n_layers=n_layers,
            n_heads=n_heads,
            dropout=dropout,
            n_classes=n_classes
        ).to(device)
    except Exception as e:
        logger.error(f"Error initializing model: {e}")
        traceback.print_exc()
        sys.exit(1)

    # Optimizer and loss
    try:
        criterion = nn.CrossEntropyLoss()
        optimizer = torch.optim.Adam(model.parameters(), lr=learning_rate, weight_decay=1e-4)
    except Exception as e:
        logger.error(f"Error setting up optimizer/loss: {e}")
        traceback.print_exc()
        sys.exit(1)

    # Training loop
    logger.info("Starting training loop...")
    best_acc = 0
    epochs_no_improve = 0
    checkpoint_path = 'backend/emotion_model.pth'
    for epoch in range(epochs):
        try:
            model.train()
            total_loss = 0
            for batch_features, batch_labels in train_loader:
                batch_features = batch_features.to(device)
                batch_labels = batch_labels.to(device)
                optimizer.zero_grad()
                outputs = model(batch_features)
                loss = criterion(outputs, batch_labels)
                if torch.isnan(loss):
                    logger.error(f"NaN loss at epoch {epoch+1}")
                    sys.exit(1)
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
                optimizer.step()
                total_loss += loss.item()

            # Evaluate on test set
            test_loss, test_acc = evaluate_model(model, test_loader, criterion, device)
            logger.info(f'Epoch {epoch+1}/{epochs}, Train Loss: {total_loss/len(train_loader):.4f}, '
                        f'Test Loss: {test_loss:.4f}, Test Accuracy: {test_acc:.2f}%')

            # Save model if accuracy improves
            if test_acc > best_acc:
                best_acc = test_acc
                epochs_no_improve = 0
                torch.save(model.state_dict(), checkpoint_path)
                logger.info(f"Saved best model to {checkpoint_path}")
            else:
                epochs_no_improve += 1
                if epochs_no_improve >= patience:
                    logger.info(f"Early stopping triggered after {epoch+1} epochs")
                    break
        except Exception as e:
            logger.error(f"Error in training loop at epoch {epoch+1}: {e}")
            traceback.print_exc()
            sys.exit(1)

    # Save final model state
    try:
        torch.save(model.state_dict(), checkpoint_path)
        logger.info(f"Saved final model to {checkpoint_path}")
    except Exception as e:
        logger.error(f"Error saving final model: {e}")
        traceback.print_exc()
        sys.exit(1)

    # Save label encoder
    try:
        np.save('backend/label_encoder.npy', label_encoder.classes_)
        logger.info("Saved label encoder to backend/label_encoder.npy")
    except Exception as e:
        logger.error(f"Error saving label encoder: {e}")
        traceback.print_exc()
        sys.exit(1)

    # Final test evaluation
    try:
        model.load_state_dict(torch.load(checkpoint_path))
        test_loss, test_acc = evaluate_model(model, test_loader, criterion, device)
        logger.info(f"Final Test Loss: {test_loss:.4f}, Final Test Accuracy: {test_acc:.2f}%")
    except Exception as e:
        logger.error(f"Error evaluating test set: {e}")
        traceback.print_exc()
        sys.exit(1)

# Entry point
if __name__ == '__main__':
    try:
        logger.info("Executing main block...")
        train_file = 'JoyVerseDataSet_Filled.xlsx'
        train_model(train_file)
    except Exception as e:
        logger.error(f"Error in main: {e}")
        traceback.print_exc()
        sys.exit(1)