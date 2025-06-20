// AuthService.js
// This service handles authentication-related operations

const API_BASE_URL = 'http://localhost:5000';

/**
 * Logs in a user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Response with userId and username if successful
 */
export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Login failed');
    }

    const data = await response.json();
    
    // Store user info in localStorage for persistence
    if (data.success) {
      localStorage.setItem('userId', data.userId);
      localStorage.setItem('username', data.username);
      
      // Dispatch event to notify components of login
      const event = new CustomEvent('user-signed-in', { detail: data });
      window.dispatchEvent(event);
    }
    
    return data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

/**
 * Logs out the current user
 */
export const logout = () => {
  localStorage.removeItem('userId');
  localStorage.removeItem('username');
  
  // Dispatch event to notify components of logout
  const event = new CustomEvent('user-signed-out');
  window.dispatchEvent(event);
};

/**
 * Checks if a user is currently logged in
 * @returns {boolean} - True if user is logged in
 */
export const isLoggedIn = () => {
  return !!localStorage.getItem('userId');
};

/**
 * Gets the current user's ID
 * @returns {string|null} - User ID if logged in, null otherwise
 */
export const getCurrentUserId = () => {
  return localStorage.getItem('userId');
};

/**
 * Gets the current username
 * @returns {string|null} - Username if logged in, null otherwise
 */
export const getCurrentUsername = () => {
  return localStorage.getItem('username');
};

// Export as a default object
const AuthService = {
  login,
  logout,
  isLoggedIn,
  getCurrentUserId,
  getCurrentUsername
};

export default AuthService; 