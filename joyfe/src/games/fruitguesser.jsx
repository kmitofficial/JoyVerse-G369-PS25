import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from 'react-router-dom';
import useEmotionDetection from '../components/EmotionDetection/useEmotionDetection';
import "../gamestyle/fruitguesser.css";

const wordPairs = {
  Apple: "🍎",
  Banana: "🍌",
  Grapes: "🍇",
  Orange: "🍊",
  Strawberry: "🍓",
  Watermelon: "🍉",
  Mango: "🥭",
  Pineapple: "🍍",
  Peach: "🍑",
  Cherry: "🍒"
};

const words = Object.keys(wordPairs);

// Emotion-to-video mapping
const emotionVideos = {
  happy: '/assets/background-videos/happy-bg.mp4',
  sad: '/assets/background-videos/sad-bg.mp4',
  angry: '/assets/background-videos/angry-bg.mp4',
  surprised: '/assets/background-videos/surprised-bg.mp4',
  neutral: '/assets/background-videos/neutral-bg.mp4',
  fear: '/assets/background-videos/fear-bg.mp4',
  disgust: '/assets/background-videos/disgust-bg.mp4',
};

function FruitGuesser({ username }) {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const canvasRef = useRef(null); // For confetti
  const emotionDisplayRef = useRef(null);
  const backgroundVideoRef = useRef(null); // Ref for background video
  const selectSound = useRef(new Audio('/assets/letter-select.mp3'));
  selectSound.current.volume = 0.2;

  // Initialize state from localStorage or defaults
  const [currentWord, setCurrentWord] = useState(() => {
    return localStorage.getItem('fruitGuesserCurrentWord') || "";
  });
  const [score, setScore] = useState(() => {
    return parseInt(localStorage.getItem('fruitGuesserScore')) || 0;
  });
  const [result, setResult] = useState(() => {
    return localStorage.getItem('fruitGuesserResult') || "";
  });
  const [consecutiveErrors, setConsecutiveErrors] = useState(() => {
    return parseInt(localStorage.getItem('fruitGuesserConsecutiveErrors')) || 0;
  });
  const [attempts, setAttempts] = useState(() => {
    return parseInt(localStorage.getItem('fruitGuesserAttempts')) || 0;
  });
  const [questionNumber, setQuestionNumber] = useState(() => {
    return parseInt(localStorage.getItem('fruitGuesserQuestionNumber')) || 0;
  });
  const [emotionFeedback, setEmotionFeedback] = useState("");
  const [gameStarted, setGameStarted] = useState(() => {
    return localStorage.getItem('fruitGuesserGameStarted') === 'true';
  });
  const [gameOver, setGameOver] = useState(() => {
    return localStorage.getItem('fruitGuesserGameOver') === 'true';
  });
  const [showDemo, setShowDemo] = useState(false);
  const [showPlayAgain, setShowPlayAgain] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [backgroundVideo, setBackgroundVideo] = useState(emotionVideos.neutral);
  const [particles, setParticles] = useState([]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fruitGuesserCurrentWord', currentWord);
    localStorage.setItem('fruitGuesserScore', score);
    localStorage.setItem('fruitGuesserResult', result);
    localStorage.setItem('fruitGuesserConsecutiveErrors', consecutiveErrors);
    localStorage.setItem('fruitGuesserAttempts', attempts);
    localStorage.setItem('fruitGuesserQuestionNumber', questionNumber);
    localStorage.setItem('fruitGuesserGameStarted', gameStarted);
    localStorage.setItem('fruitGuesserGameOver', gameOver);
  }, [currentWord, score, result, consecutiveErrors, attempts, questionNumber, gameStarted, gameOver]);

  const handleEmotionsCollected = useCallback((emotions) => {
    console.log('FruitGuesser - Emotions collected:', emotions);
    const emotionCounts = emotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});
    const mostFrequentEmotion = Object.keys(emotionCounts).reduce((a, b) =>
      emotionCounts[a] > emotionCounts[b] ? a : b
    );
    setBackgroundVideo(emotionVideos[mostFrequentEmotion] || emotionVideos.neutral);
    switch (mostFrequentEmotion) {
      case 'happy':
        setEmotionFeedback("You look happy! Keep guessing!");
        break;
      case 'sad':
        setEmotionFeedback("Don't be sad! You can guess this fruit!");
        break;
      case 'angry':
        setEmotionFeedback("Take a deep breath. You've got this!");
        break;
      default:
        setEmotionFeedback("");
    }
  }, []);

  // Update video source when backgroundVideo changes
  useEffect(() => {
    if (backgroundVideoRef.current) {
      backgroundVideoRef.current.src = backgroundVideo;
      backgroundVideoRef.current.load();
      backgroundVideoRef.current.play().catch((err) => {
        console.error('Error playing background video:', err);
      });
    }
  }, [backgroundVideo]);

  const emotionQueue = useEmotionDetection(
    videoRef,
    faceCanvasRef,
    emotionDisplayRef,
    gameStarted,
    handleEmotionsCollected,
    setCameraError
  );

  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const latestEmotion = emotionQueue.length > 0 ? emotionQueue[emotionQueue.length - 1] : 'neutral';

    const sendGameData = async () => {
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
          gameName: "Fruit Guesser",
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
    };

    sendGameData();
  }, [gameStarted, gameOver, username, score, emotionQueue]);

  const launchConfetti = useCallback(() => {
    const newParticles = [];
    for (let i = 0; i < 200; i++) {
      newParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight - window.innerHeight,
        dx: (Math.random() - 0.5) * 5,
        dy: Math.random() * 3 + 2,
        color: `hsl(${Math.random() * 360}, 100%, 50%)`,
        radius: Math.random() * 5 + 2,
      });
    }
    setParticles(newParticles);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const updateConfetti = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const newParticles = particles.filter(p => p.y < canvas.height);
      for (let p of newParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
      }
      setParticles(newParticles);
      if (newParticles.length > 0) requestAnimationFrame(updateConfetti);
    };
    if (particles.length > 0) updateConfetti();

    return () => window.removeEventListener('resize', handleResize);
  }, [particles]);

  useEffect(() => {
    if (gameStarted && !gameOver && !currentWord) {
      getRandomWord();
    }
  }, [gameStarted, gameOver, currentWord]);

  const getRandomWord = () => {
    const randomIndex = Math.floor(Math.random() * words.length);
    setCurrentWord(words[randomIndex]);
    setResult("");
  };

  const checkGuess = (guess) => {
    selectSound.current.currentTime = 0;
    selectSound.current.volume = 0.2;
    selectSound.current.play();
    setAttempts(attempts + 1);

    if (guess === currentWord) {
      setScore(score + 1);
      setResult("Correct!");
      launchConfetti();
    } else {
      console.log("Wrong!");
      setResult("Wrong!");
      setConsecutiveErrors(consecutiveErrors + 1);
    }

    if (questionNumber < 9) {
      setTimeout(() => {
        setQuestionNumber(questionNumber + 1);
        getRandomWord();
      }, 1000);
    } else {
      setTimeout(() => {
        setGameOver(true);
      }, 1000);
    }
  };

  useEffect(() => {
    if (gameOver) {
      setTimeout(() => {
        navigate('/');
        // Clear localStorage to reset the game
        localStorage.removeItem('fruitGuesserCurrentWord');
        localStorage.removeItem('fruitGuesserScore');
        localStorage.removeItem('fruitGuesserResult');
        localStorage.removeItem('fruitGuesserConsecutiveErrors');
        localStorage.removeItem('fruitGuesserAttempts');
        localStorage.removeItem('fruitGuesserQuestionNumber');
        localStorage.removeItem('fruitGuesserGameStarted');
        localStorage.removeItem('fruitGuesserGameOver');
      }, 2000);
    }
  }, [gameOver, navigate]);

  const startGame = () => {
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setAttempts(0);
    setQuestionNumber(0);
    setConsecutiveErrors(0);
    setShowDemo(false);
    setShowPlayAgain(false);
    setParticles([]);
    // Clear localStorage to start fresh
    localStorage.setItem('fruitGuesserCurrentWord', '');
    localStorage.setItem('fruitGuesserScore', 0);
    localStorage.setItem('fruitGuesserResult', '');
    localStorage.setItem('fruitGuesserConsecutiveErrors', 0);
    localStorage.setItem('fruitGuesserAttempts', 0);
    localStorage.setItem('fruitGuesserQuestionNumber', 0);
    localStorage.setItem('fruitGuesserGameStarted', 'true');
    localStorage.setItem('fruitGuesserGameOver', 'false');
  };

  return (
    <div className="fruit-guesser-container">
      <video
        ref={backgroundVideoRef}
        className="background-video"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src={backgroundVideo} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <div className="facemesh-container" style={{ display: gameStarted ? 'block' : 'none' }}>
        {cameraError && (
          <div className="camera-error">
            {cameraError}
            <button
              onClick={() => {
                setCameraError(null);
                window.location.reload();
              }}
            >
              Retry
            </button>
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

      {!gameStarted ? (
        <div className="start-screen">
          <h1>Fruit Guesser Game</h1>
          <p>Can you guess the fruit from the emoji? Answer 10 questions to test your skills!</p>
          <div className="video-container">
            {showDemo ? (
              <video
                className="demo-video"
                autoPlay
                onEnded={() => {
                  setShowDemo(false);
                  setShowPlayAgain(true);
                }}
              >
                <source src="/assets/fruit-guesser-demo.mp4" type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <>
                <button
                  className="play-demo"
                  onClick={() => setShowDemo(true)}
                  style={{ display: showPlayAgain ? 'none' : 'inline-block' }}
                >
                  Play Demo
                </button>
                <button
                  className="play-again"
                  onClick={() => setShowDemo(true)}
                  style={{ display: showPlayAgain ? 'inline-block' : 'none' }}
                >
                  Play Again
                </button>
              </>
            )}
          </div>
          <button onClick={startGame} className="start-button">
            Let's Play!
          </button>
        </div>
      ) : gameOver ? (
        <div className="game-screen">
          <h1>Game Over!</h1>
          <div className="game-info">
            <p>⭐ Final Score: {score}/10</p>
            <p>Returning to Game Selection...</p>
          </div>
        </div>
      ) : (
        <div className="game-screen">
          <h1>Fruit Guesser Game</h1>
          <div className="game-info">
            <p>⭐ Score: {score}/10</p>
            <p>🎯 Question: {questionNumber + 1}/10</p>
            {emotionFeedback && <p className="emotion-feedback">{emotionFeedback}</p>}
          </div>
          <div className="game-area">
            <div className="emoji-display">
              <h2>{wordPairs[currentWord]}</h2>
              <p>What fruit is this?</p>
            </div>
            <div className="buttons-container">
              {words.map((word) => (
                <button
                  key={word}
                  onClick={() => checkGuess(word)}
                  className="fruit-button"
                >
                  {word}
                </button>
              ))}
            </div>
            {result && (
              <p className={`result-message ${result === "Wrong!" ? "wrong-message" : "correct-message"}`}>
                {result}
              </p>
            )}
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="confetti-canvas"></canvas>
    </div>
  );
}

export default FruitGuesser;