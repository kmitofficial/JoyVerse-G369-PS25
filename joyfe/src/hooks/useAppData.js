import { useState } from 'react';

// Initial data stored in localStorage or default values
const getInitialData = () => {
  const storedData = localStorage.getItem('appData');
  if (storedData) {
    return JSON.parse(storedData);
  }
  return {
    admins: [
      { id: '1', username: 'admin1', password: 'admin123' },
      { id: '2', username: 'admin2', password: 'admin456' }
    ],
    children: [],
    adminFeedback: [],
    gameScores: []
  };
};

export function useAppData() {
  const [data, setData] = useState(getInitialData());

  const updateStorage = (newData) => {
    localStorage.setItem('appData', JSON.stringify(newData));
    setData(newData);
  };

  const addChild = (child) => {
    const newData = {
      ...data,
      children: [...data.children, { ...child, scores: [] }]
    };
    updateStorage(newData);
  };

  const addScore = (username, score) => {
    const newData = {
      ...data,
      children: data.children.map(child => 
        child.username === username 
          ? {
              ...child,
              scores: [...(child.scores || []), { score, date: new Date().toISOString().split('T')[0] }]
            }
          : child
      )
    };
    updateStorage(newData);
  };

  const addFeedback = (feedback) => {
    const newData = {
      ...data,
      adminFeedback: [...data.adminFeedback, feedback]
    };
    updateStorage(newData);
  };

  const addAdmin = (admin) => {
    const newData = {
      ...data,
      admins: [...data.admins, admin]
    };
    updateStorage(newData);
  };

  const removeAdmin = (username) => {
    const newData = {
      ...data,
      admins: data.admins.filter(admin => admin.username !== username)
    };
    updateStorage(newData);
  };

  return {
    ...data,
    addChild,
    addScore,
    addFeedback,
    addAdmin,
    removeAdmin
  };
} 