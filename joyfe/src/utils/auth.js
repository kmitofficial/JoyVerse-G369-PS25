// Authentication utilities for JWT handling

// Store token in localStorage
export const setToken = (token) => {
  localStorage.setItem('joyverse_token', token);
};

// Get token from localStorage
export const getToken = () => {
  return localStorage.getItem('joyverse_token');
};

// Remove token from localStorage
export const removeToken = () => {
  localStorage.removeItem('joyverse_token');
};

// Check if user is authenticated
export const isAuthenticated = () => {
  const token = getToken();
  if (!token) return false;
  
  try {
    // Simple token validation - check if it's not expired
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    
    if (payload.exp < currentTime) {
      removeToken();
      return false;
    }
    
    return true;
  } catch (error) {
    removeToken();
    return false;
  }
};

// Get user data from token
export const getUserFromToken = () => {
  const token = getToken();
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return {
      username: payload.username,
      role: payload.role,
      id: payload.id
    };
  } catch (error) {
    return null;
  }
};

// Login function
export const login = async (username, password) => {
  try {
    const response = await fetch('http://localhost:3002/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      setToken(data.token);
      return {
        success: true,
        user: {
          username: data.username,
          role: data.role,
          id: data.id
        }
      };
    } else {
      return {
        success: false,
        error: data.error || 'Login failed'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: 'Network error. Please try again.'
    };
  }
};

// Logout function
export const logout = () => {
  removeToken();
  window.location.href = '/landing';
};

// API request with authentication
export const authenticatedRequest = async (url, options = {}) => {
  const token = getToken();
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` })
    }
  };

  try {
    const response = await fetch(url, config);
    
    if (response.status === 401) {
      // Token expired or invalid
      logout();
      return null;
    }
    
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};
