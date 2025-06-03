import React, { useState, useEffect, useCallback } from "react";
import '../styles/Request.css';

const Request = ({ requestData, onCreate, onDecline }) => {
  const [animationState, setAnimationState] = useState(null);
  const [hasError, setHasError] = useState(false);
  const [usernameExists, setUsernameExists] = useState(requestData.usernameExists);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [editedUsername, setEditedUsername] = useState(requestData.name);
  const [debounceTimeout, setDebounceTimeout] = useState(null);
  const [loading, setLoading] = useState(false);

  const checkUsernameExists = useCallback(async (username) => {
    if (!username) {
      setUsernameExists(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3002/api/children/check-username?username=${encodeURIComponent(username)}`);
      const data = await response.json();
      setUsernameExists(data.exists);
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameExists(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimeout) {
      clearTimeout(debounceTimeout);
    }

    const timeout = setTimeout(() => {
      checkUsernameExists(editedUsername);
    }, 500);

    setDebounceTimeout(timeout);

    return () => clearTimeout(timeout);
  }, [editedUsername, checkUsernameExists]);

  const handleCreateClick = () => {
    if (usernameExists || hasError) return;
    setAnimationState('approve');
  };

  const handleDeclineClick = () => {
    setAnimationState('reject');
  };

  const handleAnimationEnd = () => {
    if (hasError) {
      setAnimationState(null);
      setHasError(false);
      return;
    }

    if (animationState === 'approve' && onCreate) {
      onCreate(requestData.id, () => {
        setHasError(true);
      }, editedUsername);
    } else if (animationState === 'reject' && onDecline) {
      onDecline(requestData.id);
    }
  };

  const handleEditUsername = () => {
    setIsEditingUsername(true);
  };

  const handleUsernameChange = (e) => {
    setEditedUsername(e.target.value);
  };

  const handleUsernameSave = () => {
    setIsEditingUsername(false);
  };

  return (
    <div className="request-wrapper">
      <div className="request-signs">
        <div className="request-sign request-approved-sign">
          Approved
        </div>
        <div className="request-sign request-rejected-sign">
          Rejected
        </div>
      </div>
      <div
        className={`request-container ${
          animationState === 'approve' && !hasError ? 'slide-right' :
          animationState === 'reject' ? 'slide-left' : ''
        }`}
        onAnimationEnd={handleAnimationEnd}
      >
        <div className="request-card">
          <div className="request-header">
            <div className="request-field request-name-field">
              <div className="request-label">Name</div>
              {isEditingUsername ? (
                <input
                  type="text"
                  value={editedUsername}
                  onChange={handleUsernameChange}
                  onBlur={handleUsernameSave}
                  className="request-value-input"
                  autoFocus
                />
              ) : (
                <div className="request-value">
                  {editedUsername || 'Not provided'}
                  {usernameExists && (
                    <button
                      onClick={handleEditUsername}
                      className="edit-username-btn"
                    >
                      Edit Username
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="request-field request-password-field">
              <div className="request-label">Password</div>
              <div className="request-value">{requestData.password || 'Not provided'}</div>
            </div>
            <div className="request-field request-phone-field">
              <div className="request-label">Phone</div>
              <div className="request-value">{requestData.phone || 'Not provided'}</div>
            </div>
          </div>
          <div className="request-actions">
            <button className="request-btn request-reject" onClick={handleDeclineClick}>
              Reject
            </button>
            <button
              className={`request-btn ${usernameExists ? 'request-exists' : 'request-accept'}`}
              onClick={handleCreateClick}
              disabled={usernameExists || loading}
            >
              {loading ? 'Checking...' : usernameExists ? 'Already Exists' : 'Accept'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Request;