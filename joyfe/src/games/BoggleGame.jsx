import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmotionDetection from '../components/EmotionDetection/useEmotionDetection';
import '../gamestyle/BoggleGame.css';

const levels = [
  ["TREE", "SAND", "COLD", "HILL"],
  ["MOON", "FISH", "BLUE", "FIRE"],
  ["BIRD", "LOVE", "FAST", "WIND"],
];
const gridSize = 5;

const emotionVideos = {
  happy: '/assets/background-videos/happy-bg.mp4',
  sad: '/assets/background-videos/sad-bg.mp4',
  angry: '/assets/background-videos/angry-bg.mp4',
  surprised: '/assets/background-videos/surprised-bg.mp4',
  neutral: '/assets/background-videos/neutral-bg.mp4',
  fear: '/assets/background-videos/fear-bg.mp4',
  disgust: '/assets/background-videos/disgust-bg.mp4',
};

function randomDirection() {
  const directions = [
    { x: 1, y: 0 }, // Right
    { x: 0, y: 1 }, // Down
    { x: 1, y: 1 }, // Diagonal right-down
  ];
  return directions[Math.floor(Math.random() * directions.length)];
}

function canPlaceWord(x, y, dx, dy, word, grid) {
  for (let i = 0; i < word.length; i++) {
    const nx = x + dx * i;
    const ny = y + dy * i;
    if (nx < 0 || ny < 0 || nx >= gridSize || ny >= gridSize || (grid[ny][nx] && grid[ny][nx] !== word[i])) {
      return false;
    }
  }
  return true;
}

function placeWord(word, grid) {
  let placed = false;
  let retries = 0;
  const maxRetries = 100;
  while (!placed && retries < maxRetries) {
    const dir = randomDirection();
    const maxX = dir.x > 0 ? gridSize - (word.length - 1) : gridSize - 1;
    const maxY = dir.y > 0 ? gridSize - (word.length - 1) : gridSize - 1;
    const x = Math.floor(Math.random() * (maxX + 1));
    const y = Math.floor(Math.random() * (maxY + 1));
    if (canPlaceWord(x, y, dir.x, dir.y, word, grid)) {
      for (let i = 0; i < word.length; i++) {
        grid[y + dir.y * i][x + dir.x * i] = word[i];
      }
      placed = true;
    }
    retries++;
  }
  return placed;
}

function fillGrid(levelWords) {
  let grid = Array.from({ length: gridSize }, () => Array(gridSize).fill(""));
  let allPlaced = true;
  for (let word of levelWords) {
    if (!placeWord(word, grid)) {
      allPlaced = false;
      break;
    }
  }
  if (!allPlaced) return fillGrid(levelWords);
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      if (!grid[y][x]) {
        grid[y][x] = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      }
    }
  }
  return grid;
}

function isAdjacent(cell1, cell2) {
  const dx = Math.abs(cell1.x - cell2.x);
  const dy = Math.abs(cell1.y - cell2.y);
  return dx <= 1 && dy <= 1 && !(dx === 0 && dy === 0);
}

const BoggleGame = ({ username, age, gender }) => {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const faceCanvasRef = useRef(null);
  const canvasRef = useRef(null);
  const backgroundVideoRef = useRef(null);
  const emotionDisplayRef = useRef(null);
  const boggleRef = useRef(null);
  const timeoutRef = useRef(null); // For auto-progression timeout
  const [backgroundVideo, setBackgroundVideo] = useState(emotionVideos.neutral);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelWords, setLevelWords] = useState(levels[0]);
  const [grid, setGrid] = useState([]);
  const [selectedPath, setSelectedPath] = useState([]);
  const [foundWords, setFoundWords] = useState([]);
  const [attempts, setAttempts] = useState(30);
  const [message, setMessage] = useState('');
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [showNextLevel, setShowNextLevel] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const [showPlayAgain, setShowPlayAgain] = useState(false);
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now());
  const [particles, setParticles] = useState([]);
  const [correctCells, setCorrectCells] = useState([]);
  const [cameraError, setCameraError] = useState(null);
  const [isDragging, setIsDragging] = useState(false); // Ensure isDragging is defined
  const selectSound = useRef(new Audio('/assets/letter-select.mp3'));
  const correctWordSound = useRef(new Audio('/assets/correct-word.mp3'));
  selectSound.current.volume = 0.2;
  correctWordSound.current.volume = 0.5;

  const handleEmotionsCollected = useCallback((emotions) => {
    console.log('BoggleGame - Emotions collected:', emotions);
    const emotionCounts = emotions.reduce((acc, emotion) => {
      acc[emotion] = (acc[emotion] || 0) + 1;
      return acc;
    }, {});
    const mostFrequentEmotion = Object.keys(emotionCounts).reduce((a, b) =>
      emotionCounts[a] > emotionCounts[b] ? a : b
    );
    setBackgroundVideo(emotionVideos[mostFrequentEmotion] || emotionVideos.neutral);
  }, []);

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
    !showStartScreen,
    handleEmotionsCollected,
    setCameraError
  );

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

  const startLevel = useCallback(() => {
    const newLevelWords = levels[currentLevel];
    setLevelWords(newLevelWords);
    setGrid(fillGrid(newLevelWords));
    setFoundWords([]);
    setAttempts(30);
    setMessage('');
    setShowNextLevel(false);
    setLastInteractionTime(Date.now());
  }, [currentLevel]);

  const nextLevel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current); // Clear any pending auto-progression
    }
    setCurrentLevel(l => l + 1);
    setShowNextLevel(false);
    setParticles([]);
    startLevel();
  }, [startLevel]);

  const checkWord = useCallback(() => {
    console.log('checkWord - Called with attempts:', attempts, 'selectedPath:', selectedPath);
    if (attempts <= 0) {
      setMessage('You failed! No attempts left. Returning to Game Selection...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
      return;
    }
    setAttempts(a => a - 1);
    const word = selectedPath.map(c => grid[c.y][c.x]).join('');
    if (levelWords.includes(word) && !foundWords.includes(word)) {
      setCorrectCells(selectedPath);
      const updatedFoundWords = [...foundWords, word];
      setFoundWords(updatedFoundWords);
      correctWordSound.current.play();
      setTimeout(() => setCorrectCells([]), 500);
      if (updatedFoundWords.length === levelWords.length) {
        setMessage(`🎉 Level ${currentLevel + 1} Complete!`);
        launchConfetti();
        if (currentLevel === levels.length - 1) {
          setTimeout(() => {
            navigate('/');
          }, 2000);
        } else {
          setShowNextLevel(true);
          // Auto-progress to next level after 3 seconds
          timeoutRef.current = setTimeout(() => {
            nextLevel();
          }, 3000);
        }
      }
    }
    resetSelection();
    setLastInteractionTime(Date.now());
    if (attempts - 1 <= 0) {
      setMessage('You failed! No attempts left. Returning to Game Selection...');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    }
  }, [attempts, selectedPath, grid, levelWords, foundWords, currentLevel, launchConfetti, navigate, nextLevel]);

  useEffect(() => {
    if (showStartScreen) return;

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
          age,
          gender,
          wordsFound: foundWords.length,
          emotion: latestEmotion,
          gameName: "Boggle game",
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
  }, [showStartScreen, username, foundWords, emotionQueue, age, gender]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
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
    const interval = setInterval(() => {
      const currentTime = Date.now();
      const timeSinceInteraction = currentTime - lastInteractionTime;
      if (timeSinceInteraction > 6000 && selectedPath.length === 0 && foundWords.length < levelWords.length) {
        provideWordHint();
      } else if (timeSinceInteraction > 5000 && selectedPath.length === 0 && foundWords.length < levelWords.length) {
        provideFirstLetterHint();
      } else if (timeSinceInteraction > 3000 && selectedPath.length > 0) {
        provideNextLetterHint();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedPath, foundWords, lastInteractionTime, levelWords]);

  const resetSelection = () => {
    setSelectedPath([]);
    selectSound.current.volume = 0.2;
    setIsDragging(false);
  };

  const playSelectionSound = () => {
    selectSound.current.currentTime = 0;
    selectSound.current.volume = Math.min(0.2 + (selectedPath.length - 1) * 0.1, 1.0);
    selectSound.current.play();
  };

  const provideWordHint = useCallback(() => {
    if (foundWords.length >= levelWords.length) return;
    const remainingWords = levelWords.filter(word => !foundWords.includes(word));
    if (!remainingWords.length) {
      console.log('No remaining words for hint');
      return;
    }
    const word = remainingWords[0];
    if (!word || typeof word !== 'string' || word.length === 0) {
      console.error('Invalid word in provideWordHint:', word);
      return;
    }
    const directions = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x] !== word[0]) continue;
        for (const dir of directions) {
          if (canPlaceWord(x, y, dir.x, dir.y, word, grid)) {
            const path = [];
            for (let i = 0; i < word.length; i++) {
              path.push({ x: x + dir.x * i, y: y + dir.y * i });
            }
            setSelectedPath(path);
            return;
          }
        }
      }
    }
  }, [grid, levelWords, foundWords]);

  const provideFirstLetterHint = useCallback(() => {
    if (foundWords.length >= levelWords.length) return;
    const remainingWords = levelWords.filter(word => !foundWords.includes(word));
    if (!remainingWords.length) {
      console.log('No remaining words for hint');
      return;
    }
    const word = remainingWords[0];
    if (!word || typeof word !== 'string' || word.length === 0) {
      console.error('Invalid word in provideFirstLetterHint:', word);
      return;
    }
    const directions = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x] !== word[0]) continue;
        for (const dir of directions) {
          if (canPlaceWord(x, y, dir.x, dir.y, word, grid)) {
            setSelectedPath([{ x, y }]);
            return;
          }
        }
      }
    }
  }, [grid, levelWords, foundWords]);

  const provideNextLetterHint = useCallback(() => {
    if (!selectedPath.length || foundWords.length >= levelWords.length) return;
    const currentWord = selectedPath.map(c => grid[c.y][c.x]).join('');
    const possibleWords = levelWords.filter(
      word => !foundWords.includes(word) && word.startsWith(currentWord) && currentWord.length < word.length
    );
    if (!possibleWords.length) {
      console.log('No possible words for next letter hint');
      return;
    }
    const word = possibleWords[0];
    if (!word || typeof word !== 'string' || word.length === 0) {
      console.error('Invalid word in provideNextLetterHint:', word);
      return;
    }
    const remainingWord = word.slice(currentWord.length);
    const lastCell = selectedPath[selectedPath.length - 1];
    const directions = [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ];

    for (const dir of directions) {
      const nx = lastCell.x + dir.x;
      const ny = lastCell.y + dir.y;
      if (nx >= 0 && ny >= 0 && nx < gridSize && ny < gridSize && grid[ny][nx] === remainingWord[0]) {
        if (canPlaceWord(nx, ny, dir.x, dir.y, remainingWord, grid)) {
          setSelectedPath([...selectedPath, { x: nx, y: ny }]);
          return;
        }
      }
    }
  }, [selectedPath, grid, levelWords, foundWords]);

  const handleTouchStart = useCallback((e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const cell = getCellFromTouch(touch, boggleRef.current);
    if (cell) {
      resetSelection();
      setLastInteractionTime(Date.now());
      setSelectedPath([cell]);
      playSelectionSound();
      setIsDragging(true);
    }
  }, []);

  const handleTouchMove = useCallback((e) => {
    e.preventDefault();
    if (!isDragging) return;
    const touch = e.touches[0];
    const cell = getCellFromTouch(touch, boggleRef.current);
    if (cell) {
      setLastInteractionTime(Date.now());
      const last = selectedPath[selectedPath.length - 1];
      const cellIndex = selectedPath.findIndex(c => c.x === cell.x && c.y === cell.y);

      if (cellIndex === -1 && last && isAdjacent(cell, last)) {
        setSelectedPath([...selectedPath, cell]);
        playSelectionSound();
      } else if (cellIndex >= 0 && cellIndex < selectedPath.length - 1) {
        setSelectedPath(selectedPath.slice(0, cellIndex + 1));
        playSelectionSound();
      }
    }
  }, [isDragging, selectedPath]);

  const handleTouchEnd = useCallback((e) => {
    e.preventDefault();
    if (isDragging) {
      console.log('handleTouchEnd - Calling checkWord');
      checkWord();
      setLastInteractionTime(Date.now());
      setIsDragging(false);
    }
  }, [isDragging, checkWord]);

  const handleMouseDown = useCallback((x, y) => {
    resetSelection();
    setLastInteractionTime(Date.now());
    setSelectedPath([{ x, y }]);
    playSelectionSound();
    setIsDragging(true);
  }, []);

  const handleMouseOver = useCallback((x, y) => {
    if (isDragging) {
      setLastInteractionTime(Date.now());
      const last = selectedPath[selectedPath.length - 1];
      const cell = { x, y };
      const cellIndex = selectedPath.findIndex(c => c.x === x && c.y === y);

      if (cellIndex === -1 && last && isAdjacent(cell, last)) {
        setSelectedPath([...selectedPath, cell]);
        playSelectionSound();
      } else if (cellIndex >= 0 && cellIndex < selectedPath.length - 1) {
        setSelectedPath(selectedPath.slice(0, cellIndex + 1));
        playSelectionSound();
      }
    }
  }, [isDragging, selectedPath]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      console.log('handleMouseUp - Calling checkWord');
      checkWord();
      setLastInteractionTime(Date.now());
      setIsDragging(false);
    }
  }, [isDragging, checkWord]);

  const getCellFromTouch = (touch, boggleRef) => {
    const rect = boggleRef.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    const cellWidth = 70 + 15;
    const cellHeight = 70 + 15;
    const x = Math.floor(touchX / cellWidth);
    const y = Math.floor(touchY / cellHeight);
    if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
      return { x, y };
    }
    return null;
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current); // Cleanup timeout on unmount
      }
    };
  }, []);

  return (
    <div className="boggle-game min-h-screen">
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
      <div
        className="facemesh-container"
        style={{ display: showStartScreen ? 'none' : 'block' }}
      >
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
      {showStartScreen ? (
        <div className="start-screen">
          <h1>Welcome to Boggle Game, {username}!</h1>
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
                <source src="/assets/boggle-demo.mp4" type="video/mp4" />
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
          <button
            className="start-button"
            onClick={() => {
              setShowStartScreen(false);
              startLevel();
            }}
          >
            Start Game
          </button>
          <canvas ref={canvasRef} className="confetti-canvas"></canvas>
        </div>
      ) : (
        <div className="game-screen">
          <h1>Boggle Game</h1>
          <div className="word-list">
            {levelWords.map((word, index) => (
              <span
                key={index}
                className={foundWords.includes(word) ? 'found' : ''}
              >
                {word}
                {index < levelWords.length - 1 ? ' | ' : ''}
              </span>
            ))}
          </div>
          <div className="level">Level: {currentLevel + 1}</div>
          <div className="attempts">Attempts left: {attempts}</div>
          <div
            ref={boggleRef}
            className="boggle-grid"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {grid.map((row, y) =>
              row.map((letter, x) => (
                <div
                  key={`${x}-${y}`}
                  className={`cell ${
                    correctCells.some(c => c.x === x && c.y === y)
                      ? 'correct'
                      : selectedPath.some(c => c.x === x && c.y === y)
                      ? isDragging
                        ? 'dragging'
                        : 'selected'
                      : ''
                  }`}
                  onMouseDown={() => handleMouseDown(x, y)}
                  onMouseOver={() => handleMouseOver(x, y)}
                  onMouseUp={handleMouseUp}
                >
                  {letter}
                </div>
              ))
            )}
          </div>
          <div className="message">{message}</div>
          {showNextLevel && (
            <button
              className="next-level-button"
              onClick={nextLevel}
            >
              Next Level
            </button>
          )}
          <canvas ref={canvasRef} className="confetti-canvas"></canvas>
        </div>
      )}
    </div>
  );
};

export default BoggleGame;