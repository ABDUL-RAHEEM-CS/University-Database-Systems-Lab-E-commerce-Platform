import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './navbar.css';
import { showToast } from './Toast';
import CartService from './services/CartService';

function NavBar() {
  const [userId, setUserId] = useState(localStorage.getItem('userId') || "");
  const [userName, setUserName] = useState(localStorage.getItem('userName') || "");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartAnimating, setCartAnimating] = useState(false);
  const navigate = useNavigate();

  const fetchCartCount = async () => {
    const userId = localStorage.getItem("userId");
    if (userId) {
      try {
        const cart = await CartService.fetchCart(userId);
        setCartCount(cart.count);
      } catch (error) {
        console.error("Error fetching cart count:", error);
      }
    }
  };

  const handleCartUpdate = useCallback((event) => {
    // Either increment by a specific amount or refresh cart count
    if (event.detail && event.detail.action === 'increment') {
      setCartCount(prevCount => prevCount + (event.detail.amount || 1));
      
      // Animate cart when adding items
      setCartAnimating(true);
      setTimeout(() => setCartAnimating(false), 800); // Animation duration
      
    } else {
      // Refresh the entire cart count
      const userId = localStorage.getItem('userId');
      if (userId) {
        fetchCartCount(userId);
      }
    }
  }, []);

  const handleUserLogin = useCallback((event) => {
    if (event.detail) {
      const { userId, userName } = event.detail;
      console.log("NavBar received login event:", { userId, userName });
      
      if (userId) {
        setUserId(userId);
        setUserName(userName || "");
        
        // Fetch cart count for the logged-in user
        fetchCartCount(userId);
      }
    }
  }, []);

  // Admin sign-in handler
  const handleAdminSignIn = useCallback(() => {
    console.log("Admin signed in");
    setIsAdmin(true);
  }, []);

  // Admin sign-out handler
  const handleAdminSignOut = useCallback(() => {
    console.log("Admin signed out");
    setIsAdmin(false);
    setUserId("");
    setUserName("");
    setCartCount(0);
  }, []);

  useEffect(() => {
    // Update user info when local storage changes
    const storedUserId = localStorage.getItem('userId');
    const storedUserName = localStorage.getItem('userName');
    const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';
    
    console.log("NavBar checking localStorage:", { storedUserId, storedUserName, storedIsAdmin });
    
    setIsAdmin(storedIsAdmin);
    
    if (storedUserId) {
      setUserId(storedUserId);
      setUserName(storedUserName || "");
      
      // Fetch cart count if user is logged in and not admin
      if (!storedIsAdmin) {
        fetchCartCount(storedUserId);
      }
    }

    // Listen for cart updates
    window.addEventListener('cart-updated', handleCartUpdate);
    
    // Listen for user login event
    window.addEventListener('user-logged-in', handleUserLogin);
    
    // Listen for admin sign-in event
    window.addEventListener('admin-signed-in', handleAdminSignIn);
    
    // Listen for admin sign-out event
    window.addEventListener('admin-signed-out', handleAdminSignOut);
    
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('user-logged-in', handleUserLogin);
      window.removeEventListener('admin-signed-in', handleAdminSignIn);
      window.removeEventListener('admin-signed-out', handleAdminSignOut);
    };
  }, [handleCartUpdate, handleUserLogin, handleAdminSignIn, handleAdminSignOut]);

  const handleSignOut = () => {
    // Clear all auth data
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminName');
    localStorage.removeItem('isAdmin');
    
    setUserId("");
    setUserName("");
    setIsAdmin(false);
    setCartCount(0);
    
    // Also dispatch an event to notify other components
    const event = new CustomEvent('user-signed-out');
    window.dispatchEvent(event);
    
    navigate('/');
    
    showToast("You have been signed out", "info");
  };
  
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Dispatch search event for Home component to handle
      const searchEvent = new CustomEvent('product-search', {
        detail: { query: searchQuery.trim() }
      });
      window.dispatchEvent(searchEvent);
      
      // Navigate to home to show search results
      navigate('/');
    }
  };

  const handleCartClick = () => {
    if (!userId) {
      showToast("Please log in to view your cart", "info");
    }
  };

  // Add a function to handle the logo click
  const handleLogoClick = (e) => {
    // Prevent default link behavior
    e.preventDefault();
    
    // Reset search query
    setSearchQuery("");
    
    // Dispatch an event to reset search in the Home component
    const resetEvent = new CustomEvent('reset-product-search');
    window.dispatchEvent(resetEvent);
    
    // Navigate to home or admin dashboard based on role
    if (isAdmin) {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  return (
    <div className="navbar-container">
      <div className="brand-container">
        <Link to={isAdmin ? "/admin" : "/"} className="brand-link" onClick={handleLogoClick}>
          <div className="logo-container">
            <span className="logo-icon">KM</span>
            <span className="logo-text">Khokhar Mart</span>
          </div>
        </Link>
      </div>

      {/* Only show search bar for regular users, not for admins */}
      {!isAdmin && (
        <div className="search-container">
          <form onSubmit={handleSearchSubmit}>
            <input 
              type="text" 
              placeholder="Search in Khokhar Mart" 
              className="search-input" 
              value={searchQuery}
              onChange={handleSearchChange}
            />
            <button type="submit" className="search-button">
              <i className="search-icon">🔍</i>
            </button>
          </form>
        </div>
      )}

      <div className="nav-actions">
        {/* Only show cart for regular users, not for admins */}
        {!isAdmin && (
          <div className="cart-container">
            {userId ? (
              <Link to={`/cart/${userId}`} className="cart-link">
                <div className={`cart-button ${cartAnimating ? 'cart-animate' : ''}`}>
                  <i className="cart-icon">🛒</i>
                  {cartCount > 0 && (
                    <span className="cart-badge">{cartCount}</span>
                  )}
                </div>
              </Link>
            ) : (
              <span 
                onClick={handleCartClick} 
                className="cart-link"
                style={{cursor: 'pointer'}}
              >
                <div className="cart-button">
                  <i className="cart-icon">🛒</i>
                </div>
              </span>
            )}
          </div>
        )}

        <div className="auth-container">
          {isAdmin ? (
            <div className="user-menu admin-menu">
              <span className="username admin-username">{localStorage.getItem('adminName') || "Admin"}</span>
              <button 
                onClick={handleSignOut}
                className="signout-button"
              >
                Sign Out
              </button>
            </div>
          ) : userId ? (
            <div className="user-menu">
              <span className="username">{userName || "Customer"}</span>
              <button 
                onClick={handleSignOut}
                className="signout-button"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="login-buttons">
              <Link to="/login" className="login-button">Login</Link>
              <Link to="/signup" className="signup-button">Signup</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NavBar; 