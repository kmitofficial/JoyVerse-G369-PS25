import React, { useState, useEffect, useRef } from 'react';
import { Users, MessageSquare, UserPlus, UserMinus, FileText } from 'lucide-react';
import AdminRequest from './AdminRequest';

export function SuperAdminDashboard({ onLogout }) {
  const [admins, setAdmins] = useState([]);
  const [adminFeedback, setAdminFeedback] = useState([]);
  const [newAdmin, setNewAdmin] = useState({ 
    username: '', 
    password: '', 
    phone: '', 
    bio: '', 
    occupation: '' 
  });
  const [activeTab, setActiveTab] = useState('admins');
  const [messageInput, setMessageInput] = useState('');
  const [adminRequests, setAdminRequests] = useState([]);
  const [error, setError] = useState(null);
  const chatEndRef = useRef(null);
  
  const [adminPasswords, setAdminPasswords] = useState({});

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

  useEffect(() => {
    const fetchAdminRequests = async () => {
      try {
        const response = await fetch('http://localhost:3002/api/admin-requests');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch admin requests');
        }
        const requestsWithExists = await Promise.all(
          data.map(async (request) => {
            const existsResponse = await fetch(
              `http://localhost:3002/api/admins/check-username?username=${encodeURIComponent(request.name)}`
            );
            const existsData = await existsResponse.json();
            return { ...request, usernameExists: existsData.exists };
          })
        );
        setAdminRequests(requestsWithExists);
        
      } catch (err) {
        console.error('Error fetching admin requests:', err);
        setError('Failed to load admin requests. Please try again later.');
      }
    };

    fetchAdminRequests();
  }, []);

  useEffect(() => {
    fetchAdmins();
    fetchFeedback();
    
    const savedPasswords = localStorage.getItem('adminPasswords');
    if (savedPasswords) {
      setAdminPasswords(JSON.parse(savedPasswords));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('adminPasswords', JSON.stringify(adminPasswords));
  }, [adminPasswords]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [adminFeedback]);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/admins');
      const data = await res.json();
      setAdmins(data);
      console.log('Fetched Admins:', data); 
    } catch (err) {
      console.error('Error fetching admins:', err);
      setError('Failed to load admins. Please try again later.');
    }
  };

  const fetchFeedback = async () => {
    try {
      const res = await fetch('http://localhost:3002/api/feedback');
      const data = await res.json();
      setAdminFeedback(data);
    } catch (err) {
      console.error('Error fetching feedback:', err);
      setError('Failed to load group chat messages. Please try again later.');
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;

    try {
      const feedbackData = {
        sender: 'Super Admin',
        message: messageInput,
        isSuperAdmin: true,
      };
      const body = validateAndStringify(feedbackData, 'handleSendMessage');
      const response = await fetch('http://localhost:3002/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });

      if (response.ok) {
        setMessageInput('');
        fetchFeedback();
      } else {
        const err = await response.json();
        console.error('Error sending message:', err.error);
        setError(`Failed to send message: ${err.error}`);
      }
    } catch (err) {
      console.error('Error in handleSendMessage:', err);
      setError(err.message || 'Failed to send message. Please try again.');
    }
  };

  const handleAddAdmin = async (e) => {
    e.preventDefault();
    if (newAdmin.username && newAdmin.password) {
      try {
        const adminToCreate = {
          ...newAdmin,
          displayPassword: newAdmin.password
        };
        const body = validateAndStringify(adminToCreate, 'handleAddAdmin');
        const response = await fetch('http://localhost:3002/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });

        if (response.ok) {
          setAdminPasswords(prev => ({
            ...prev,
            [newAdmin.username]: newAdmin.password
          }));
          setNewAdmin({ username: '', password: '', phone: '', bio: '', occupation: '' });
          fetchAdmins();
        } else {
          const err = await response.json();
          if (err.error === 'Username already exists') {
            alert('Username already exists. Please choose a different username.');
          }
          setError(`Failed to add admin: ${err.error}`);
        }
      } catch (err) {
        console.error('Error in handleAddAdmin:', err);
        setError(err.message || 'Failed to add admin. Please try again.');
      }
    } else {
      setError('Please fill in all required fields (username, password).');
    }
  };

  const handleCreateAdminRequest = async (requestId, onError, editedUsername) => {
    const request = adminRequests.find(req => req._id === requestId);
    if (request) {
      const updatedRequest = { ...request, name: editedUsername || request.name };
      const adminData = {
        username: updatedRequest.name,
        password: updatedRequest.password || 'defaultPassword',
        phone: updatedRequest.phone,
        bio: updatedRequest.bio,
        occupation: updatedRequest.occupation,
        displayPassword: updatedRequest.password || 'defaultPassword'
      };
      
      try {
        const body = validateAndStringify(adminData, 'handleCreateAdminRequest');
        const response = await fetch('http://localhost:3002/api/admins', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });

        if (response.ok) {
          setAdminPasswords(prev => ({
            ...prev,
            [updatedRequest.name]: updatedRequest.password || 'defaultPassword'
          }));
          
          const deleteBody = validateAndStringify({ id: requestId }, 'handleCreateAdminRequest - delete');
          await fetch('http://localhost:3002/api/admin-requests/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: deleteBody
          });

          setAdminRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));
          fetchAdmins();
        } else {
          const err = await response.json();
          if (err.error === 'Username already exists') {
            alert('Username already exists. Please choose a different username.');
          }
          onError();
          setError(`Failed to create admin: ${err.error}`);
        }
      } catch (err) {
        console.error('Error in handleCreateAdminRequest:', err);
        onError();
        setError(err.message || 'Failed to create admin. Please try again.');
      }
    }
  };

  const handleDeclineAdminRequest = async (requestId) => {
    try {
      const body = validateAndStringify({ id: requestId }, 'handleDeclineAdminRequest');
      await fetch('http://localhost:3002/api/admin-requests/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body
      });
      setAdminRequests(prevRequests => prevRequests.filter(req => req._id !== requestId));
    } catch (err) {
      console.error('Error declining admin request:', err);
      setError(err.message || 'Failed to decline admin request. Please try again.');
    }
  };

  const handleRemoveAdmin = async (username) => {
    if (window.confirm(`Are you sure you want to remove the account for ${username}?`)) {
      try {
        const body = validateAndStringify({ username }, 'handleRemoveAdmin');
        const response = await fetch('http://localhost:3002/api/admins/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });

        if (response.ok) {
          setAdmins(prevAdmins => prevAdmins.filter(admin => admin.username !== username));
          setAdminPasswords(prev => {
            const newPasswords = { ...prev };
            delete newPasswords[username];
            return newPasswords;
          });
        } else {
          const err = await response.json();
          console.error('Error removing admin:', err.error);
          setError(`Failed to remove admin: ${err.error}`);
        }
      } catch (err) {
        console.error('Error in handleRemoveAdmin:', err);
        setError(err.message || 'Failed to remove admin. Please try again.');
      }
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-comic text-purple-600">Super Admin Dashboard</h2>
        <div className="flex gap-4 flex-wrap">
          <button
            onClick={() => setActiveTab('admins')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'admins' ? 'bg-purple-500 text-white' : 'bg-gray-100'
            }`}
          >
            <Users size={20} />
            Manage Admins
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'feedback' ? 'bg-purple-500 text-white' : 'bg-gray-100'
            }`}
          >
            <MessageSquare size={20} />
            Group Chat
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              activeTab === 'requests' ? 'bg-purple-500 text-white' : 'bg-gray-100'
            }`}
          >
            <FileText size={20} />
            Admin Requests ({adminRequests.length})
          </button>
          
        </div>
      </div>

      {error && <p className="text-red-500 text-center mb-4">{error}</p>}

      {activeTab === 'admins' && (
        <div className="space-y-8">
          <form onSubmit={handleAddAdmin} className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-xl font-comic mb-4 flex items-center gap-2">
              <UserPlus size={24} className="text-green-500" />
              Add New Admin
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Username"
                value={newAdmin.username}
                onChange={(e) => setNewAdmin({ ...newAdmin, username: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
              />
              <input
                type="password"
                placeholder="Password"
                value={newAdmin.password}
                onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="tel"
                placeholder="Phone Number"
                value={newAdmin.phone}
                onChange={(e) => setNewAdmin({ ...newAdmin, phone: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
              />
              <input
                type="text"
                placeholder="Occupation"
                value={newAdmin.occupation}
                onChange={(e) => setNewAdmin({ ...newAdmin, occupation: e.target.value })}
                className="px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500"
              />
            </div>
            <div className="mb-4">
              <textarea
                placeholder="Bio"
                value={newAdmin.bio}
                onChange={(e) => setNewAdmin({ ...newAdmin, bio: e.target.value })}
                className="w-full px-4 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 h-24"
              />
            </div>
            <button
              type="submit"
              className="mt-2 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600"
            >
              Add Admin
            </button>
          </form>
          
          <div>
            <h3 className="text-xl font-comic mb-4">Admins</h3>
            <div className="space-y-4">
              {admins
                .filter(admin => !admin.isSuperAdmin)
                .map((admin, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
                  >
                    
                    <div>
                      
                      <p className="text-lg font-semibold">{admin.username}</p>
                      <div className="mt-1 grid grid-cols-2 gap-2 text-sm text-gray-600">
                        <p><span className="font-medium">Password:</span> {admin.password || 'Not available'}</p>
                        <p><span className="font-medium">Phone:</span> {admin.phone || 'Not available'}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAdmin(admin.username)}
                      className="flex items-center gap-2 text-red-500 hover:text-red-600 px-3 py-1 rounded-md hover:bg-red-50 transition"
                    >
                      <UserMinus size={18} />
                      Remove
                    </button>
                  </div>
                ))}
              {admins.filter(admin => !admin.isSuperAdmin).length === 0 && (
                <p className="text-gray-500 text-center py-4">No admins created yet</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold text-gray-800">Group Chat</h3>
          <div className="bg-gray-100 p-6 rounded-lg h-96 overflow-y-auto space-y-4">
            {adminFeedback.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No messages in the group chat.</p>
            ) : (
              adminFeedback.map((feedback, index) => (
                <div
                  key={index}
                  className={`flex ${
                    feedback.isSuperAdmin ? 'justify-end' : 'justify-start'
                  } items-start gap-2`}
                >
                  {!feedback.isSuperAdmin && (
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
                  {feedback.isSuperAdmin && (
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-medium text-gray-600 mb-1">
                        You
                      </span>
                      <div className="max-w-xs bg-purple-500 text-white p-3 rounded-lg shadow-md relative">
                        <p>{feedback.message}</p>
                        <div className="absolute -right-2 top-1/2 transform -translate-y-1/2 w-0 h-0 border-t-8 border-t-transparent border-l-8 border-l-purple-500 border-b-8 border-b-transparent"></div>
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
          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Type your message..."
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 px-4 py-2 rounded-lg border-2 border-gray-300 focus:border-purple-500 outline-none"
            />
            <button
              onClick={handleSendMessage}
              className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-8">
          <h3 className="text-xl font-comic mb-4">Admin Requests</h3>
          {adminRequests.length > 0 ? (
            <div className="space-y-4">
              {adminRequests.map((request) => (
                <AdminRequest 
                  key={request._id} 
                  requestData={{
                    id: request._id,
                    name: request.name,
                    password: request.password,
                    occupation: request.occupation,
                    bio:request.bio,
                    phone:request.phone,
                    usernameExists: request.usernameExists,
                  }} 
                  onCreate={handleCreateAdminRequest} 
                  onDecline={handleDeclineAdminRequest} 
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No pending admin requests.</p>
          )}
        </div>
      )}
    </div>
  );
}