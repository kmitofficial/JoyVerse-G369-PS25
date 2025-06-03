import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import logging

# Set up logging to console and file
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('flask.log')
    ]
)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Dummy list of emotions
emotions = ['happy', 'sad', 'angry', 'surprised', 'neutral', 'fear', 'disgust']

@app.route('/', methods=['POST'])
def detect_emotion():
    try:
        print("hi")
        app.logger.debug("Received a request to /detect_emotion")
        data = request.get_json()
        if not data or 'landmarks' not in data:
            app.logger.error("Invalid request: No landmarks provided")
            return jsonify({'error': 'No landmarks provided'}), 400
        
        landmarks = data.get('landmarks', [])
        app.logger.debug(f"Received Landmarks: {landmarks[:10]}... (total: {len(landmarks)})")
        
        # Dummy emotion detection (random selection for demo)
        detected_emotion = random.choice(emotions)
        app.logger.info(f"Returning emotion: {detected_emotion}")
        
        return jsonify({'emotion': detected_emotion})
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