import React, { useEffect, useState, useRef } from 'react';
import { Users, MessageSquare, UserPlus, BarChart, ArrowLeft, FileText, UserMinus } from 'lucide-react';
import EmotionTrackingReport from './EmotionTrackingReport';
import Request from './Request';

export function AdminDashboard({ adminUsername, onLogout }) {
  const [activeTab, setActiveTab] = useState('children');
  const [children, setChildren] = useState([]);
  const [gameData, setGameData] = useState({});
  const [sessionData, setSessionData] = useState({});
  const [newChild, setNewChild] = useState({ username: '', password: '', hint: '' });
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbacks, setFeedbacks] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedChildName, setSelectedChildName] = useState('');
  const [childRequests, setChildRequests] = useState([]);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);

  // Helper function to validate and log JSON data
  const validateAndStringify = (data, context) => {
    try {
      const cleanedData = JSON.parse(JSON.stringify(data));
      console.log(`Sending ${context}:`, cleanedData);
      return JSON.stringify(cleanedData);
    } catch (err) {
      console.error(`Invalid JSON in ${context}:`, err.message, data);
      throw new Error(`Invalid JSON format in ${context}. Please check the input data.`);
    }
  };

  // Fetch child requests from the backend
  useEffect(() => {
    const fetchChildRequests = async () => {
      try {
        const response = await fetch(`http://localhost:3002/api/child-requests?adminId=${adminUsername}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch child requests');
        }
        const requestsWithExists = await Promise.all(
          data.map(async (request) => {
            const existsResponse = await fetch(
              `http://localhost:3002/api/children/check-username?username=${encodeURIComponent(request.name)}`
            );
            const existsData = await existsResponse.json();
            return { ...request, usernameExists: existsData.exists };
          })
        );
        setChildRequests(requestsWithExists);
      } catch (err) {
        console.error('Error fetching child requests:', err);
        setError('Failed to load child requests. Please try again later.');
      }
    };

    fetchChildRequests();
  }, [adminUsername]);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch(`http://localhost:3002/api/children?admin=${adminUsername}`);
        const data = await res.json();
        if (res.ok) {
          setChildren(data);
        } else {
          console.error('Error loading children:', data.error);
          setError('Failed to load children. Please try again later.');
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('Failed to load children. Please try again later.');
      }
    };

    fetchChildren();
  }, [adminUsername]);

  useEffect(() => {
    const fetchGameData = async () => {
      try {
        const res = await fetch(`http://localhost:3002/api/game_data?admin=${adminUsername}`);
        const data = await res.json();
        if (res.ok) {
          const organizedData = data.reduce((acc, entry) => {
            if (!acc[entry.username]) {
              acc[entry.username] = [];
            }
            acc[entry.username].push(entry);
            return acc;
          }, {});
          setGameData(organizedData);
          
          const sessionsByChild = {};
          Object.entries(organizedData).forEach(([childName, entries]) => {
            const sessions = groupEntriesByTimeGapAndLevelReset(entries);
            sessionsByChild[childName] = sessions;
          });
          
          setSessionData(sessionsByChild);
        } else {
          console.error('Error loading game data:', data.error);
          setError('Failed to load game data. Please try again later.');
        }
      } catch (err) {
        console.error('Fetch game data error:', err);
        setError('Failed to load game data. Please try again later.');
      }
    };

    fetchGameData();
  }, [adminUsername]);

  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        const res = await fetch('http://localhost:3002/api/feedback');
        const data = await res.json();
        setFeedbacks(data);
      } catch (err) {
        console.error('Error fetching feedback:', err);
        setError('Failed to load group chat messages. Please try again later.');
      }
    };

    fetchFeedback();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedbacks]);

  const groupEntriesByTimeGapAndLevelReset = (entries) => {
    if (!entries || entries.length === 0) {
      return [];
    }
    
    const sortedEntries = [...entries].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    
    const sessions = [];
    let currentSessionEntries = [sortedEntries[0]];
    
    // Group entries into sessions based on 120-second time gap
    for (let i = 1; i < sortedEntries.length; i++) {
      const currentEntry = sortedEntries[i];
      const previousEntry = sortedEntries[i - 1];
      
      const currentTime = new Date(currentEntry.timestamp).getTime();
      const previousTime = new Date(previousEntry.timestamp).getTime();
      
      if (currentTime - previousTime > 120000) {
        if (currentSessionEntries.length > 0) {
          sessions.push(currentSessionEntries);
        }
        currentSessionEntries = [currentEntry];
      } else {
        currentSessionEntries.push(currentEntry);
      }
    }
    
    if (currentSessionEntries.length > 0) {
      sessions.push(currentSessionEntries);
    }
    
    const processedSessions = sessions.map((sessionEntries, sessionIndex) => {
      const levels = [];
      let currentLevelEntries = [sessionEntries[0]];
      
      // Initialize with score or wordsFound based on game
      const isBoggle = sessionEntries[0].gameName === 'Boggle game';
      let lastNonZeroScore = isBoggle 
        ? Number(sessionEntries[0].wordsFound) || 0 
        : Number(sessionEntries[0].score) || 0;
      let totalScore = lastNonZeroScore;
      
      // Group entries into levels based on reset condition for Boggle
      for (let i = 1; i < sessionEntries.length; i++) {
        const currentEntry = sessionEntries[i];
        const previousEntry = sessionEntries[i - 1];
        
        let isLevelReset = false;
        if (isBoggle && 'wordsFound' in currentEntry && 'wordsFound' in previousEntry && 
            currentEntry.wordsFound !== null && previousEntry.wordsFound !== null) {
          isLevelReset = previousEntry.wordsFound === 4 && currentEntry.wordsFound === 0;
        }
        
        if (isLevelReset) {
          if (currentLevelEntries.length > 0) {
            levels.push(currentLevelEntries);
          }
          currentLevelEntries = [currentEntry];
          totalScore += Number(currentEntry.wordsFound) || 0;
        } else {
          currentLevelEntries.push(currentEntry);
        }
        
        // Update last non-zero score based on game
        const currentValue = isBoggle ? Number(currentEntry.wordsFound) : Number(currentEntry.score);
        if (currentValue !== 0) {
          lastNonZeroScore = currentValue;
          if (!isLevelReset) {
            totalScore = lastNonZeroScore; // Update totalScore to latest non-zero value
          }
        }
      }
      
      if (currentLevelEntries.length > 0) {
        levels.push(currentLevelEntries);
      }
      
      // Assign score to each entry
      let entryLastNonZeroScore = isBoggle 
        ? Number(sessionEntries[0].wordsFound) || 0 
        : Number(sessionEntries[0].score) || 0;
      const entriesWithScore = sessionEntries.map((entry, index) => {
        const entryValue = isBoggle ? Number(entry.wordsFound) : Number(entry.score);
        if (entryValue === 0 && index > 0) {
          return { ...entry, score: entryLastNonZeroScore };
        }
        if (entryValue !== 0) {
          entryLastNonZeroScore = entryValue;
        }
        return { ...entry, score: entryLastNonZeroScore };
      });
      
      const processedLevels = levels.map((levelEntries, levelIndex) => {
        let levelLastNonZeroScore = isBoggle 
          ? Number(levelEntries[0].wordsFound) || 0 
          : Number(levelEntries[0].score) || 0;
        let levelScore = levelLastNonZeroScore;
        
        // Assign score for each level entry
        const levelEntriesWithScore = levelEntries.map((entry, index) => {
          const entryValue = isBoggle ? Number(entry.wordsFound) : Number(entry.score);
          if (entryValue === 0 && index > 0) {
            return { ...entry, score: levelLastNonZeroScore };
          }
          if (entryValue !== 0) {
            levelLastNonZeroScore = entryValue;
            levelScore = levelLastNonZeroScore;
          }
          return { ...entry, score: levelLastNonZeroScore };
        });
        
        const completed = levelScore > 0;
        
        return {
          id: `level-${levelIndex + 1}`,
          name: `Level ${levelIndex + 1}`,
          entries: levelEntriesWithScore,
          wordsFound: isBoggle ? levelLastNonZeroScore : null,
          totalScore: levelScore,
          completed: completed
        };
      });
      
      const dominantEmotion = calculateDominantEmotion(sessionEntries);
      const startTime = new Date(sessionEntries[0].timestamp);
      const endTime = new Date(sessionEntries[sessionEntries.length - 1].timestamp);
      
      return {
        id: `session-${sessionIndex + 1}`,
        name: `Session #${sessionIndex + 1}`,
        entries: entriesWithScore,
        levels: processedLevels,
        totalScore: totalScore,
        dominantEmotion: dominantEmotion,
        startTime: startTime,
        endTime: endTime
      };
    });
    
    return processedSessions.sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());
  };

  const calculateDominantEmotion = (entries) => {
    const validEmotions = ['happy', 'sad', 'disgust', 'neutral', 'fear', 'angry', 'surprised'];
    const emotionCounts = {
      happy: 0,
      sad: 0,
      disgust: 0,
      neutral: 0,
      fear: 0,
      angry: 0,
      surprised: 0
    };
    
    entries.forEach(entry => {
      const emotion = entry.emotion ? entry.emotion.toLowerCase() : 'neutral';
      if (validEmotions.includes(emotion)) {
        emotionCounts[emotion]++;
      } else {
        emotionCounts.neutral++;
      }
    });
    
    let maxEmotion = 'neutral';
    let maxCount = 0;
    
    Object.entries(emotionCounts).forEach(([emotion, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxEmotion = emotion;
      }
    });
    
    return maxEmotion.charAt(0).toUpperCase() + maxEmotion.slice(1);
  };

  const calculateSessionDuration = (startTime, endTime) => {
    if (!startTime || !endTime) {
      return '0 min';
    }
    
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMin = Math.floor(durationMs / (1000 * 60));
    const durationSec = Math.floor((durationMs % (1000 * 60)) / 1000);
    
    if (durationMin === 0) {
      return `${durationSec} sec`;
    } else if (durationSec === 0) {
      return `${durationMin} min`;
    } else {
      return `${durationMin} min ${durationSec} sec`;
    }
  };

  const handleAddChild = async (childData) => {
    const dataToAdd = childData ? 
      { 
        username: childData.name, 
        password: childData.password,
        hint: `Phone: ${childData.phone}`,
        displayPassword: childData.password,
        displayPhone: childData.phone
      } : 
      { 
        ...newChild,
        displayPassword: newChild.password,
        displayPhone: newChild.hint.includes('Phone:') ? newChild.hint.replace('Phone:', '').trim() : newChild.hint
      };
      
    if (dataToAdd.username && dataToAdd.password && dataToAdd.hint) {
      try {
        const body = validateAndStringify({ ...dataToAdd, adminId: adminUsername }, 'handleAddChild');
        const response = await fetch('http://localhost:3002/api/children', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body
        });

        const data = await response.json();

        if (response.ok) {
          const enhancedData = {
            ...data,
            displayPassword: dataToAdd.displayPassword,
            displayPhone: dataToAdd.displayPhone
          };
          
          setChildren((prev) => [...prev, enhancedData]);
          if (!childData) {
            setNewChild({ username: '', password: '', hint: '' });
          }
          return true;
        } else {
          if (data.error === 'Username already exists') {
            alert('Username already exists. Please choose a different username.');
          } else {
            setError(`Failed to add child: ${data.error}`);
          }
          return false;
        }
      } catch (err) {
        console.error('Error in handleAddChild:', err);
        setError(err.message || 'Failed to add child. Please try again.');
        return false;
      }
    } else {
      console.error('Please fill in all required fields (username, password, phone).');
      return false;
    }
  };

  const handleCreateChildSubmit = (e) => {
    e.preventDefault();
    handleAddChild();
  };

  const handleSendFeedback = async (e) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    try {
      const feedbackData = {
        sender: adminUsername,
        message: feedbackMessage,
        isSuperAdmin: false,
      };
      const body = validateAndStringify(feedbackData, 'handleSendFeedback');
      const response = await fetch('http://localhost:3002/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (response.ok) {
        setFeedbackMessage('');
        const fetchFeedback = async () => {
          const res = await fetch('http://localhost:3002/api/feedback');
          const data = await res.json();
          
          setFeedbacks(data);
        };
        fetchFeedback();
      } else {
        const err = await response.json();
        console.error('Error sending feedback:', err.error);
        setError(`Failed to send message: ${err.error}`);
      }
    } catch (err) {
      console.error('Error in handleSendFeedback:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    }
  };

  const viewDetailedReport = (childName, session) => {
    setSelectedChildName(childName);
    setSelectedSession(session);
  };

  const backToReportsList = () => {
    setSelectedSession(null);
    setSelectedChildName('');
  };

  const aggregateSessionEmotionData = (entries) => {
    const emotionCounts = {
      happy: 0,
      sad: 0,
      disgust: 0,
      neutral: 0,
      fear: 0,
      angry: 0,
      surprised: 0
    };
    
    if (!entries || entries.length === 0) {
      return emotionCounts;
    }
    
    entries.forEach(entry => {
      const emotion = entry.emotion ? entry.emotion.toLowerCase() : 'neutral';
      if (emotion in emotionCounts) {
        emotionCounts[emotion]++;
      } else {
        emotionCounts.neutral++;
      }
    });
    
    return emotionCounts;
  };

  const transformSessionDataForReport = (childName, session) => {
    const emotionCounts = aggregateSessionEmotionData(session.entries);
    const sessionDuration = calculateSessionDuration(session.startTime, session.endTime);
    
    const score = session.totalScore;
    
    const timestamps = session.entries.map(entry => ({
      time: entry.timestamp,
      emotion: entry.emotion ? entry.emotion.toLowerCase() : 'neutral'
    }));
    
    const uniqueEmotions = Object.values(emotionCounts).filter(count => count > 0).length;
    const engagementScore = Math.min(10, Math.max(1, Math.round((uniqueEmotions * 1.5 + score * 0.5) * 10) / 10));
    
    const levelInfo = session.levels.map(level => ({
      name: level.name,
      completed: level.completed,
      wordsFound: level.wordsFound,
      totalScore: level.totalScore
    }));
    
    return {
      studentName: childName,
      sessionNumber: session.name,
      sessionDate: session.startTime.toLocaleDateString(),
      sessionDuration: sessionDuration,
      dominantEmotion: session.dominantEmotion,
      score: score,
      engagementScore: `${engagementScore}/10`,
      emotionCounts: emotionCounts,
      timestamps: timestamps
    };
  };

  const handleCreateChildRequest = async (requestId, onError, editedUsername) => {
    const request = childRequests.find(req => req._id === requestId);
    if (request) {
      const modifiedRequest = { ...request, name: editedUsername || request.name };
      const success = await handleAddChild(modifiedRequest);
      
      if (success) {
        try {
          const body = validateAndStringify({ id: requestId }, 'handleCreateChildRequest');
          await fetch('http://localhost:3002/api/child-requests/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body
          });
          
          setChildRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));
          
        } catch (err) {
          console.error('Error deleting child request:', err);
          setError('Failed to delete child request. Please try again.');
        }
      } else {
        onError();
      }
    }
  };

  const handleDeclineRequest = async (requestId) => {
    try {
      const body = validateAndStringify({ id: requestId }, 'handleDeclineRequest');
      await fetch('http://localhost:3002/api/child-requests/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      setChildRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));
    } catch (err) {
      console.error('Error declining child request:', err);
      setError('Failed to decline child request. Please try again.');
    }
  };

  const extractPhoneFromHint = (hint) => {
    if (hint && hint.includes('Phone:')) {
      return hint.split('Phone:')[1].trim();
    }
    return hint || '';
  };

  const handleRemoveChild = async (username) => {
    if (window.confirm(`Are you sure you want to remove the child account for ${username}?`)) {
      try {
        const body = validateAndStringify({ username, adminId: adminUsername }, 'handleRemoveChild');
        const response = await fetch('http://localhost:3002/api/children/delete', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body
        });

        if (response.ok) {
          setChildren(prevChildren => prevChildren.filter(child => child.username !== username));
        } else {
          const data = await response.json();
          console.error('Error removing child:', data.error);
          setError(`Failed to remove child: ${data.error}`);
        }
      } catch (err) {
        console.error('Error in handleRemoveChild:', err);
        setError(err.message || 'Failed to remove child. Please try again.');
      }
    }
  };

  return (
    <div className="container w-full max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-comic text-blue-600">Admin Dashboard</h2>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => setActiveTab('children')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'children' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            <Users size={20} />
            Manage Children
          </button>
          <button
            onClick={() => {
              setActiveTab('reports');
              setSelectedSession(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'reports' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            <BarChart size={20} />
            Reports
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'feedback' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            <MessageSquare size={20} />
            Group Chat
          </button>
          
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'requests' ? 'bg-blue-500 text-white' : 'bg-gray-100'
            }`}
          >
            <FileText size={20} />
            Student Request ({childRequests.length})
          </button>
          
        </div>
      </div>
      
      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      {activeTab === 'children' && (
        <div className="space-y-8">
          <form onSubmit={handleCreateChildSubmit} className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserPlus size={24} className="text-green-500" />
              Create Child Account
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Username"
                value={newChild.username}
                onChange={(e) => setNewChild({ ...newChild, username: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={newChild.password}
                onChange={(e) => setNewChild({ ...newChild, password: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
                required
              />
              <input
                type="text"
                placeholder="Phone no"
                value={newChild.hint}
                onChange={(e) => setNewChild({ ...newChild, hint: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="mt-4 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
            >
              Create Account
            </button>
          </form>

          <div>
            <h3 className="text-xl font-semibold mb-4">Child Accounts</h3>
            <div className="space-y-4">
              {children.map((child) => (
                <div
                  key={child.username}
                  className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                >
                  <div>
                    <p className="text-lg font-semibold">{child.username}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <p><span className="font-medium">Password:</span> {child.displayPassword || child.password || 'Not available'}</p>
                      <p><span className="font-medium">Phone:</span> {extractPhoneFromHint(child.hint) || child.displayPhone || 'Not available'}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveChild(child.username)}
                    className="flex items-center gap-2 text-red-500 hover:text-red-600 px-3 py-1 rounded-md hover:bg-red-50 transition"
                  >
                    <UserMinus size={18} />
                    Remove
                  </button>
                </div>
              ))}
              {children.length === 0 && (
                <p className="text-gray-500 text-center py-4">No child accounts created yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          {selectedSession ? (
            <div>
              <button 
                onClick={backToReportsList}
                className="flex items-center gap-2 mb-4 text-indigo-600 hover:text-indigo-800"
              >
                <ArrowLeft size={16} />
                Back to Reports
              </button>
              <EmotionTrackingReport gameData={transformSessionDataForReport(selectedChildName, selectedSession)} />
            </div>
          ) : (
            <div>
              <h3 className="text-xl font-semibold mb-4">Game Records</h3>
              <div className="space-y-4">
                {children.map((child) => (
                  <div key={child.username} className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="text-lg font-semibold mb-2">{child.username}</h4>
                    {sessionData[child.username] && sessionData[child.username].length > 0 ? (
                      <div className="space-y-2">
                        {sessionData[child.username].map((session, index) => (
                          <div key={index} className="flex justify-between items-center py-2">
                            <div>
                              <span className="ms-4 mr-4">{session.name}</span>
                              <span className="ms-4 mr-4">Score: {session.totalScore}</span>
                              <span>Emotion: {session.dominantEmotion}</span>
                            </div>
                            <div>
                              <button
                                onClick={() => viewDetailedReport(child.username, session)}
                                className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 transition"
                              >
                                View Detailed Report
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center">No game data recorded yet</p>
                    )}
                  </div>
                ))}
                {children.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No children to show reports for</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold">Group Chat</h3>
          <div className="bg-gray-100 p-6 rounded-lg h-96 overflow-y-auto space-y-4">
            {feedbacks.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No messages in the group chat.</p>
            ) : (
              feedbacks.map((feedback, index) => (
                <div
                  key={index}
                  className={`flex ${
                    feedback.sender === adminUsername ? 'justify-end' : 'justify-start'
                  } items-start gap-2`}
                >
                  {feedback.sender !== adminUsername && (
                    <div className="flex flex-col items-start">
                      <span className="text-xs font-medium text-gray-600 mb-1">
                        {feedback.sender}
                      </span>
                      <div className="max-w-xs bg-white text-gray-800 p-3 rounded-lg shadow-md relative">
                        <p>{feedback.message}</p>
                        <div className="absolute -left-2 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-white border-b-8 border-b-transparent"></div>
                      </div>
                      <span className="text-xs text-gray-400 mt-1">
                        {new Date(feedback.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                  )}
                  {feedback.sender === adminUsername && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-gray-600 mb-1">
                        You
                      </span>
                      <div className="max-w-xs bg-blue-500 text-white p-3 rounded-lg shadow-md relative">
                        <p>{feedback.message}</p>
                        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-blue-500 border-b-8 border-b-transparent"></div>
                      </div>
                      <span className="text-xs text-gray-400 mt-1">
                        {new Date(feedback.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <input
              type="text"
              placeholder="Type your message..."
              value={feedbackMessage}
              onChange={(e) => setFeedbackMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendFeedback(e)}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-blue-500 outline-none"
            />
            <button
              onClick={handleSendFeedback}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-8">
          <h3 className="text-xl font-semibold mb-4">Student Requests</h3>
          {childRequests.length > 0 ? (
            <div className="space-y-4">
              {childRequests.map((request) => (
                <Request 
                  key={request._id} 
                  requestData={{
                    id: request._id,
                    name: request.name,
                    password: request.password,
                    phone: request.phone,
                    usernameExists: request.usernameExists,
                  }} 
                  onCreate={handleCreateChildRequest} 
                  onDecline={handleDeclineRequest} 
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No pending student requests.</p>
          )}
        </div>
      )}
    </div>
  );
}