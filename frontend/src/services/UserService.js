// UserService.js
// This service handles user authentication and data operations

const API_BASE_URL = 'http://localhost:5000';

/**
 * Logs in a user with the given credentials
 */
export const login = async (email, password) => {
  try {
    console.log(`Attempting login for: ${email}`);
    
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    console.log(`Login response status: ${response.status} ${response.statusText}`);
    
    // Get response as text first to check if it's valid JSON
    const responseText = await response.text();
    console.log(`Raw response text: ${responseText.substring(0, 150)}`);
    
    // Check if we have a response before trying to parse
    if (!responseText.trim()) {
      console.error('Empty response from server');
      return { 
        success: false, 
        error: 'Empty response from server' 
      };
    }
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed response data:', data);
    } catch (parseError) {
      console.error('Error parsing login response:', parseError);
      return { 
        success: false, 
        error: 'Invalid response from server' 
      };
    }
    
    if (!response.ok) {
      console.error('Response not OK:', data);
      return { 
        success: false, 
        error: data.error || 'Login failed' 
      };
    }
    
    // Normalized response handling - support both formats
    // The response uses user_id and name
    console.log('Login successful, returning data:', data);
    return { 
      success: true,
      userId: data.userId || data.user_id,
      username: data.username || data.name,
    };
  } catch (error) {
    console.error('Login error:', error);
    return { 
      success: false, 
      error: 'Failed to connect to server' 
    };
  }
};

/**
 * Signs up a new user
 */
export const signup = async (userData) => {
  try {
    // Adapt field names to match what the server expects
    const adaptedData = {
      name: userData.name || userData.username,
      email: userData.email,
      password: userData.password,
      street_no: parseInt(userData.street_no) || 1,
      house_no: parseInt(userData.house_no) || 1,
      block_name: userData.block_name || userData.address,
      society: userData.society || '',
      city: userData.city || 'Unknown',
      country: userData.country || 'Unknown',
      phone: userData.phone,
    };

    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(adaptedData),
    });
    
    // Get response as text first to check if it's valid JSON
    const responseText = await response.text();
    
    // Check if we have a response before trying to parse
    if (!responseText.trim()) {
      return { 
        success: false, 
        error: 'Empty response from server' 
      };
    }
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing signup response:', parseError);
      return { 
        success: false, 
        error: 'Invalid response from server' 
      };
    }
    
    if (!response.ok) {
      return { 
        success: false, 
        error: data.error || 'Signup failed' 
      };
    }
    
    return { 
      success: true,
      userId: data.userId || data.user_id,
    };
  } catch (error) {
    console.error('Signup error:', error);
    return { 
      success: false, 
      error: 'Failed to connect to server' 
    };
  }
};

/**
 * Gets user information by ID
 */
export const getUserInfo = async (userId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/user/${userId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user information');
    }
    
    // Get response as text first to check if it's valid JSON
    const responseText = await response.text();
    
    // Check if we have a response before trying to parse
    if (!responseText.trim()) {
      return { 
        success: false, 
        error: 'Empty response from server' 
      };
    }
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing user info response:', parseError);
      return { 
        success: false, 
        error: 'Invalid response from server' 
      };
    }
    
    // Normalized response handling
    return {
      success: true,
      userId: data.user_id,
      username: data.username || data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
    };
  } catch (error) {
    console.error('Error fetching user info:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
};

// Export as a named constant to fix ESLint warning
const userService = {
  login,
  signup,
  getUserInfo,
};

export default userService; 