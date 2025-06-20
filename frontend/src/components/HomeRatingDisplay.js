import React from 'react';
import '../styles/HomeRating.css';

const HomeRatingDisplay = ({ rating, reviewCount }) => {
  // Ensure rating is a valid number
  const numericRating = parseFloat(rating) || 0;
  const numericReviewCount = parseInt(reviewCount) || 0;
  
  // Create array of 5 stars with their fill percentages
  const getStarFillPercentage = (starIndex) => {
    const starValue = starIndex + 1;
    
    if (numericRating >= starValue) {
      // Star should be completely filled
      return 100;
    } else if (numericRating > starIndex) {
      // Star should be partially filled
      const fillPercentage = ((numericRating - starIndex) * 100);
      return Math.max(0, Math.min(100, fillPercentage));
    } else {
      // Star should be empty
      return 0;
    }
  };

  const renderStar = (index) => {
    const fillPercentage = getStarFillPercentage(index);
    
    return (
      <div key={index} className="home-star-container">
        {/* Background star (empty) */}
        <span className="home-star-bg">★</span>
        {/* Filled star with width based on percentage */}
        <span 
          className="home-star-fill" 
          style={{ width: `${fillPercentage}%` }}
        >
          ★
        </span>
      </div>
    );
  };

  return (
    <div className="home-rating-display">
      <div className="home-rating-stars">
        {Array.from({ length: 5 }, (_, index) => renderStar(index))}
      </div>
      <div className="home-rating-info">
        <span className="home-rating-number">
          {numericRating > 0 ? numericRating.toFixed(1) : "0.0"}
        </span>
        <span className="home-review-count">
          {numericReviewCount} {numericReviewCount === 1 ? 'review' : 'reviews'}
        </span>
      </div>
    </div>
  );
};

export default HomeRatingDisplay; 