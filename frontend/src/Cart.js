import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useParams } from "react-router-dom";
import './cart.css';
import { showToast } from "./Toast";
import PaymentOptions from './components/PaymentOptions';
import CartService from './services/CartService';
import VoucherService from './services/VoucherService';

function Cart() {
  const navigate = useNavigate();
  const { userId } = useParams();
  const [cartItems, setCartItems] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [error, setError] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showVouchers, setShowVouchers] = useState(false);
  const [vouchers, setVouchers] = useState([]);
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingVoucher, setPendingVoucher] = useState(null);
  const [showPaymentOptions, setShowPaymentOptions] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cod'); // Default to COD
  const [successfulOrder, setSuccessfulOrder] = useState(null);
  const [cartOperationError, setCartOperationError] = useState(null);
  const [voucherDiscountAmount, setVoucherDiscountAmount] = useState(0);

  const fetchCartItems = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!userId) {
        console.error("No userId found in fetchCartItems");
        setCartItems([]);
        setLoading(false);
        return;
      }

      console.log(`Fetching cart items for user: ${userId}`);
      const cartData = await CartService.fetchCart(userId);
      
      if (cartData && cartData.items) {
        console.log(`Received ${cartData.items.length} cart items`);
        setCartItems(cartData.items);
        
        let total = 0;
        cartData.items.forEach(item => {
          const price = item.discount_price || item.price;
          total += price * item.quantity;
        });
        setCartTotal(total);
        } else {
        console.log("No cart items found or empty cart");
        setCartItems([]);
        setCartTotal(0);
        }
      } catch (error) {
        console.error("Error fetching cart items:", error);
      showToast("Failed to load cart items", "error");
      setCartItems([]);
      setCartTotal(0);
      } finally {
        setLoading(false);
      }
  }, [userId]);

  useEffect(() => {
    fetchCartItems();

    const handleUserSignOut = () => {
      setCartItems([]);
      setSelectedItems([]);
      setSelectAll(false);
      setError(null);
    };

    window.addEventListener('user-signed-out', handleUserSignOut);

    return () => {
      window.removeEventListener('user-signed-out', handleUserSignOut);
    };
  }, [fetchCartItems]);

  // Add debug effect to log cart item IDs and their types to help diagnose issues
  useEffect(() => {
    if (cartItems && cartItems.length > 0) {
      console.group('[Cart] Cart Items Debug Info');
      console.log(`Total cart items: ${cartItems.length}`);
      
      cartItems.forEach((item, index) => {
        console.log(`Item #${index + 1}:`, {
          cart_item_id: item.cart_item_id,
          type: typeof item.cart_item_id,
          isNumber: !isNaN(parseInt(item.cart_item_id)),
          parsed: parseInt(item.cart_item_id)
        });
      });
      
      console.groupEnd();
    }
  }, [cartItems]);

  useEffect(() => {
    if (cartItems.length > 0) {
      const allItemIds = cartItems.map(item => item.cart_item_id);
      setSelectedItems(allItemIds);
      setSelectAll(true);
    }
  }, [cartItems]);

  const handleSelectItem = (itemId) => {
    if (selectedItems.includes(itemId)) {
      setSelectedItems(selectedItems.filter(id => id !== itemId));
      setSelectAll(false);
    } else {
      setSelectedItems([...selectedItems, itemId]);
      if (selectedItems.length + 1 === cartItems.length) {
        setSelectAll(true);
      }
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map(item => item.cart_item_id));
    }
    setSelectAll(!selectAll);
  };

  const verifyCartUpdate = async (itemId, expectedQuantity) => {
    try {
      console.log(`[Cart] Verifying cart item ${itemId} update...`);

      // Fetch the cart again to verify the update
      const cartData = await CartService.fetchCart(userId);
      
      if (!cartData || !cartData.items || cartData.items.length === 0) {
        console.error(`[Cart] Cart is empty after update - cannot verify item ${itemId}`);
        return false;
      }
      
      // Find the item in the updated cart
      const updatedItem = cartData.items.find(item => item.cart_item_id === itemId);
      
      if (!updatedItem) {
        console.error(`[Cart] Item ${itemId} not found in cart after update`);
        return false;
      }
      
      // Check if the quantity matches what we expect
      if (updatedItem.quantity !== expectedQuantity) {
        console.error(`[Cart] Quantity mismatch: expected ${expectedQuantity}, got ${updatedItem.quantity}`);
        return false;
      }
      
      console.log(`[Cart] Item ${itemId} update verified successfully`);
      return true;
    } catch (error) {
      console.error(`[Cart] Error verifying cart update:`, error);
      return false;
    }
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 0) return;

    setCartOperationError(null);
    
    try {
      console.group(`[Cart] Updating cart item ${itemId} to quantity ${newQuantity}`);
      
      const cartItemIndex = cartItems.findIndex(item => item.cart_item_id === itemId);
      if (cartItemIndex === -1) {
        console.error(`[Cart] Cannot find cart item with ID ${itemId}`);
        showToast("Error: Item not found in cart", "error");
        console.groupEnd();
        return;
      }

      const originalQuantity = cartItems[cartItemIndex].quantity;
      console.log(`[Cart] Original quantity: ${originalQuantity}, new quantity: ${newQuantity}`);
      
      // Log the actual cart_item_id value and its type to help diagnose issues
      console.log(`[Cart] cart_item_id = ${itemId} (${typeof itemId})`);
      
      // Optimistically update the UI
      if (newQuantity === 0) {
        console.log(`[Cart] Removing item with ID ${itemId} from cart UI`);
        setCartItems(prevItems => prevItems.filter(item => item.cart_item_id !== itemId));
        setSelectedItems(prevSelected => prevSelected.filter(id => id !== itemId));
      } else {
        console.log(`[Cart] Updating quantity in UI for item ID ${itemId} to ${newQuantity}`);
        setCartItems(prevItems =>
          prevItems.map(item =>
            item.cart_item_id === itemId
              ? { ...item, quantity: newQuantity }
              : item
          )
        );
      }

      // Try the simplified cart update method first
      console.log(`[Cart] Trying simplified cart update for item ID ${itemId}, quantity ${newQuantity}`);
      const simpleResult = await CartService.simpleCartUpdate(
        userId,
        itemId,
        newQuantity
      );
      
      console.log(`[Cart] Simple update result:`, simpleResult);
      
      if (simpleResult.success) {
        console.log(`[Cart] Simple update succeeded!`);
        
        if (newQuantity === 0) {
          showToast("Item removed from cart", "success");
      } else {
          showToast(`Quantity updated to ${newQuantity}`, "success");
        }
        
        calculateCartTotal();
        console.groupEnd();
        return;
      }
      
      console.warn(`[Cart] Simple update failed:`, simpleResult.error);
      console.log(`[Cart] Falling back to standard update method`);

      // Fall back to the standard update method
      const result = await CartService.updateCartItemQuantity(
        userId,
        itemId,
        newQuantity
      );

      console.log(`[Cart] Standard update result:`, result);

      if (!result.success) {
        console.error(`[Cart] Standard update failed: ${result.error}`);
        
        // Try alternative method as a last resort
        console.log('[Cart] Trying alternative update method as last resort');
        const altResult = await CartService.updateCartItemQuantityAlternative(
          userId,
          itemId,
          newQuantity
        );
        
        if (altResult.success) {
          console.log('[Cart] Alternative update method succeeded!');
          
          if (newQuantity === 0) {
            showToast("Item removed from cart", "success");
          } else {
            showToast(`Quantity updated to ${newQuantity}`, "success");
          }
          
          calculateCartTotal();
          console.groupEnd();
      return;
    }

        console.error('[Cart] All update methods failed. Last error:', altResult.error);
        
        const errorStatus = result.statusCode || 0;
        console.log(`[Cart] Error status code: ${errorStatus}`);
        
        let errorMessage = result.error || 'An unknown error occurred';
        
        // Add more specific error messages based on status codes
        if (errorStatus === 404) {
          errorMessage = "Item not found in cart on the server";
        } else if (errorStatus === 500) {
          errorMessage = "Server error while updating cart";
        } else if (errorStatus === 0) {
          errorMessage = "Network error - couldn't connect to server";
        }
        
        // Display a more user-friendly error message
        showToast(`Error: ${errorMessage}`, "error");
        
        // Revert back to original state in case of error
        if (originalQuantity === 0) {
          // This shouldn't happen normally as you can't update a non-existent item
          console.log(`[Cart] Reverting UI changes not needed for non-existent item`);
        } else if (newQuantity === 0) {
          // Failed to delete - add back to cart
          console.log(`[Cart] Adding back item that failed to delete`);
          setCartItems(prevItems => [
            ...prevItems.filter(item => item.cart_item_id !== itemId),
            cartItems[cartItemIndex]
          ]);
        } else {
          // Failed to update quantity - revert to original
          console.log(`[Cart] Reverting quantity back to ${originalQuantity}`);
          setCartItems(prevItems =>
            prevItems.map(item =>
              item.cart_item_id === itemId
                ? { ...item, quantity: originalQuantity }
                : item
            )
          );
        }
        
        setCartOperationError(errorMessage);
        console.groupEnd();
        return;
      }

      // If the operation was successful
      if (newQuantity === 0) {
        showToast("Item removed from cart", "success");
      } else {
        showToast(`Quantity updated to ${newQuantity}`, "success");
        
        // Verify the update to catch any inconsistencies
        const verified = await verifyCartUpdate(itemId, newQuantity);
        if (!verified) {
          console.warn(`[Cart] Cart update verification failed, but server reported success`);
        }
      }

      // Recalculate the cart total after a successful update
      calculateCartTotal();
        console.groupEnd();

    } catch (error) {
      console.error(`[Cart] Exception in handleQuantityChange:`, error);
      showToast(`Error: ${error.message || 'An unexpected error occurred'}`, "error");
      setCartOperationError(error.message || 'An unexpected error occurred');
      console.groupEnd();
    }
  };

  const calculateCartTotal = useCallback(() => {
    try {
      if (!cartItems || cartItems.length === 0) {
        setCartTotal(0);
        return 0;
      }
      
      let total = 0;
      cartItems.forEach(item => {
        const price = item.discount_price || item.price;
        total += price * item.quantity;
      });
      
      console.log(`[Cart] Calculated new cart total: ${total}`);
      setCartTotal(total);
      
      // Return the calculated total so it can be used elsewhere
      return total;
    } catch (error) {
      console.error("[Cart] Error calculating cart total:", error);
      return 0;
    }
  }, [cartItems]);
  
  // Make sure we recalculate when cartItems change
  useEffect(() => {
    calculateCartTotal();
  }, [calculateCartTotal]);

  // Also add an effect to log the cart total for debugging
  useEffect(() => {
    console.log(`[Cart] Cart total value: ${cartTotal}`);
  }, [cartTotal]);

  const calculateSubtotal = useCallback(() => {
    if (!cartItems || cartItems.length === 0) return 0;
    
    let subtotal = 0;
    cartItems.forEach(item => {
      if (selectedItems.includes(item.cart_item_id)) {
        const price = parseFloat(item.discount_price || item.price);
        subtotal += price * item.quantity;
      }
    });
    
    return subtotal;
  }, [cartItems, selectedItems]);

  const calculateTotal = () => {
    try {
      console.group("Calculate Final Total");

      let subtotal = calculateSubtotal();
      console.log("Calculated subtotal:", subtotal);

      let discount = voucherDiscountAmount;
      console.log("Voucher discount amount:", discount);

      const finalTotal = Math.max(0, subtotal - discount);
      console.log(`Final total calculation: ${subtotal} - ${discount} = ${finalTotal}`);

        console.groupEnd();
      return finalTotal;
    } catch (error) {
      console.error("Error calculating total:", error);
      console.groupEnd();
      return calculateSubtotal();
    }
  };

  const calculateProductDiscount = () => {
    return cartItems
      .filter(item => selectedItems.includes(item.cart_item_id))
      .reduce((total, item) => {
        if (item.price && item.discount_price && item.price > item.discount_price) {
          return total + ((item.price - item.discount_price) * item.quantity);
        }
        return total;
      }, 0);
  };

  const handleApplyVoucher = async (voucher) => {
    try {
      console.log('Selected voucher:', voucher);
      
      if (selectedVoucher) {
        setPendingVoucher(voucher);
        setShowConfirmation(true);
        return;
      }

      // Apply voucher using the new endpoint
      if (selectedItems.length === 0) {
        showToast("Please select items before applying a voucher", "warning");
        return;
      }

      const selectedCartItems = cartItems.filter(item => selectedItems.includes(item.cart_item_id));
      
      // Call the new function to calculate the discount
      const result = await CartService.applyVoucherToCart(
        userId, 
        voucher.voucher_id, 
        selectedCartItems
      );

      if (result.success) {
        // Store both the voucher and the calculated discount
        setSelectedVoucher({
          ...voucher,
          code: voucher.code || result.voucherCode, // Ensure we have a code
          userVoucherId: result.userVoucherId,
          calculatedDiscount: result.discountAmount
        });
        setVoucherDiscountAmount(result.discountAmount);
        setShowVouchers(false);
        showToast(`Voucher ${voucher.code || result.voucherCode} applied with discount of Rs. ${result.discountAmount.toFixed(2)}`, "success");
      } else {
        setVoucherError(result.error || "Failed to apply voucher");
        showToast(result.error || "Failed to apply voucher", "error");
      }
    } catch (error) {
      console.error("Error applying voucher:", error);
      setVoucherError("Failed to apply voucher: " + error.message);
      showToast("Failed to apply voucher: " + error.message, "error");
    }
  };

  const handleRemoveVoucher = () => {
    if (!selectedVoucher) {
      return;
    }

    const voucherCode = selectedVoucher.code;
    setSelectedVoucher(null);
    setVoucherError(null);
    setShowVouchers(false);

    showToast(`Voucher ${voucherCode} has been removed`, "info");
  };

  const handleCheckout = async () => {
    if (!userId) {
      showToast("Please login first!", "warning");
      return;
    }
    if (selectedItems.length === 0) {
      showToast("No items selected", "warning");
      return;
    }

    setShowPaymentOptions(true);
  };

  const processCheckout = async () => {
    setError(null);

    if (selectedItems.length === 0) {
      setError("Please select at least one item to checkout.");
      return;
    }

    try {
      console.log("Starting checkout process with items:", selectedItems);
      console.log("Payment method:", selectedPaymentMethod);
      console.log("Voucher:", selectedVoucher ? selectedVoucher.voucher_id : 'none');
      console.log("User voucher ID:", selectedVoucher?.userVoucherId || 'none');
      
      const result = await CartService.checkout(
        userId,
        selectedItems,
        selectedVoucher ? selectedVoucher.voucher_id : null,
        selectedVoucher ? selectedVoucher.userVoucherId : null,
        selectedPaymentMethod
      );
      
      console.log("Checkout response:", result);
      
      if (result.success) {
        setSuccessfulOrder({
          orderId: result.orderId,
          totalBeforeDiscount: result.totalBeforeDiscount,
          discount: result.discount,
          finalTotal: result.finalTotal,
          products: cartItems.filter(item => selectedItems.includes(item.cart_item_id))
        });

        const remainingItems = cartItems.filter(item => !selectedItems.includes(item.cart_item_id));
        setCartItems(remainingItems);
        setSelectedItems([]);
        setSelectAll(false);
        setShowPaymentOptions(false);

        const newTotal = remainingItems.reduce((total, item) => {
          const price = item.discount_price || item.price;
          return total + (price * item.quantity);
        }, 0);
        setCartTotal(newTotal);

        window.dispatchEvent(new CustomEvent('cart-updated'));

        if (selectedPaymentMethod === 'card') {
          showToast("Payment successful! Your order has been placed.", "success");
        } else {
          showToast("Order placed successfully! You'll pay on delivery.", "success");
        }

        if (remainingItems.length === 0) {
          navigate("/");
        }
      } else if (result.outOfStockItems && result.outOfStockItems.length > 0) {
        setShowPaymentOptions(false);
        const outOfStockNames = result.outOfStockItems.map(item => item.product_name).join(", ");
        showToast(
          `Some items are out of stock: ${outOfStockNames}`, 
          "warning"
        );
        // Refresh cart to update stock information
        await fetchCartItems();
      } else {
        setShowPaymentOptions(false);
        showToast(result.error || "Checkout failed", "error");
        setError(result.error || "Failed to process your order. Please try again later.");
      }
    } catch (error) {
      console.error("Error during checkout:", error);
      setShowPaymentOptions(false);
      const errorMessage = error.message || "An unexpected error occurred during checkout";
      showToast(errorMessage, "error");
      setError(errorMessage);
      
      // If there's a network error, suggest refreshing the page
      if (errorMessage.includes("network") || errorMessage.includes("failed to fetch")) {
        setError("Network error. Please check your connection and try again.");
      }
    }
  };

  const handleReplaceVoucher = () => {
    if (pendingVoucher) {
      setSelectedVoucher(pendingVoucher);
      setPendingVoucher(null);
      setShowConfirmation(false);
      showToast(`Voucher ${pendingVoucher.code} applied successfully`, "success");
    }
  };

  const handleCancelReplacement = () => {
    setPendingVoucher(null);
    setShowConfirmation(false);
    setShowVouchers(true);
  };

  const renderReviewPrompt = () => {
    if (!successfulOrder) return null;

    return (
      <div className="review-prompt">
        <h3>Thank you for your purchase!</h3>
        <p>Would you like to review any of the products you just purchased?</p>

        <div className="purchased-products-list">
          {successfulOrder.products.map(item => (
            <div key={item.product_id} className="purchased-product-item">
              <img
                src={item.product_link}
                alt={item.product_name}
                className="purchased-product-image"
              />
              <div className="purchased-product-details">
                <h4>{item.product_name}</h4>
                <button
                  className="review-product-btn"
                  onClick={() => navigate('/productDetails', { state: item })}
                >
                  Review This Product
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const calculateVoucherDiscount = useCallback(() => {
    if (!selectedVoucher) return 0;
    
    // Use the pre-calculated discount if available
    if (selectedVoucher.calculatedDiscount) {
      return selectedVoucher.calculatedDiscount;
    }

    try {
      console.log("Calculating voucher discount with voucher:", selectedVoucher);
      const subtotal = calculateSubtotal();
      console.log("Current subtotal:", subtotal);

      // Check minimum order value
      if (subtotal < selectedVoucher.min_order_value) {
        console.log(`Subtotal ${subtotal} is less than minimum order value ${selectedVoucher.min_order_value}`);
        return 0;
      }

      const isPercentage = selectedVoucher.discount_type === 'percentage';
      let discountAmount;

      if (isPercentage) {
        // Calculate percentage discount
        discountAmount = (subtotal * selectedVoucher.discount_value) / 100;
        
        // Apply maximum discount if applicable
        if (selectedVoucher.max_discount && discountAmount > selectedVoucher.max_discount) {
          discountAmount = selectedVoucher.max_discount;
        }
      } else {
        // Fixed amount discount
        discountAmount = parseFloat(selectedVoucher.discount_value || selectedVoucher.discount_amount || 0);
      }
      
      // Ensure discount doesn't exceed total
      if (discountAmount > subtotal) {
        discountAmount = subtotal;
      }

      console.log(`Final voucher discount: ${discountAmount}`);
      return discountAmount;
    } catch (error) {
      console.error("Error calculating voucher discount:", error);
      return 0;
    }
  }, [selectedVoucher, calculateSubtotal]);

  const fetchVouchers = async () => {
    try {
      setVoucherLoading(true);
      setVoucherError(null);
      
      console.log("Fetching vouchers for user:", userId);
      
      const availableVouchers = await VoucherService.fetchVouchers(userId);
      console.log("Available vouchers:", availableVouchers);
      
      setVouchers(availableVouchers);
      setShowVouchers(true);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
      setVoucherError("Failed to load vouchers");
      showToast("Failed to load vouchers", "error");
    } finally {
      setVoucherLoading(false);
    }
  };

  // Effect to update voucher discount amount when selected voucher or items change
  useEffect(() => {
    if (!selectedVoucher || selectedItems.length === 0) {
      setVoucherDiscountAmount(0);
      return;
    }
    
    try {
      console.group("Voucher Calculation");
      
      // If we have a pre-calculated discount from the backend, use that
      if (selectedVoucher.calculatedDiscount) {
        console.log(`Using pre-calculated discount: ${selectedVoucher.calculatedDiscount}`);
        setVoucherDiscountAmount(selectedVoucher.calculatedDiscount);
      } else {
        // Otherwise calculate it client-side
        const discountAmount = calculateVoucherDiscount();
        console.log(`Calculated discount: ${discountAmount}`);
        setVoucherDiscountAmount(discountAmount);
      }
      
      console.groupEnd();
    } catch (error) {
      console.error("Error updating voucher discount:", error);
      console.groupEnd();
    }
  }, [selectedVoucher, selectedItems, calculateVoucherDiscount]);

  return (
    <div className="cart-container cart-page">
      <div className="cart-header">
        <h1 className="cart-title">Shopping Cart</h1>
        <div>
          <button
            className="apply-voucher-btn"
            onClick={() => {
              if (!selectedVoucher && cartItems.length > 0) {
                fetchVouchers();
              } else if (selectedVoucher) {
                showToast("You already have a voucher applied. Please remove it first before applying a new one.", "warning");
              }
            }}
            disabled={voucherLoading || cartItems.length === 0}
          >
            {voucherLoading ? "Loading..." : "Apply Voucher"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading your cart...</div>
      ) : error ? (
        <div className="error-message">{error}</div>
      ) : cartItems.length === 0 ? (
        <div className="cart-empty-container">
          <div className="empty-cart-message">
            <h2>Your cart is empty</h2>
            <p>Looks like you haven't added any items to your cart yet.</p>

            <div className="empty-cart-actions">
              <Link
                to="/"
                className="back-to-home-btn"
              >
                Back to Home
              </Link>
              <Link
                to="/"
                className="continue-shopping-btn"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="cart-content">
          {cartOperationError && (
            <div className="cart-operation-error">
              <span className="error-icon">⚠️</span>
              <span className="error-message">{cartOperationError}</span>
              <button 
                className="dismiss-error-btn"
                onClick={() => setCartOperationError(null)}
              >
                ✕
              </button>
            </div>
          )}
          
          <div className="cart-items-section">
            <div className="select-all-container">
              <label>
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                />
                Select All Items
              </label>
            </div>

            <div className="cart-items">
              {cartItems.map((item) => (
                <div key={item.cart_item_id} className="cart-item">
                  <div className="item-select">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.cart_item_id)}
                      onChange={() => handleSelectItem(item.cart_item_id)}
                    />
                  </div>

                  <div className="item-image">
                    <img 
                      src={item.product_link || item.image || '/sneaker.jpg'} 
                      alt={item.product_name || 'Product'} 
                      className="cart-item-image"
                      onError={(e) => {
                        e.target.src = '/sneaker.jpg';
                      }}
                    />
                  </div>

                  <div className="cart-item-details">
                    <h3 className="cart-item-name">{item.product_name}</h3>

                    <div className="cart-item-price">
                      <span className="cart-item-current-price">Rs. {item.discount_price}</span>
                      {item.original_price && item.original_price > item.discount_price && (
                        <span className="cart-item-original-price">Rs. {item.original_price}</span>
                      )}
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-control">
                        <button
                          onClick={() => {
                            console.log(`Decreasing quantity for item ID: ${item.cart_item_id}, current quantity: ${item.quantity}`);
                            try {
                              if (item.quantity > 1) {
                                handleQuantityChange(item.cart_item_id, item.quantity - 1);
                              } else {
                                handleQuantityChange(item.cart_item_id, 0);
                              }
                            } catch (error) {
                              console.error("Error in decrease quantity button:", error);
                              showToast("Error decreasing quantity", "error");
                            }
                          }}
                          className="quantity-btn"
                        >
                          -
                        </button>
                        <span className="quantity-display">{item.quantity}</span>
                        <button
                          onClick={() => {
                            console.log(`Increasing quantity for item ID: ${item.cart_item_id}, current quantity: ${item.quantity}`);
                            try {
                              handleQuantityChange(item.cart_item_id, item.quantity + 1);
                            } catch (error) {
                              console.error("Error in increase quantity button:", error);
                              showToast("Error increasing quantity", "error");
                            }
                          }}
                          className="quantity-btn"
                        >
                          +
                        </button>
                      </div>

                      <div className="cart-item-buttons">
                      <button
                          onClick={() => {
                            console.log(`Removing item ID: ${item.cart_item_id} from cart`);
                            try {
                              handleQuantityChange(item.cart_item_id, 0);
                            } catch (error) {
                              console.error("Error removing item:", error);
                              showToast("Error removing item", "error");
                            }
                          }}
                        className="remove-btn"
                      >
                        Remove
                      </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="cart-summary">
            <h2 className="cart-summary-title">Order Summary</h2>

            <div className="cart-summary-row">
              <span className="cart-summary-label">Subtotal ({selectedItems.length} items)</span>
              <span className="cart-summary-value">Rs. {calculateSubtotal().toFixed(2)}</span>
            </div>

            <div className="cart-summary-row">
              <span className="cart-summary-label">Product Discount</span>
              <span className="cart-summary-value discount-value">
                - Rs. {calculateProductDiscount().toFixed(2)}
              </span>
            </div>

            {selectedVoucher && (
              <div className="cart-summary-row voucher-discount-row">
                <span className="cart-summary-label">Voucher Discount</span>
                <span className="cart-summary-value discount-value">
                  - Rs. {parseFloat(voucherDiscountAmount || 0).toFixed(2)}
                </span>
              </div>
            )}

            {selectedVoucher && (
              <div className="cart-summary-row voucher-row">
                <div className="voucher-info">
                  <span className="voucher-label">Voucher Applied:</span>
                  <span className="voucher-code">{selectedVoucher.code}</span>
                  <button
                    onClick={handleRemoveVoucher}
                    className="remove-voucher-btn"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            <div className="cart-total">
              <span>Total</span>
              <span>Rs. {calculateTotal().toFixed(2)}</span>
            </div>

            <button
              className="checkout-btn"
              onClick={handleCheckout}
              disabled={selectedItems.length === 0}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}

      {showVouchers && (
        <div className="voucher-modal">
          <div className="voucher-modal-content">
            <div className="voucher-modal-header">
              <h3>Available Vouchers</h3>
              <button
                onClick={() => {
                  setShowVouchers(false);
                  setPendingVoucher(null);
                }}
                className="close-modal-btn"
              >
                ✕
              </button>
            </div>

            {voucherError && (
              <div className="voucher-error-message">
                {voucherError}
              </div>
            )}

            {vouchers && vouchers.length > 0 ? (
              <div className="voucher-list">
                {vouchers.map((voucher, index) => (
                  <div
                    key={voucher.voucher_id || index}
                    className={`voucher-item ${selectedVoucher &&
                      selectedVoucher.voucher_id === voucher.voucher_id ? 'selected' : ''}`}
                    onClick={() => handleApplyVoucher(voucher)}
                  >
                    <div className="voucher-code-section">
                      <span className="voucher-code">{voucher.code || 'DISCOUNT'}</span>
                    </div>
                    <div className="voucher-details">
                      <p className="voucher-description">
                        Rs. {voucher.discount_amount || 0} OFF
                      </p>
                      <p className="voucher-min-spend">
                        Min. Spend: Rs. {voucher.min_order_value || 0}
                      </p>
                      {voucher.expiry_date && (
                        <p className="voucher-expiry">
                          Valid until: {new Date(voucher.expiry_date).toLocaleDateString()}
                        </p>
                      )}
                      {voucher.status && (
                        <p className="voucher-status">
                          Status: <span className={`status-${voucher.status}`}>{voucher.status}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-vouchers">
                <p>No vouchers available at the moment.</p>
                <button
                  className="refresh-vouchers-btn"
                  onClick={() => fetchVouchers()}
                >
                  Refresh Vouchers
                </button>
              </div>
            )}

            <div className="voucher-modal-footer">
              <button
                onClick={() => {
                  setShowVouchers(false);
                  setPendingVoucher(null);
                }}
                className="close-vouchers-btn"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirmation && (
        <div className="voucher-modal">
          <div className="voucher-confirmation-modal">
            <div className="voucher-modal-header">
              <h3>Replace Voucher</h3>
              <button
                onClick={handleCancelReplacement}
                className="close-modal-btn"
              >
                ✕
              </button>
            </div>

            <div className="voucher-confirmation-content">
              <p>You already have voucher <strong>{selectedVoucher?.code}</strong> applied.</p>
              <p>Do you want to replace it with <strong>{pendingVoucher?.code}</strong>?</p>
              <p>Only one voucher can be applied at a time.</p>
            </div>

            <div className="voucher-confirmation-actions">
              <button
                onClick={handleCancelReplacement}
                className="cancel-replace-btn"
              >
                Cancel
              </button>
              <button
                onClick={handleReplaceVoucher}
                className="confirm-replace-btn"
              >
                Replace Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentOptions && (
        <div className="payment-modal">
          <div className="payment-modal-content">
            <div className="payment-modal-header">
              <h3>Checkout</h3>
              <button
                onClick={() => setShowPaymentOptions(false)}
                className="close-modal-btn"
              >
                ✕
              </button>
            </div>

            <div className="payment-modal-body">
              <div className="order-summary-brief">
                <h4>Order Summary</h4>
                <div className="summary-row">
                  <span>Items:</span>
                  <span>{selectedItems.length}</span>
                </div>
                <div className="summary-row">
                  <span>Subtotal:</span>
                  <span>Rs. {calculateSubtotal().toFixed(2)}</span>
                </div>
                {voucherDiscountAmount > 0 && (
                  <div className="summary-row discount-row">
                    <span>Discount:</span>
                    <span>- Rs. {voucherDiscountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="summary-row total-row">
                  <span>Total:</span>
                  <span>Rs. {calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <PaymentOptions
                selectedPaymentMethod={selectedPaymentMethod}
                onSelectPaymentMethod={setSelectedPaymentMethod}
              />

              <div className="payment-actions">
                <button
                  className="cancel-payment-btn"
                  onClick={() => setShowPaymentOptions(false)}
                >
                  Cancel
                </button>
                <button
                  className="confirm-payment-btn"
                  onClick={processCheckout}
                >
                  {selectedPaymentMethod === 'card'
                    ? 'Pay Now'
                    : 'Place Order'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {successfulOrder && cartItems.length === 0 && renderReviewPrompt()}
    </div>
  );
}

export default Cart;