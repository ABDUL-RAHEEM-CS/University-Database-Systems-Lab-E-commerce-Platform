import React, { useState, useEffect } from 'react';
import { showToast } from '../Toast';
import './WishlistButton.css';

const WishlistButton = ({ productId, userId, size = 'medium' }) => {
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkWishlistStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5000/wishlist/check/${userId}/${productId}`);
        if (!response.ok) {
          throw new Error('Failed to check wishlist status');
        }
        
        const data = await response.json();
        setInWishlist(data.inWishlist);
      } catch (error) {
        console.error('Error checking wishlist status:', error);
        // Silently fail - don't show error to user
      }
    };
    
    if (userId && productId) {
      checkWishlistStatus();
    } else {
      setInWishlist(false);
    }
  }, [userId, productId]);

  const toggleWishlist = async () => {
    if (!userId) {
      showToast('Please sign in to add items to your wishlist', 'warning');
      return;
    }

    setLoading(true);
    try {
      if (inWishlist) {
        // Remove from wishlist
        const response = await fetch(`http://localhost:5000/wishlist/user/${userId}/product/${productId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Failed to remove from wishlist');
        }
        
        const data = await response.json();
        if (data.success) {
          setInWishlist(false);
          showToast('Removed from wishlist', 'success');
        }
      } else {
        // Add to wishlist
        const response = await fetch('http://localhost:5000/wishlist/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId,
            productId
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to add to wishlist');
        }
        
        const data = await response.json();
        if (data.success) {
          setInWishlist(true);
          showToast('Added to wishlist', 'success');
        }
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
      showToast('Error updating wishlist', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      className={`wishlist-button ${size} ${inWishlist ? 'in-wishlist' : ''} ${loading ? 'loading' : ''}`}
      onClick={toggleWishlist}
      disabled={loading}
      aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
      title={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
    >
      {loading ? (
        <span className="loading-indicator">●</span>
      ) : (
        <span className="heart-icon">
          {inWishlist ? '♥' : '♡'}
        </span>
      )}
    </button>
  );
};

export default WishlistButton; 