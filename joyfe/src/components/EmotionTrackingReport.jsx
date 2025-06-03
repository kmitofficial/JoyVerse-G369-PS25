import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import '../styles/emotiontracking.css';

const EmotionTrackingReport = ({ gameData }) => {
  // Refs for chart canvases
  const emotionPieChartRef = useRef(null);
  const emotionBarChartRef = useRef(null);
  const emotionTimeChartRef = useRef(null);
  
  // Chart instances
  const chartInstancesRef = useRef({
    pieChart: null,
    barChart: null,
    timeChart: null
  });

  // Define emotion colors
  const emotionColors = {
    happy: '#10b981',
    sad: '#6366f1',
    disgust: '#84cc16',
    neutral: '#94a3b8',
    fear: '#8b5cf6',
    angry: '#ef4444',
    surprised: '#f59e0b'
  };

  // Initialize and update charts when component mounts
  useEffect(() => {
    // Debug log to inspect gameData
    console.log('gameData received:', gameData);

    const cleanupCharts = () => {
      Object.values(chartInstancesRef.current).forEach(chart => {
        if (chart) {
          chart.destroy();
        }
      });
    };

    if (emotionPieChartRef.current && emotionBarChartRef.current && emotionTimeChartRef.current) {
      cleanupCharts();
      
      const emotionData = gameData.emotionCounts || {
        happy: 42,
        sad: 15,
        disgust: 8,
        neutral: 20,
        fear: 5,
        angry: 12,
        surprised: 18
      };
      
      const totalEmotions = Object.values(emotionData).reduce((sum, count) => sum + count, 0);
      
      const labels = Object.keys(emotionData);
      const counts = Object.values(emotionData);
      const percentages = counts.map(count => (count / totalEmotions * 100).toFixed(1));
      const colors = labels.map(emotion => emotionColors[emotion] || '#94a3b8');
      
      chartInstancesRef.current.pieChart = new Chart(emotionPieChartRef.current, {
        type: 'doughnut',
        data: {
          labels: labels,
          datasets: [{
            data: percentages,
            backgroundColor: colors,
            borderWidth: 0,
            hoverOffset: 5
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: {
                font: {
                  family: "'Poppins', sans-serif",
                  size: 12
                },
                padding: 20
              }
            },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return context.label + ': ' + context.parsed + '%';
                }
              }
            }
          },
          cutout: '70%'
        }
      });
      
      chartInstancesRef.current.barChart = new Chart(emotionBarChartRef.current, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [{
            label: 'Emotion Counts',
            data: counts,
            backgroundColor: colors,
            borderColor: colors.map(color => color.replace('0.1', '1')),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Count'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Emotions'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Emotion Counts for Session',
              font: {
                size: 16
              }
            }
          }
        }
      });

      const timestampData = gameData.timestamps || [
        { time: '2025-05-21T10:00:00', emotion: 'happy' },
        { time: '2025-05-21T10:01:00', emotion: 'neutral' },
        { time: '2025-05-21T10:02:00', emotion: 'happy' },
        { time: '2025-05-21T10:03:00', emotion: 'sad' },
        { time: '2025-05-21T10:04:00', emotion: 'surprised' },
        { time: '2025-05-21T10:05:00', emotion: 'happy' },
        { time: '2025-05-21T10:06:00', emotion: 'angry' },
        { time: '2025-05-21T10:07:00', emotion: 'neutral' },
        { time: '2025-05-21T10:08:00', emotion: 'fear' },
        { time: '2025-05-21T10:09:00', emotion: 'happy' }
      ];

      const emotions = Object.keys(emotionColors);
      const timestamps = timestampData.map(item => item.time).sort();
      const emotionIndices = timestampData.map(item => {
        const index = emotions.indexOf(item.emotion);
        return index !== -1 ? index : 0;
      });

      // Single dataset for the main line
      const dataset = {
        label: 'Emotion Over Time',
        data: emotionIndices,
        borderColor: '#6366f1',
        backgroundColor: '#6366f1',
        fill: false,
        tension: 0,
        pointRadius: 0,
        borderWidth: 2
      };

      chartInstancesRef.current.timeChart = new Chart(emotionTimeChartRef.current, {
        type: 'line',
        data: {
          labels: timestamps.map(time => new Date(time).toLocaleTimeString()),
          datasets: [dataset]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 0,
              max: emotions.length - 1,
              ticks: {
                stepSize: 1,
                callback: function(value, index, values) {
                  // Ensure the value is an integer and within bounds
                  if (Number.isInteger(value) && value >= 0 && value < emotions.length) {
                    return emotions[value];
                  }
                  return '';
                },
                font: {
                  size: 12,
                  family: "'Poppins', sans-serif"
                },
                color: '#4b5563'
              },
              title: {
                display: true,
                text: 'Emotion',
                font: {
                  size: 14,
                  family: "'Poppins', sans-serif"
                },
                color: '#1f2937'
              },
              grid: {
                borderDash: [5, 5],
                drawBorder: false,
                color: function(context) {
                  // Check if this is a grid line associated with a tick
                  if (context.tick && Number.isInteger(context.tick.value)) {
                    const value = context.tick.value;
                    if (value >= 0 && value < emotions.length) {
                      const emotion = emotions[value];
                      return emotionColors[emotion] || '#94a3b8';
                    }
                  }
                  return 'transparent'; // No color for non-tick grid lines
                }
              }
            },
            x: {
              title: {
                display: true,
                text: 'Timespan',
                font: {
                  size: 14,
                  family: "'Poppins', sans-serif"
                },
                color: '#1f2937'
              },
              grid: {
                display: false
              },
              ticks: {
                font: {
                  size: 12,
                  family: "'Poppins', sans-serif"
                },
                color: '#4b5563'
              }
            }
          },
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Emotions Over Time',
              font: {
                size: 16,
                family: "'Poppins', sans-serif"
              },
              color: '#1f2937'
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: function(context) {
                  const emotion = emotions[context.parsed.y];
                  return `Emotion: ${emotion}`;
                }
              }
            }
          }
        }
      });
    }

    return () => {
      cleanupCharts();
    };
  }, [gameData]);

  // Generate emotion cards from data
  const generateEmotionCards = () => {
    const emotionData = gameData.emotionCounts || {
      happy: 42,
      sad: 15,
      disgust: 8,
      neutral: 20,
      fear: 5,
      angry: 12,
      surprised: 18
    };
    
    const totalEmotions = Object.values(emotionData).reduce((sum, count) => sum + count, 0);
    
    const cards = Object.entries(emotionData).map(([emotion, count]) => {
      const percentage = (count / totalEmotions * 100).toFixed(1);
      
      let description = 'Occasional';
      if (percentage > 30) description = 'Dominant emotion';
      else if (percentage > 20) description = 'Secondary emotion';
      else if (percentage > 10) description = 'Frequent';
      
      return {
        name: emotion.charAt(0).toUpperCase() + emotion.slice(1),
        description,
        count,
        percentage: Number(percentage),
        emotionClass: emotion.toLowerCase(),
        percentageClass: `width-${Math.round(percentage)}`
      };
    });
    
    return cards.sort((a, b) => b.percentage - a.percentage);
  };

  const emotionCards = generateEmotionCards();

  // Determine icon class based on score and emotion
  const getScoreIconClass = (score) => {
    const maxScore = 10; // Assuming max score is 10 based on FruitGuesser
    return score < maxScore / 2 ? 'icon-amber' : 'icon-green';
  };

  const getEmotionIconClass = (emotion) => {
    return ['happy', 'surprised'].includes(emotion.toLowerCase()) ? 'icon-green' : 'icon-amber';
  };

  return (
    <div className="emotion-tracking-container">
      {/* Student Info & Summary */}
      <div className="card-container">
        <div className="flex-col flex-row-md flex-align-start flex-align-center-md flex-justify-between">
          <div className="flex-row flex-align-center space-x-4 mb-4 mb-0-md">
            <div className="face-mesh-container">
              <div className="face-mesh pulse">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="80" height="80">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#6366f1" strokeWidth="1.5" />
                  <circle cx="35" cy="40" r="5" fill="#6366f1" />
                  <circle cx="65" cy="40" r="5" fill="#6366f1" />
                  <path d="M 30 65 Q 50 80 70 65" fill="none" stroke="#6366f1" strokeWidth="2" />
                  <circle cx="25" cy="30" r="1" fill="#6366f1" />
                  <circle cx="75" cy="30" r="1" fill="#6366f1" />
                  <circle cx="50" cy="30" r="1" fill="#6366f1" />
                  <circle cx="30" cy="50" r="1" fill="#6366f1" />
                  <circle cx="70" cy="50" r="1" fill="#6366f1" />
                  <circle cx="50" cy="70" r="1" fill="#6366f1" />
                  <circle cx="40" cy="60" r="1" fill="#6366f1" />
                  <circle cx="60" cy="60" r="1" fill="#6366f1" />
                </svg>
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark">{gameData.studentName}</h2>
              <p className="text-gray">Session: {gameData.sessionNumber} • Date: {gameData.sessionDate}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="stat-box stat-box-indigo">
              <p className="text-xs text-indigo font-medium">SESSION DURATION</p>
              <p className="text-xl font-bold text-dark">{gameData.sessionDuration}</p>
            </div>
            <div className="stat-box stat-box-green">
              <p className="text-xs text-green font-medium">DOMINANT EMOTION</p>
              <p className="text-xl font-bold text-dark">{emotionCards[0]?.name || 'Neutral'}</p>
            </div>
            <div className="stat-box stat-box-amber">
              <p className="text-xs text-amber font-medium">SCORE</p>
              <p className="text-xl font-bold text-dark">{gameData.score || 0}</p>
            </div>
            <div className="stat-box stat-box-blue">
              <p className="text-xs text-blue font-medium">ENGAGEMENT SCORE</p>
              <p className="text-xl font-bold text-dark">{gameData.engagementScore}</p>
            </div>
            <div className="stat-box stat-box-purple">
              <p className="text-xs text-purple font-medium">GAME NAME</p>
              <p className="text-xl font-bold text-dark">{gameData.gameName || 'Unknown Game'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emotion Distribution */}
      <div className="grid-2-1 grid-2">
        <div className="card-container">
          <h3 className="text-lg font-semibold text-dark mb-4">Emotion Distribution</h3>
          <div className="chart-container">
            <canvas ref={emotionPieChartRef}></canvas>
          </div>
        </div>
        <div className="card-container">
          <h3 className="text-lg font-semibold text-dark mb-4">Emotion Counts</h3>
          <div className="chart-container">
            <canvas ref={emotionBarChartRef}></canvas>
          </div>
        </div>
      </div>

      {/* Emotion vs Time */}
      <div className="card-container mb-8">
        <h3 className="text-lg font-semibold text-dark mb-4">Emotions Over Time</h3>
        <div className="chart-container">
          <canvas ref={emotionTimeChartRef}></canvas>
        </div>
      </div>

      {/* Emotion Cards */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-dark mb-4">Key Emotions Detected</h3>
        <div className="grid-2-1 grid-4">
          {emotionCards.slice(0, 4).map((card, index) => (
            <div
              key={index}
              className={`emotion-card border-${card.emotionClass}`}
            >
              <div className="flex-justify-between">
                <div>
                  <h4 className="text-xl font-bold text-dark">{card.name}</h4>
                  <p className="text-gray">{card.description}</p>
                </div>
                <div className={`badge badge-${card.emotionClass}`}>
                  {card.percentage}%
                </div>
              </div>
              <div className="mt-4">
                <div className="progress-bar">
                  <div className={`progress-bar-fill progress-${card.emotionClass} ${card.percentageClass}`}></div>
                </div>
              </div>
              <div className="mt-2 text-sm text-gray">
                Count: {card.count}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Session Insights */}
      <div className="card-container">
        <h3 className="text-lg font-semibold text-dark mb-4">Session Insights</h3>
        <div className="grid-2-1">
          <div>
            <h4 className="font-medium text-dark mb-2">Key Observations</h4>
            <ul>
              <li className="list-item flex-row flex-align-center space-x-2 mb-2">
                <svg className={`icon ${getScoreIconClass(gameData.score || 0)}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={gameData.score < 5 ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"} />
                </svg>
                <span className="text-gray">Achieved score of {gameData.score || 0} during the session</span>
              </li>
              <li className="list-item flex-row flex-align-center space-x-2 mb-2">
                <svg className={`icon ${getEmotionIconClass(emotionCards[0]?.name || 'Neutral')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={['happy', 'surprised'].includes(emotionCards[0]?.name.toLowerCase()) ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
                </svg>
                <span className="text-gray">Dominant emotion was {emotionCards[0]?.name || 'Neutral'} ({emotionCards[0]?.percentage || 0}%)</span>
              </li>
              <li className="list-item flex-row flex-align-center space-x-2 mb-2">
                <svg className={`icon ${getEmotionIconClass(emotionCards[1]?.name || 'None')}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={['happy', 'surprised'].includes(emotionCards[1]?.name.toLowerCase()) ? "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" : "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"} />
                </svg>
                <span className="text-gray">Secondary emotion was {emotionCards[1]?.name || 'None'} ({emotionCards[1]?.percentage || 0}%)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmotionTrackingReport;