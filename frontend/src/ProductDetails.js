import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { showToast } from "./Toast";
import { Helmet } from "react-helmet";
import ReviewSection from "./components/ReviewSection";
import CartService from './services/CartService';
import './styles/ProductDetails.css';

function ProductDetails() {
  const { state: product } = useLocation();
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [userName, setUserName] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [cartCount, setCartCount] = useState(0);
  
  // Define fetchCartCount function
  const fetchCartCount = () => {
    if (userId) {
      CartService.fetchCart(userId)
        .then(cart => setCartCount(cart.count))
        .catch(error => console.error("Error fetching cart:", error));
    }
  };

  useEffect(() => {
    const id = localStorage.getItem("userId");
    const name = localStorage.getItem("userName");
    if (id) {
      setUserId(id);
      setUserName(name);
      
      // Fetch cart count
      CartService.fetchCart(id)
        .then(cart => setCartCount(cart.count))
        .catch(error => console.error("Error fetching cart:", error));
    }
    
    // Listen for sign out events
    const handleUserSignOut = () => {
      setUserId(null);
      setUserName("");
      setCartCount(0);
    };
    
    window.addEventListener('user-signed-out', handleUserSignOut);
    
    return () => {
      window.removeEventListener('user-signed-out', handleUserSignOut);
    };
  }, []);

  if (!product) {
    return (
      <div className="product-not-found">
        <p>No product data available.</p>
        <button onClick={() => navigate("/")} className="back-button">Back to Home</button>
      </div>
    );
  }

  // Modified addToCart function to return a promise
  const addToCart = async () => {
    if (!userId) {
      showToast("Please sign in to add items to your cart", "warning");
      navigate("/login");
      return false; // Return false to indicate failure
    }

    try {
      const result = await CartService.addToCart(
        userId,
        product.product_id || product._id,
        quantity
      );

      if (result.success) {
        showToast('Item added to cart successfully!', 'success');
        
        // Dispatch custom event to update cart count in NavBar
        const event = new CustomEvent('cart-updated', {
          detail: {
            action: 'increment',
            amount: quantity
          }
        });
        window.dispatchEvent(event);
        
        // Fetch updated cart count
        fetchCartCount();
        return true; // Return true to indicate success
      } else {
        showToast('Failed to add item to cart', 'error');
        return false; // Return false to indicate failure
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      showToast('Error adding item to cart', 'error');
      return false; // Return false to indicate failure
    }
  };

  // Get the image source (handling different property names)
  const getImageSrc = () => {
    if (product.image) return product.image;
    if (product.product_link) return product.product_link;
    return ""; // Default empty string if no image found
  };

  // Get the product name (handling different property names)
  const getProductName = () => {
    if (product.name) return product.name;
    if (product.product_name) return product.product_name;
    return "Product"; // Default name
  };

  // Get the product description (handling different property names)
  const getProductDescription = () => {
    return product.description || "";
  };

  // Get the product price (handling different property names)
  const getProductPrice = () => {
    const price = product.price || product.discount_price || 0;
    return parseFloat(price).toFixed(2);
  };

  // Get the original price for display if available
  const getOriginalPrice = () => {
    if (product.original_price) return parseFloat(product.original_price).toFixed(2);
    return null;
  };

  // Calculate discount percentage if both prices are available
  const getDiscountPercentage = () => {
    const original = parseFloat(product.original_price || 0);
    const discounted = parseFloat(product.price || product.discount_price || 0);
    
    if (original > 0 && discounted > 0 && original > discounted) {
      return Math.round(((original - discounted) / original) * 100);
    }
    return null;
  };

  return (
    <div className="product-details-container">
      <Helmet>
        <title>{getProductName()} - Khokhar Mart</title>
        <meta name="description" content={getProductDescription().substring(0, 160)} />
      </Helmet>
      
      <div className="product-details-content">
        <div className="product-image-container">
          <img 
            src={getImageSrc()} 
            alt={getProductName()} 
            className="product-detail-image" 
          />
        </div>
        
        <div className="product-info">
          <h1 className="product-title">{getProductName()}</h1>
          
          <div className="product-price">
            <div className="current-price">
              <span className="currency">Rs.</span>
              <span className="amount">{getProductPrice()}</span>
            </div>
            
            {getOriginalPrice() && (
              <div className="original-price">
                <span className="currency">Rs.</span>
                <span className="strike-through">{getOriginalPrice()}</span>
              </div>
            )}
            
            {getDiscountPercentage() && (
              <div className="discount-badge">
                {getDiscountPercentage()}% OFF
              </div>
            )}
          </div>
          
          <div className="product-description">
            <h3>Description</h3>
            <p>{getProductDescription()}</p>
          </div>
          
          <div className="quantity-control">
            <label className="quantity-label">Quantity:</label>
            <div className="quantity-selector">
              <button 
                className="quantity-btn decrease"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="quantity-display">{quantity}</span>
              <button 
                className="quantity-btn increase"
                onClick={() => setQuantity(quantity + 1)}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
          
          <div className="purchase-section">
            <div className="action-buttons">
              <button 
                className="btn btn-add-to-cart"
                onClick={addToCart}
              >
                <i className="cart-icon">🛒</i>
                Add to Cart
              </button>
              
              <button 
                className="btn btn-buy-now"
                onClick={async () => {
                  const success = await addToCart();
                  if (success && userId) {
                    navigate(`/cart/${userId}`);
                  }
                }}
              >
                <i className="buy-icon">⚡</i>
                Buy Now
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add the review section */}
      <ReviewSection 
        productId={product.product_id || product._id || product.id || '0'} 
        userId={userId}
        productData={product}
      />
    </div>
  );
}

export default ProductDetails;