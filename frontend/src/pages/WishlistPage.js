import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../NavBar';
import { showToast } from '../Toast';
import { Helmet } from 'react-helmet';

import './WishlistPage.css';

const WishlistPage = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        if (!userId) {
          setError('Please login to view your wishlist');
          setLoading(false);
          return;
        }
        
        const response = await fetch(`http://localhost:5000/wishlist/${userId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch wishlist');
        }
        
        const data = await response.json();
        setWishlistItems(data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchWishlist();
  }, [userId]);

  const removeFromWishlist = async (itemId) => {
    try {
      const response = await fetch(`http://localhost:5000/wishlist/user/${userId}/product/${itemId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove item from wishlist');
      }
      
      setWishlistItems(wishlistItems.filter(item => item.id !== itemId));
    } catch (err) {
      setError(err.message);
    }
  };

  const addToCart = async (item) => {
    try {
      const response = await fetch('http://localhost:5000/cart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          productId: item.id,
          quantity: 1,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add item to cart');
      }
      
      showToast('Item added to cart!', 'success');
    } catch (err) {
      setError(err.message);
      showToast('Failed to add item to cart', 'error');
    }
  };

  if (loading) {
    return (
      <div className="wishlist-page">
        <Helmet>
          <title>Your Wishlist | Khokhar Mart</title>
          <meta name="description" content="View and manage your wishlist items" />
        </Helmet>
        <div className="wishlist-loading">
          <div className="loading-spinner"></div>
          <p>Loading your wishlist...</p>
        </div>
      </div>
    );
  }
  
  if (error && error.includes('login')) {
    return (
      <div className="wishlist-page">
        <Helmet>
          <title>Your Wishlist | Khokhar Mart</title>
          <meta name="description" content="View and manage your wishlist items" />
        </Helmet>
        <div className="wishlist-empty">
          <h2>Please Log In</h2>
          <p>You need to be logged in to view your wishlist</p>
          <Link to="/login" className="shop-now-btn">Log In Now</Link>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="wishlist-page">
        <Helmet>
          <title>Your Wishlist | Khokhar Mart</title>
          <meta name="description" content="View and manage your wishlist items" />
        </Helmet>
        <div className="wishlist-empty">
          <h2>Oops! Something went wrong</h2>
          <p>{error}</p>
          <Link to="/" className="shop-now-btn">Return to Home</Link>
        </div>
      </div>
    );
  }
  
  if (wishlistItems.length === 0) {
    return (
      <div className="wishlist-page">
        <Helmet>
          <title>Your Wishlist | Khokhar Mart</title>
          <meta name="description" content="View and manage your wishlist items" />
        </Helmet>
        <div className="wishlist-container">
          <h1>Your Wishlist</h1>
          <div className="wishlist-empty">
            <h2>Your wishlist is empty</h2>
            <p>Add items to your wishlist to save them for later</p>
            <Link to="/" className="shop-now-btn">Shop Now</Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="wishlist-page">
      <Helmet>
        <title>Your Wishlist | Khokhar Mart</title>
        <meta name="description" content="View and manage your wishlist items" />
      </Helmet>
      <Navbar />
      <div className="wishlist-container">
        <h1>Your Wishlist</h1>
        <div className="wishlist-items">
          {wishlistItems.map((item) => (
            <div key={item.id} className="wishlist-item">
              <div className="wishlist-item-image">
                <img src={item.image_url || '/placeholder-image.jpg'} alt={item.product_name} />
              </div>
              <div className="wishlist-item-details">
                <h3>{item.product_name}</h3>
                <p className="wishlist-item-price">Rs. {item.price.toFixed(2)}</p>
                <div className="wishlist-item-actions">
                  <button 
                    className="add-to-cart-btn" 
                    onClick={() => addToCart(item)}
                  >
                    Add to Cart
                  </button>
                  <button 
                    className="remove-wishlist-btn" 
                    onClick={() => removeFromWishlist(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WishlistPage; 