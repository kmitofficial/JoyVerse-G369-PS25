import React, { useState, useEffect } from 'react';
import { BookOpen } from 'lucide-react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { isAuthenticated, getUserFromToken, logout } from './utils/auth';

// Components
import { LoginForm } from './components/LoginForm';
import LandingPage from './components/LandingPage';
import { GameSelection } from './components/GameSelection';
import { SuperAdminDashboard } from './components/SuperAdminDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import AdminRequest from './components/AdminRequest';
import EmotionTrackingReport from './components/EmotionTrackingReport';
import Request from './components/Request';
import ProtectedRoute from './components/ProtectedRoute';

// Games
import BoggleGame from './games/BoggleGame';
import FruitGuesser from './games/fruitguesser';
import MemoryGame from './games/MemoryGame';
import MemorySequenceGame from './games/MemorySequence';

// Hooks and Styles
import { useAppData } from './hooks/useAppData';
import './styles/App.css';

// Home component to handle role-based navigation
const HomeComponent = ({ user }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    // Navigate to role-specific dashboard
    if (user.role === 'superadmin') {
      navigate('/super-admin-dashboard', { replace: true });
    } else if (user.role === 'admin') {
      navigate('/admin-dashboard', { replace: true });
    } else {
      navigate('/game-selection', { replace: true });
    }
  }, [user, navigate]);

  // Show loading while navigating
  return (
    <div className="loading-section">
      <BookOpen size={48} className="text-blue-600" />
      <p>Loading your dashboard...</p>
    </div>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const { adminFeedback } = useAppData();

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        const userData = getUserFromToken();
        setUser(userData);
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = (role, username) => {
    const userData = { username, role };
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    logout();
  };

  const handleLoginClick = () => {
    // Navigate to login page when login button is clicked on landing page
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="app-container">
        <div className="app-content">
          <div className="loading-section">
            <BookOpen size={48} className="text-blue-600" />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="app-container">
        <div className="app-content">
          <Routes>
            {/* Public Routes */}
            <Route
              path="/landing"
              element={<LandingPage onLoginClick={handleLoginClick} />}
            />

            <Route
              path="/login"
              element={
                <div className="login-section">
                  <div className="header-container">
                    <BookOpen size={48} className="text-blue-600" />
                    <h1 className="app-title">Reading Adventure</h1>
                  </div>
                  <p className="app-description">
                    Welcome to your special learning journey! Let's make reading fun together.
                  </p>
                  <div className="login-card">
                    <h2 className="login-title">Sign In to Continue</h2>
                    <LoginForm onLogin={handleLogin} />
                    <button
                      onClick={() => window.location.href = '/landing'}
                      className="back-button"
                      type="button"
                    >
                      Back to Home
                    </button>
                  </div>
                </div>
              }
            />

            {/* Root Route - Landing Page for Non-Authenticated, Dashboard for Authenticated */}
            <Route
              path="/"
              element={
                user ? (
                  <HomeComponent user={user} />
                ) : (
                  <Navigate to="/landing" replace />
                )
              }
            />

            {/* Dashboard Route for Authenticated Users */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <HomeComponent user={user} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/game-selection"
              element={
                <ProtectedRoute>
                  <GameSelection />
                </ProtectedRoute>
              }
            />

            {/* Admin Routes */}
            <Route
              path="/admin-dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard adminUsername={user?.username} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/super-admin-dashboard"
              element={
                <ProtectedRoute>
                  <SuperAdminDashboard adminFeedback={adminFeedback} />
                </ProtectedRoute>
              }
            />

            {/* Game Routes */}
            <Route
              path="/boggle"
              element={
                <ProtectedRoute>
                  <BoggleGame username={user?.username} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/fruit-guesser"
              element={
                <ProtectedRoute>
                  <FruitGuesser username={user?.username} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/memory-game"
              element={
                <ProtectedRoute>
                  <MemoryGame username={user?.username} />
                </ProtectedRoute>
              }
            />

            <Route
              path="/memory-sequence"
              element={
                <ProtectedRoute>
                  <MemorySequenceGame username={user?.username} />
                </ProtectedRoute>
              }
            />

            {/* Component Routes */}
            <Route
              path="/admin-request"
              element={
                <ProtectedRoute requiredRole="superadmin">
                  <AdminRequest
                    requestData={{
                      id: 'sample-id',
                      name: 'Sample Admin',
                      password: 'sample-password',
                      occupation: 'Teacher',
                      bio: 'Sample bio',
                      phone: '123-456-7890',
                      usernameExists: false,
                    }}
                    onCreate={() => {}}
                    onDecline={() => {}}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/emotion-report"
              element={
                <ProtectedRoute>
                  <EmotionTrackingReport
                    gameData={{
                      studentName: user?.username || 'Sample Student',
                      sessionNumber: 1,
                      sessionDate: new Date().toLocaleDateString(),
                      sessionDuration: '15 minutes',
                      score: 8,
                      engagementScore: 85,
                      gameName: 'Sample Game',
                      emotionCounts: {
                        happy: 42,
                        sad: 15,
                        disgust: 8,
                        neutral: 20,
                        fear: 5,
                        angry: 12,
                        surprised: 18
                      },
                      timestamps: [
                        { time: new Date().toISOString(), emotion: 'happy' },
                        { time: new Date().toISOString(), emotion: 'neutral' }
                      ]
                    }}
                  />
                </ProtectedRoute>
              }
            />

            <Route
              path="/request"
              element={
                <ProtectedRoute requiredRole="admin">
                  <Request
                    requestData={{
                      id: 'sample-child-id',
                      name: 'Sample Child',
                      password: 'sample-password',
                      phone: '123-456-7890',
                      usernameExists: false,
                    }}
                    onCreate={() => {}}
                    onDecline={() => {}}
                  />
                </ProtectedRoute>
              }
            />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/landing" />} />
          </Routes>

          {/* Sign Out Button - only show when logged in */}
          {user && (
            <button
              onClick={handleLogout}
              className="signout-button"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </Router>
  );
}

export default App;