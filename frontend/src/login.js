import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './login.css';
import { showToast } from './Toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch('http://localhost:5000/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        showToast(`Welcome back, ${data.username}!`, 'success');
        
        // Store user info in localStorage
        localStorage.setItem('userId', data.userId);
        localStorage.setItem('username', data.username);
        
        // Dispatch event to notify other components
        window.dispatchEvent(new Event('user-signed-in'));
        
        // Redirect to home page
        navigate('/');
      } else {
        showToast(data.error || 'Invalid email or password', 'error');
      }
    } catch (error) {
      showToast('Error connecting to server', 'error');
      console.error('Login error:', error);
    }
  };

  const handleAdminLogin = () => {
    navigate('/admin/login');
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Enter Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="login-btn">
          Login
        </button>
      </form>
      
      <p className="signup-link">
        Don't have an Account? <Link to="/signup">Sign Up</Link>
      </p>
      
      <div className="login-options">
        <p>Login as <button onClick={handleAdminLogin} className="admin-login-link">Admin</button></p>
      </div>
      
      <div className="back-to-home">
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  );
};

export default Login;
