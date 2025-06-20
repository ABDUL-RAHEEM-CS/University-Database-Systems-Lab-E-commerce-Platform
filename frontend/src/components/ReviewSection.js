import React, { useState, useEffect, useCallback } from 'react';
import { showToast } from '../Toast';
import './ReviewSection.css';

const ReviewSection = ({ productId, userId, productData }) => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userReview, setUserReview] = useState(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newReview, setNewReview] = useState({
    rating: 5,
    reviewText: ''
  });
  const [currentProductRating, setCurrentProductRating] = useState(0);
  const [currentReviewCount, setCurrentReviewCount] = useState(0);

  // Function to fetch latest product data
  const fetchLatestProductData = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:5000/products/${productId}`);
      if (response.ok) {
        const updatedProduct = await response.json();
        setCurrentProductRating(parseFloat(updatedProduct.rating) || 0);
        setCurrentReviewCount(parseInt(updatedProduct.review_count) || 0);
      }
    } catch (error) {
      console.error('Error fetching latest product data:', error);
      // Fall back to productData if provided
      if (productData) {
        setCurrentProductRating(parseFloat(productData.rating) || 0);
        setCurrentReviewCount(parseInt(productData.review_count) || 0);
      }
    }
  }, [productId, productData]);

  // Define fetchReviews with useCallback to avoid dependency cycle
  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/reviews/product/${productId}`);
      
      // Check if response is ok before trying to parse JSON
      if (!response.ok) {
        console.error('Error fetching reviews:', response.status, response.statusText);
        setReviews([]);
        return;
      }
      
      const data = await response.json();
      
      setReviews(data);
      
      // Check if user has already reviewed this product
      if (userId) {
        const userReviewData = data.find(review => review.user_id === parseInt(userId));
        if (userReviewData) {
          setUserReview(userReviewData);
          setNewReview({
            rating: userReviewData.rating,
            reviewText: userReviewData.review_text || ''
          });
        } else {
          setUserReview(null);
        }
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      // Don't show error toast to avoid distracting user experience
      // Just set empty reviews instead
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, [productId, userId]);

  // Initialize product rating data from props or fetch latest
  useEffect(() => {
    if (productData) {
      setCurrentProductRating(parseFloat(productData.rating) || 0);
      setCurrentReviewCount(parseInt(productData.review_count) || 0);
    }
    // Always fetch latest product data to ensure accuracy
    fetchLatestProductData();
  }, [productData, fetchLatestProductData]);

  // Fetch reviews when component mounts or productId changes
  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId, fetchReviews]);

  // Check if user has purchased this product
  useEffect(() => {
    if (userId && productId) {
      checkUserPurchase();
    }
  }, [userId, productId]);

  const checkUserPurchase = async () => {
    try {
      // For demonstration purposes, always allow users to review products
      // In a production environment, you would check if the user has purchased the product
      setShowReviewForm(true);
      
      /* Commented out actual fetch until backend endpoint is properly set up
      // Check if user has purchased this product
      const response = await fetch(`http://localhost:5000/orders/user/${userId}/product/${productId}`);
      
      // Handle non-OK responses
      if (!response.ok) {
        console.error('Error checking purchase history:', response.status, response.statusText);
        return;
      }
      
      const data = await response.json();
      
      // If user has purchased this product, show review form option
      if (data.hasPurchased) {
        setShowReviewForm(true);
      }
      */
    } catch (error) {
      console.error('Error checking purchase history:', error);
      // Fail silently - don't show an error to the user
      // For demo purposes, always show the review form
      setShowReviewForm(true);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewReview({
      ...newReview,
      [name]: name === 'rating' ? parseInt(value) : value
    });
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    
    if (!userId) {
      showToast('Please log in to add a review', 'warning');
      return;
    }
    
    try {
      const response = await fetch('http://localhost:5000/reviews/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: parseInt(userId),
          productId: parseInt(productId),
          rating: newReview.rating,
          reviewText: newReview.reviewText.trim()
        })
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        console.error('Error submitting review:', response.status, response.statusText);
        showToast('Failed to submit review', 'error');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        showToast(userReview ? 'Review updated successfully' : 'Review added successfully', 'success');
        // Refresh reviews
        fetchReviews();
        // Fetch latest product data to update rating display
        fetchLatestProductData();
        
        // Dispatch event to notify other components that reviews have been updated
        const event = new CustomEvent('reviews-updated', {
          detail: {
            productId: productId,
            action: userReview ? 'updated' : 'added'
          }
        });
        window.dispatchEvent(event);
      } else {
        showToast(data.error || 'Failed to submit review', 'error');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      showToast('Error connecting to server', 'error');
    }
  };

  const handleDeleteReview = async () => {
    if (!userReview || !userReview.review_id) return;
    
    try {
      const response = await fetch(`http://localhost:5000/reviews/${userReview.review_id}`, {
        method: 'DELETE'
      });
      
      // Handle non-OK responses
      if (!response.ok) {
        console.error('Error deleting review:', response.status, response.statusText);
        showToast('Failed to delete review', 'error');
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        showToast('Review deleted successfully', 'success');
        setUserReview(null);
        setNewReview({
          rating: 5,
          reviewText: ''
        });
        fetchReviews();
        // Fetch latest product data to update rating display
        fetchLatestProductData();
        
        // Dispatch event to notify other components that a review has been deleted
        const event = new CustomEvent('reviews-updated', {
          detail: {
            productId: productId,
            action: 'deleted'
          }
        });
        window.dispatchEvent(event);
      } else {
        showToast(data.error || 'Failed to delete review', 'error');
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      showToast('Error connecting to server', 'error');
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Render stars for a given rating
  const renderStars = (rating) => {
    return (
      <div className="review-stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={star <= rating ? 'star filled' : 'star'}>
            {star <= rating ? '★' : '☆'}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="review-section">
      <h3 className="review-section-title">Customer Reviews</h3>
      
      {loading ? (
        <p className="loading-message">Loading reviews...</p>
      ) : (
        <>
          <div className="review-summary">
            <div className="rating-overview">
              <div className="average-rating">
                <span className="rating-number">
                  {currentProductRating.toFixed(1)}
                </span>
                <span className="rating-max">/ 5</span>
              </div>
              {renderStars(Math.round(currentProductRating))}
              <div className="rating-count">
                Based on {currentReviewCount} {currentReviewCount === 1 ? 'review' : 'reviews'}
              </div>
            </div>
          </div>
          
          {userId && showReviewForm && (
            <div className="review-form-container">
              <h4>{userReview ? 'Update Your Review' : 'Write a Review'}</h4>
              <form onSubmit={handleSubmitReview} className="review-form">
                <div className="rating-selector">
                  <label>Your Rating:</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map(star => (
                      <label key={star} className="star-label">
                        <input
                          type="radio"
                          name="rating"
                          value={star}
                          checked={newReview.rating === star}
                          onChange={handleInputChange}
                        />
                        <span className={star <= newReview.rating ? 'star filled' : 'star'}>
                          {star <= newReview.rating ? '★' : '☆'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div className="review-text-input">
                  <label htmlFor="reviewText">Your Review:</label>
                  <textarea
                    id="reviewText"
                    name="reviewText"
                    rows="4"
                    value={newReview.reviewText}
                    onChange={handleInputChange}
                    placeholder="Share your experience with this product..."
                  ></textarea>
                </div>
                
                <div className="review-form-actions">
                  <button type="submit" className="submit-review-btn">
                    {userReview ? 'Update Review' : 'Submit Review'}
                  </button>
                  
                  {userReview && (
                    <button 
                      type="button" 
                      className="delete-review-btn"
                      onClick={handleDeleteReview}
                    >
                      Delete Review
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}
          
          <div className="reviews-list">
            {reviews.length > 0 ? (
              reviews.map(review => (
                <div key={review.review_id} className="review-item">
                  <div className="review-header">
                    <div className="reviewer-name">{review.user_name}</div>
                    <div className="review-date">{formatDate(review.created_at)}</div>
                  </div>
                  <div className="review-rating">
                    {renderStars(review.rating)}
                  </div>
                  {review.review_text && (
                    <div className="review-text">{review.review_text}</div>
                  )}
                </div>
              ))
            ) : (
              <p className="no-reviews">No reviews yet. Be the first to review this product!</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ReviewSection; 