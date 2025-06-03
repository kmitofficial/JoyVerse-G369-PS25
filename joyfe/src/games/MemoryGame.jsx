import React, { useState, useEffect, useRef, useCallback } from "react"; // Added React import
import { useNavigate } from "react-router-dom";
import Confetti from "react-confetti";
import useEmotionDetection from '../components/EmotionDetection/useEmotionDetection';
import "../gamestyle/MemoryGame.css";

// Define colors for the grid
const colors = [
  "#FF5733",
  "#33FF57",
  "#3357FF",
  "#FF33A6",
  "#F3FF33",
  "#33FFF6",
  "#A6FF33",
  "#33A6FF",
];

// Define emotion videos
const emotionVideos = {
  happy: '/assets/background-videos/happy-bg.mp4',
  sad: '/assets/background-videos/sad-bg.mp4',
  angry: '/assets/background-videos/angry-bg.mp4',
  surprised: '/assets/background-videos/surprised-bg.mp4',
  neutral: '/assets/background-videos/neutral-bg.mp4',
  fear: '/assets/background-videos/fear-bg.mp4',
  disgust: '/assets/background-videos/disgust-bg.mp4',
};

// Utility function to debounce a callback
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Memoized Box component to prevent unnecessary re-renders
const Box = React.memo(({ index, color, revealed, isSelected, isMatched, onClick }) => {
  return (
    <div
      key={index}
      className={`box ${revealed || isSelected || isMatched ? "revealed" : ""}`}
      style={{
        backgroundColor: revealed || isSelected || isMatched ? color : '#d1d5db',
      }}
      onClick={() => onClick(index)}
    ></div>
  );
});

function MemoryGame({ onFinish, username, sessionId }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const emotionDisplayRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const selectSound = useRef(new Audio('/assets/letter-select.mp3'));
  const correctSound = useRef(new Audio('/assets/correct-word.mp3'));
  selectSound.current.volume = 0.2;
  correctSound.current.volume = 0.5;

  const [grid, setGrid] = useState(Array(16).fill(null));
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [attemptsLeft, setAttemptsLeft] = useState(15);
  const [matchedPairs, setMatchedPairs] = useState([]);
  const [revealed, setRevealed] = useState(true);
  const [gameWon, setGameWon] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [alert, setAlert] = useState({ show: false, variant: "", message: "" });
  const [gameStarted, setGameStarted] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [backgroundVideo, setBackgroundVideo] = useState(emotionVideos.neutral);
  const [videoError, setVideoError] = useState(null);
  const [score, setScore] = useState(0);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [lastEmotion, setLastEmotion] = useState('neutral'); // Track last emotion to avoid unnecessary video updates

  // Debounced emotion handler to reduce frequency of updates
  const handleEmotionsCollected = useCallback(
    debounce((emotions) => {
      if (emotions.length === 0) {
        console.log('No emotions detected, setting neutral video');
        if (lastEmotion !== 'neutral') {
          setBackgroundVideo(emotionVideos.neutral);
          setLastEmotion('neutral');
        }
        return;
      }
      const emotionCounts = emotions.reduce((acc, emotion) => {
        acc[emotion] = (acc[emotion] || 0) + 1;
        return acc;
      }, {});
      const mostFrequentEmotion = Object.keys(emotionCounts).reduce((a, b) =>
        emotionCounts[a] > emotionCounts[b] ? a : b
      );
      console.log('Most frequent emotion:', mostFrequentEmotion);
      if (mostFrequentEmotion !== lastEmotion) {
        setBackgroundVideo(emotionVideos[mostFrequentEmotion] || emotionVideos.neutral);
        setLastEmotion(mostFrequentEmotion);
      }
    }, 1000), // Debounce for 1 second
    [lastEmotion]
  );

  const emotionQueue = useEmotionDetection(
    videoRef,
    faceCanvasRef,
    emotionDisplayRef,
    gameStarted,
    handleEmotionsCollected,
    setCameraError
  );

  // Debounced server request to reduce network load
  const sendGameData = useCallback(
    debounce(async (latestEmotion) => {
      try {
        const adminResponse = await fetch(`http://localhost:3002/get_admin_by_child/${username}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!adminResponse.ok) {
          console.error('Failed to fetch admin data:', adminResponse.statusText);
          return;
        }

        const adminData = await adminResponse.json();
        const adminId = adminData.adminId;

        const gameData = {
          username,
          score,
          emotion: latestEmotion,
          gameName: "Memory Game",
          adminId,
          timestamp: new Date().toISOString(),
        };

        const response = await fetch('http://localhost:3002/save_game_data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gameData),
        });

        if (!response.ok) {
          console.error('Failed to send game data:', response.statusText);
        } else {
          console.log('Game data sent successfully:', gameData);
        }
      } catch (err) {
        console.error('Error sending game data:', err);
      }
    }, 2000), // Debounce for 2 seconds
    [username, score]
  );

  useEffect(() => {
    if (!gameStarted) return;

    const latestEmotion = emotionQueue.length > 0 ? emotionQueue[emotionQueue.length - 1] : 'neutral';
    sendGameData(latestEmotion);
  }, [gameStarted, emotionQueue, sendGameData]);

  useEffect(() => {
    if (backgroundVideoRef.current) {
      console.log('Setting background video:', backgroundVideo);
      backgroundVideoRef.current.src = backgroundVideo;
      backgroundVideoRef.current.load();
      backgroundVideoRef.current.play().catch((err) => {
        console.error('Error playing background video:', err);
        setVideoError('Failed to play background video. Check asset paths or browser permissions.');
      });
    }
  }, [backgroundVideo]);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (gameStarted) {
      initializeGrid();
      const revealTimeout = setTimeout(() => {
        setRevealed(false);
      }, 5000);
      return () => clearTimeout(revealTimeout);
    }
  }, [gameStarted]);

  function initializeGrid() {
    let tempGrid = Array(16).fill(null);
    let pairs = [...colors, ...colors];
    pairs = pairs.sort(() => Math.random() - 0.5);

    pairs.forEach((color, index) => {
      tempGrid[index] = color;
    });

    setGrid(tempGrid);
  }

  function handleBoxClick(index) {
    if (
      gameStarted &&
      !gameWon &&
      selectedBoxes.length < 2 &&
      !selectedBoxes.includes(index) &&
      !matchedPairs.includes(grid[index])
    ) {
      selectSound.current.currentTime = 0;
      selectSound.current.play();
      const newSelected = [...selectedBoxes, index];
      setSelectedBoxes(newSelected);

      if (newSelected.length === 2) {
        setTimeout(() => checkMatch(newSelected), 300);
      }
    }
  }

  function checkMatch(newSelected) {
    const [first, second] = newSelected;

    if (grid[first] === grid[second]) {
      correctSound.current.currentTime = 0;
      correctSound.current.play();
      setMatchedPairs(prev => {
        const newMatchedPairs = [...prev, grid[first]];
        setScore(prevScore => prevScore + 1);
        setAttemptsLeft(prev => {
          const newAttempts = prev - 1;
          if (newMatchedPairs.length === 8) {
            handleGameEnd(true, newAttempts);
          } else if (newAttempts === 0) {
            handleGameEnd(false, newAttempts);
          }
          return newAttempts;
        });
        return newMatchedPairs;
      });
      setSelectedBoxes([]);
    } else {
      setAttemptsLeft(prev => {
        const newAttempts = prev - 1;
        if (matchedPairs.length === 8) {
          handleGameEnd(true, newAttempts);
        } else if (newAttempts === 0) {
          handleGameEnd(false, newAttempts);
        }
        return newAttempts;
      });
      setTimeout(() => setSelectedBoxes([]), 1000);
    }
  }

  function handleGameEnd(success, movesRemaining) {
    setGameWon(true);
    setShowConfetti(true);

    setAlert({
      show: true,
      variant: success ? "success" : "danger",
      message: success
        ? "Congratulations! You've matched all pairs! Returning to Game Selection..."
        : "Game Over! Returning to Game Selection...",
    });

    if (onFinish) onFinish(score);

    setTimeout(() => {
      setShowConfetti(false);
      navigate("/");
    }, 5000);
  }

  const startGame = () => {
    setGameStarted(true);
    setShowDemo(false);
  };

  return (
    <div className="memory-game-container">
      <video
        ref={backgroundVideoRef}
        className="background-video"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
      >
        <source src={backgroundVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      {videoError && (
        <div className="video-error">
          {videoError}
          <button onClick={() => setVideoError(null)}>Dismiss</button>
        </div>
      )}
      <div className="facemesh-container" style={{ display: gameStarted ? 'block' : 'none' }}>
        {cameraError && (
          <div className="camera-error">
            {cameraError}
            <button onClick={() => {
              setCameraError(null);
              window.location.reload();
            }}>Retry</button>
          </div>
        )}
        <video
          ref={videoRef}
          style={{ display: 'none' }}
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={faceCanvasRef}
          width="320"
          height="240"
          style={{ display: 'none' }}
        />
        <div ref={emotionDisplayRef} className="emotion-display"></div>
      </div>

      <div className="fruit-decoration fruit-1"></div>
      <div className="fruit-decoration fruit-2"></div>

      {showConfetti && (
        <Confetti
          width={windowSize.width}
          height={windowSize.height}
          numberOfPieces={100} // Reduced from default (200) to improve performance
          recycle={false} // Stop confetti after initial burst
        />
      )}

      {!gameStarted ? (
        <div className="start-screen">
          <h1>Memory Game</h1>
          <p>Test your memory by matching color pairs!</p>
          <div className="video-container">
            {showDemo ? (
              <video
                className="demo-video"
                autoPlay
                onEnded={() => {
                  setShowDemo(false);
                }}
              >
                <source src="/assets/memory-game-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <button
                className="play-demo"
                onClick={() => setShowDemo(true)}
              >
                Watch Demo
              </button>
            )}
          </div>
          <button onClick={startGame} className="start-button">
            Start Game
          </button>
        </div>
      ) : (
        <div className="game-content">
          <h1>Memory Game</h1>
          <div className="game-info">
            <h2>Score: {score}</h2>
            <h2>Attempts Left: {attemptsLeft}</h2>
          </div>

          {alert.show && (
            <div className={`alert-message ${alert.variant}`}>
              {alert.message}
            </div>
          )}

          <div className="grid-container">
            {grid.map((color, index) => (
              <Box
                key={index}
                index={index}
                color={color}
                revealed={revealed}
                isSelected={selectedBoxes.includes(index)}
                isMatched={matchedPairs.includes(color)}
                onClick={handleBoxClick}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default MemoryGame;