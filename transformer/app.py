import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np
import torch
import torch.nn as nn
import joblib
import logging

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('flask.log')
    ]
)

app = Flask(__name__)
CORS(app)

class LandmarkEmotionTransformer(nn.Module):
    def __init__(self, num_landmarks=468, num_emotions=6, d_model=128, nhead=8, num_layers=4):
        super(LandmarkEmotionTransformer, self).__init__()
        self.input_embedding = nn.Linear(3, d_model)
        encoder_layer = nn.TransformerEncoderLayer(d_model=d_model, nhead=nhead, batch_first=True)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)
        self.fc = nn.Linear(num_landmarks * d_model, num_emotions)
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.to(self.device)

    def forward(self, landmarks):
        batch_size = landmarks.size(0)
        x = self.input_embedding(landmarks)
        x = self.transformer_encoder(x)
        x = x.reshape(batch_size, -1)
        x = self.fc(x)
        return x

# Load model and scaler
try:
    app.logger.info("Loading model, scaler, and encoder...")
    model = LandmarkEmotionTransformer(num_landmarks=468, num_emotions=6)
    model.load_state_dict(torch.load('emotion_detector.pth', map_location=model.device))
    model.eval()
    scaler = joblib.load('scaler.pkl')
    label_encoder = np.load('label_encoder.npy', allow_pickle=True)
    app.logger.info("Model, scaler, and encoder loaded successfully")
    app.logger.debug(f"Scaler n_features_in_: {scaler.n_features_in_}")
except Exception as e:
    app.logger.error(f"Failed to load model/scaler/encoder: {str(e)}")
    raise

@app.route('/', methods=['POST'])
def predict_emotion():
    try:
        app.logger.debug(f"Received request from {request.remote_addr}")
        data = request.get_json()
        print("hi")
        if not data or 'landmarks' not in data:
            app.logger.error("Invalid input: Expected JSON with 'landmarks' key")
            return jsonify({'error': "Expected JSON with 'landmarks' key"}), 400

        landmarks = data['landmarks']
        app.logger.debug(f"Received {len(landmarks)} landmarks")
        if not landmarks or not all(isinstance(lm, dict) and all(key in lm for key in ['x', 'y', 'z']) for lm in landmarks):
            app.logger.error("Invalid landmarks: Expected list of dictionaries with x, y, z keys")
            return jsonify({'error': 'Expected list of dictionaries with x, y, z keys'}), 400

        # Pad or truncate to 468 landmarks
        if len(landmarks) < 468:
            app.logger.debug(f"Padding from {len(landmarks)} to 468 landmarks")
            landmarks.extend([{'x': 0, 'y': 0, 'z': 0}] * (468 - len(landmarks)))
        elif len(landmarks) > 468:
            app.logger.debug(f"Truncating from {len(landmarks)} to 468 landmarks")
            landmarks = landmarks[:468]

        # Convert to numpy array
        landmarks_array = np.array([[lm['x'], lm['y'], lm['z']] for lm in landmarks], dtype=np.float32)  # Shape: (468, 3)
        app.logger.debug(f"Landmarks array shape: {landmarks_array.shape}")

        # Flatten to match training format (1404 features)
        landmarks_flat = landmarks_array.reshape(1, -1)  # Shape: (1, 1404)
        app.logger.debug(f"Flattened array shape: {landmarks_flat.shape}")

        # Scale the flattened array
        landmarks_normalized = scaler.transform(landmarks_flat)  # Shape: (1, 1404)
        app.logger.debug(f"Normalized array shape: {landmarks_normalized.shape}")

        # Reshape for model input
        landmarks = landmarks_normalized.reshape(1, 468, 3)  # Shape: (1, 468, 3)
        app.logger.debug(f"Model input shape: {landmarks.shape}")

        # Predict emotion
        features = torch.FloatTensor(landmarks).to(model.device)
        with torch.no_grad():
            logits = model(features)
            predicted_idx = torch.argmax(logits, dim=1).cpu().numpy()[0]
            emotion = label_encoder[predicted_idx]

        app.logger.info(f"Predicted emotion: {emotion}")
        return jsonify({'emotion': emotion})

    except Exception as e:
        app.logger.error(f"Error processing request: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.logger.info("Starting Flask server on http://localhost:5000")
    try:
        app.run(debug=True, host='0.0.0.0', port=5000)
    except Exception as e:
        app.logger.error(f"Failed to start server: {str(e)}")
        raise