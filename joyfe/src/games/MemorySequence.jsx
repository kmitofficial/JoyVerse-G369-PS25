import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmotionDetection from '../components/EmotionDetection/useEmotionDetection';
import '../gamestyle/MemorySequence.css';
const colors = [
  { name: 'Red', value: '#FF7F7F' },
  { name: 'Blue', value: '#87CEEB' },
  { name: 'Green', value: '#90EE90' },
  { name: 'Yellow', value: '#FFFACD' },
];

const emotionVideos = {
  happy: '/assets/background-videos/happy-bg.mp4',
  sad: '/assets/background-videos/sad-bg.mp4',
  angry: '/assets/background-videos/angry-bg.mp4',
  surprised: '/assets/background-videos/surprised-bg.mp4',
  neutral: '/assets/background-videos/neutral-bg.mp4',
  fear: '/assets/background-videos/fear-bg.mp4',
  disgust: '/assets/background-videos/disgust-bg.mp4',
};

function MemorySequence({ username }) {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState({
    sequence: [],
    playerSequence: [],
    score: 0,
    isPlaying: false,
    message: 'Press Start to Play!',
    attemptsLeft: 3,
    showSequence: false,
  });

  const [totalAttempts, setTotalAttempts] = useState(0);

  const videoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const canvasRef = useRef(null); // For confetti
  const emotionDisplayRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const selectSound = useRef(new Audio('/assets/letter-select.mp3'));
  const correctSound = useRef(new Audio('/assets/correct-word.mp3'));
  selectSound.current.volume = 0.2;
  correctSound.current.volume = 0.5;
  const timeoutRef = useRef(null);

  const [gameStarted, setGameStarted] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [backgroundVideo, setBackgroundVideo] = useState(emotionVideos.neutral);
  const [videoError, setVideoError] = useState(null);
  const [particles, setParticles] = useState([]);

  const handleEmotionsCollected = useCallback((emotions) => {
    console.log('MemorySequence - Emotions collected:', emotions);
    if (emotions.length === 0) {
      console.log('No emotions detected, using neutral video');
      setBackgroundVideo(emotionVideos.neutral);
      return;
    }
    const emotionCounts = emotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});
    const mostFrequentEmotion = Object.keys(emotionCounts).reduce((a, b) =>
      emotionCounts[a] > emotionCounts[b] ? a : b
    );
    console.log('Setting background video for emotion:', mostFrequentEmotion);
    setBackgroundVideo(emotionVideos[mostFrequentEmotion] || emotionVideos.neutral);
  }, []);

  const emotionQueue = useEmotionDetection(
    videoRef,
    faceCanvasRef,
    emotionDisplayRef,
    gameStarted,
    handleEmotionsCollected,
    setCameraError
  );

  useEffect(() => {
    if (gameStarted && backgroundVideoRef.current) {
      console.log('Attempting to play video:', backgroundVideo);
      backgroundVideoRef.current.src = backgroundVideo;
      backgroundVideoRef.current.load();
      backgroundVideoRef.current.play().catch((err) => {
        console.error('Error playing background video:', err);
        setVideoError(`Failed to play video: ${err.message}`);
      });
    }
  }, [backgroundVideo, gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;

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
          gameName: 'MemorySequence',
          score: gameState.score,
          sequence: gameState.sequence.map(color => color.name),
          playerSequence: gameState.playerSequence.map(color => color.name),
          emotion: latestEmotion,
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
  }, [gameState, username, emotionQueue]);

  const launchConfetti = useCallback(() => {
    const newParticles = [];
    for (let i = 0; i < 200; i++) {
      newParticles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight - window.innerHeight,
        dx: (Math.random() - 0.5) * 5,
        dy: Math.random() * 3 + 2,
        color: `hsl(${Math.random() * 360}, 70%, 50%)`,
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
      for (const p of newParticles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
      }
      setParticles(newParticles);
      if (newParticles.length > 0) {
        requestAnimationFrame(updateConfetti);
      }
    };
    if (particles.length > 0) updateConfetti();

    return () => window.removeEventListener('resize', handleResize);
  }, [particles]);

  const startGame = () => {
    setGameStarted(true);
    setShowDemo(false);
    setTotalAttempts(0);
    generateSequence();
  };

  const generateSequence = () => {
    const newSequence = Array.from({ length: 4 }, () =>
      colors[Math.floor(Math.random() * colors.length)]
    );

    setGameState(prev => ({
      ...prev,
      sequence: newSequence,
      playerSequence: [],
      isPlaying: true,
      showSequence: true,
      attemptsLeft: 3,
      message: 'Watch the sequence...'
    }));

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        showSequence: false,
        message: 'Your turn! Repeat the sequence.'
      }));
    }, 3000);
  };

  const handleColorClick = (color) => {
    if (!gameState.isPlaying || gameState.showSequence) return;

    selectSound.current.currentTime = 0;
    selectSound.current.play();

    const newPlayerSequence = [...gameState.playerSequence, color];
    setGameState(prev => ({ ...prev, playerSequence: newPlayerSequence }));

    if (color.value !== gameState.sequence[newPlayerSequence.length - 1]?.value) {
      const newAttemptsLeft = gameState.attemptsLeft - 1;

      if (newAttemptsLeft > 0) {
        setGameState(prev => ({
          ...prev,
          attemptsLeft: newAttemptsLeft,
          playerSequence: [],
          message: `Wrong! ${newAttemptsLeft} attempt(s) left.`,
          isPlaying: true,
        }));
      } else {
        // Increment totalAttempts only when the sequence ends (out of lives)
        setTotalAttempts(prev => prev + 1);

        if (totalAttempts + 1 >= 5) {
          setGameState(prev => ({
            ...prev,
            attemptsLeft: newAttemptsLeft,
            playerSequence: [],
            message: `Game Over! Final Score: ${prev.score}. Returning to Game Selection...`,
            isPlaying: false,
          }));
          setTimeout(() => {
            setGameStarted(false);
            navigate('/');
          }, 2000);
        } else {
          setGameState(prev => ({
            ...prev,
            attemptsLeft: newAttemptsLeft,
            playerSequence: [],
            message: `You failed! Score: ${prev.score}. Returning to Game Selection...`,
            isPlaying: false,
          }));
          setTimeout(() => {
            setGameStarted(false);
            navigate('/');
          }, 2000);
        }
      }
    } else if (newPlayerSequence.length === gameState.sequence.length) {
      const newScore = gameState.score + 1;
      // Increment totalAttempts only when the sequence is completed correctly
      setTotalAttempts(prev => prev + 1);

      if (totalAttempts + 1 >= 5) {
        setGameState(prev => ({
          ...prev,
          score: newScore,
          message: `Game Over! Final Score: ${newScore}. Returning to Game Selection...`,
          attemptsLeft: 3,
          isPlaying: false,
        }));
        correctSound.current.currentTime = 0;
        correctSound.current.play();
        launchConfetti();
        setTimeout(() => {
          setGameStarted(false);
          navigate('/');
        }, 2000);
      } else {
        setGameState(prev => ({
          ...prev,
          score: newScore,
          message: 'Correct! Next round...',
          attemptsLeft: 3,
        }));
        correctSound.current.currentTime = 0;
        correctSound.current.play();
        launchConfetti();
        setTimeout(generateSequence, 1000);
      }
    }
  };
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="memory-sequence-container">
      {gameStarted && (
        <>
          <video
            ref={backgroundVideoRef}
            className="background-video"
            autoPlay
            loop
            muted
            playsInline
            onError={(e) => {
              console.error('Video element error:', e);
              setVideoError('Video failed to load');
            }}
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
        </>
      )}
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
        <canvas ref={faceCanvasRef} width="320" height="240" style={{ display: 'none' }} />
        <div ref={emotionDisplayRef} className="emotion-display"></div>
      </div>

      {!gameStarted ? (
        <div className="start-screen">
          <h1>Memory Sequence Game</h1>
          <p>Memorize and repeat the color sequence!</p>
          <div className="video-container">
            {showDemo ? (
              <video
                className="demo-video"
                autoPlay
                onEnded={() => {
                  setShowDemo(false);
                }}
              >
                <source src="/assets/memory-sequence-demo.mp4" type="video/mp4" />
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
          <h1>Memory Sequence Game</h1>
          <div className="game-info">
            <p className="message">{gameState.message}</p>
            <div className="stats">
              <span>Score: {gameState.score}</span>
              <span>
                Lives: {Array.from({ length: gameState.attemptsLeft }, (_, i) => (
                  <span key={i}>❤️</span>
                ))}
              </span>
            </div>
          </div>

          {gameState.showSequence && (
            <div className="sequence-display">
              <p>Remember:</p>
              <p>{gameState.sequence.map(color => color.name).join(' → ')}</p>
            </div>
          )}

          <div className="color-buttons">
            {colors.map(color => (
              <button
                key={color.value}
                style={{
                  backgroundColor: color.value,
                  border: '2px solid #1f2937',
                }}
                onClick={() => handleColorClick(color)}
                disabled={gameState.showSequence || !gameState.isPlaying}
              >
                {color.name}
              </button>
            ))}
          </div>

          
        </div>
      )}

      <canvas ref={canvasRef} className="confetti-canvas"></canvas>
    </div>
  );
}

export default MemorySequence;