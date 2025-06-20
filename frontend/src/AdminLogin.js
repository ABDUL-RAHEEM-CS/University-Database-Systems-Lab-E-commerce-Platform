import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './login.css';
import './AdminLogin.css'; // Additional admin-specific styles
import { showToast } from './Toast';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showToast("Please enter both email and password", "warning");
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await fetch('http://localhost:5000/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        showToast(`Welcome, Admin ${data.adminName}!`, 'success');
        
        // Store admin info in localStorage with specific keys to distinguish from regular users
        localStorage.setItem('adminId', data.adminId);
        localStorage.setItem('adminName', data.adminName);
        localStorage.setItem('isAdmin', 'true');
        
        // Dispatch event to notify other components
        window.dispatchEvent(new Event('admin-signed-in'));
        
        // Redirect to admin dashboard
        navigate('/admin');
      } else {
        showToast(data.error || 'Invalid admin credentials', 'error');
      }
    } catch (error) {
      showToast('Error connecting to server', 'error');
      console.error('Admin Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="admin-login-container">
      <div className="admin-login-card">
        <div className="admin-logo">
          <div className="logo-icon">KM</div>
          <h3>Khokhar Mart</h3>
        </div>
        
        <div className="admin-badge">
          <i className="lock-icon">🔒</i>
          <span>Admin Portal</span>
        </div>
        
        <h2>Administrator Login</h2>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="admin-email">Email</label>
            <input
              id="admin-email"
              type="email"
              placeholder="Enter admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="input-group">
            <label htmlFor="admin-password">Password</label>
            <input
              id="admin-password"
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="admin-login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Authenticating...' : 'Login as Administrator'}
          </button>
        </form>
        
        <div className="admin-login-footer">
          <div className="login-options">
            <span>Not an admin?</span>
            <Link to="/login" className="user-login-link">Login as User</Link>
          </div>
          
          <div className="back-to-home">
            <Link to="/">Back to Home</Link>
          </div>
          
          <div className="admin-security-notice">
            <p>This area is restricted to authorized personnel only.</p>
            <p>Unauthorized access attempts may be logged and reported.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin; 