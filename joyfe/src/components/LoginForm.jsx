import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, setToken } from '../utils/auth';
import '../styles/LoginForm.css';

export function LoginForm({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Super admin (hardcoded)
    if (username === 'superadmin' && password === 'super123') {
      // Create a fake JWT token for superadmin
      const superadminPayload = {
        id: 'superadmin-id',
        username: 'superadmin',
        role: 'superadmin',
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours from now
      };

      // Create a simple base64 encoded token (not a real JWT but works for our purposes)
      const fakeToken = 'fake.' + btoa(JSON.stringify(superadminPayload)) + '.signature';
      setToken(fakeToken);

      if (onLogin) onLogin('superadmin', username);
      navigate('/');
      setLoading(false);
      return;
    }

    try {
      const result = await login(username, password);

      if (result.success) {
        if (onLogin) onLogin(result.user.role, result.user.username);

        // Navigate to root route, HomeComponent will handle role-based routing
        navigate('/');
      } else {
        setError(result.error);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <div>
        <label 
          htmlFor="username" 
          className="form-label"
        >
          Username
        </label>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="form-input"
        />
      </div>
      <div>
        <label 
          htmlFor="password" 
          className="form-label"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="form-input"
        />
      </div>
      {error && (
        <p className="error-message">{error}</p>
      )}
      <button
        type="submit"
        className="submit-button"
        disabled={loading}
      >
        {loading ? 'Signing In...' : 'Sign In'}
      </button>
    </form>
  );
}