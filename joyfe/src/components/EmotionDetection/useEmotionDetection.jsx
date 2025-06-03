import { useEffect, useRef, useState } from 'react';
import * as faceMesh from '@mediapipe/face_mesh';
import * as cameraUtils from '@mediapipe/camera_utils';

const useEmotionDetection = (videoRef, canvasRef, emotionDisplayRef, startCamera, onEmotionsCollected, setCameraError) => {
  const [emotionQueue, setEmotionQueue] = useState([]);
  const isProcessing = useRef(false);
  const cameraRef = useRef(null);

  useEffect(() => {
    console.log('useEmotionDetection - startCamera:', startCamera, 'videoRef.current:', videoRef.current);
    if (!startCamera || !videoRef.current) {
      console.log('useEmotionDetection - Camera not started: startCamera=', startCamera, 'videoRef.current=', videoRef.current);
      return;
    }

    const faceMeshInstance = new faceMesh.FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMeshInstance.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMeshInstance.onResults((results) => {
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const detectedLandmarks = results.multiFaceLandmarks[0].map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z,
        }));

        // Log landmarks on every frame
        console.log('useEmotionDetection - Detected 468 Landmarks:', detectedLandmarks);
        console.log('useEmotionDetection - Number of landmarks:', detectedLandmarks.length);
        console.log('useEmotionDetection - Sample landmark (first point):', detectedLandmarks[0]);

        // Process landmarks if not already processing
        if (!isProcessing.current) {
          isProcessing.current = true;

          sendLandmarksToServer(detectedLandmarks)
            .then((detectedEmotion) => {
              console.log('useEmotionDetection - Emotion received from server:', detectedEmotion);
              setEmotionQueue((prev) => {
                const newQueue = [...prev, detectedEmotion].slice(-4);
                onEmotionsCollected(newQueue);
                return newQueue;
              });
              isProcessing.current = false;
            })
            .catch((err) => {
              console.error('useEmotionDetection - Error sending landmarks:', err.message);
              // Log error instead of setting cameraError
              isProcessing.current = false;
            });
        }
      } else {
        console.log('useEmotionDetection - No face landmarks detected');
      }
    });

    const camera = new cameraUtils.Camera(videoRef.current, {
      onFrame: async () => {
        await faceMeshInstance.send({ image: videoRef.current });
      },
      width: 640,
      height: 480,
    });
    cameraRef.current = camera;

    camera.start().catch((err) => {
      console.error('useEmotionDetection - Camera Error:', err);
      setCameraError('Failed to access webcam. Please allow camera access.');
    });

    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      faceMeshInstance.close();
    };
  }, [startCamera, videoRef, onEmotionsCollected, setCameraError]);

  const sendLandmarksToServer = async (landmarks) => {
    try {
      landmarks=landmarks.slice(0,468);
      console.log('useEmotionDetection - Sending landmarks to server:', landmarks.slice(0, 10), '...');
      const response = await fetch('http://localhost:5000/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ landmarks }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      return data.emotion;
    } catch (err) {
      console.error('useEmotionDetection - Fetch Error:', err);
      throw err;
    }
  };

  return emotionQueue;
};

export default useEmotionDetection;