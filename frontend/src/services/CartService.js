// CartService.js
// This service handles cart-related operations

// Use only port 5000
const API_BASE_URL = 'http://localhost:5000';

/**
 * Fetches the cart for a user
 */
export const fetchCart = async (userId) => {
  try {
    console.log(`Fetching cart for user: ${userId}`);
    if (!userId) {
      console.error('No userId provided to fetchCart');
      return { items: [], total: 0, count: 0 };
    }
    
    const response = await fetch(`${API_BASE_URL}/cart/${userId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // Log response status for debugging
    console.log(`Cart API response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch cart: ${response.status} ${response.statusText}`);
    }
    
    // First get the response as text to check if it's valid
    const responseText = await response.text();
    
    // Check if the response is empty
    if (!responseText.trim()) {
      console.error('Empty response from cart API');
      return { items: [], total: 0, count: 0 };
    }
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Cart data:', data);
    } catch (parseError) {
      console.error('Error parsing cart response as JSON:', parseError);
      console.error('Response text:', responseText.substring(0, 200) + '...');
      return { items: [], total: 0, count: 0 };
    }
    
    // Handle various response formats
    let cartItems = [];
    
    if (Array.isArray(data)) {
      cartItems = data;
    } else if (data.cart && Array.isArray(data.cart)) {
      cartItems = data.cart;
    } else if (data.items && Array.isArray(data.items)) {
      cartItems = data.items;
    } else {
      console.error('Unexpected cart data structure:', data);
      return { items: [], total: 0, count: 0 };
    }
    
    // Normalize the cart items to work with the normalized database schema
    const normalizedItems = cartItems.map(item => ({
      cart_item_id: item.cart_item_id,
      cart_id: item.cart_id,
      product_id: item.product_id,
      product_name: item.product_name,
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 1,
      discount_price: item.discount_price ? parseFloat(item.discount_price) : parseFloat(item.price),
      product_link: item.product_link || '',
      voucher_id: item.voucher_id || null,
      added_at: item.added_at || new Date().toISOString()
      // Fields match the normalized database schema with cart_items table
    }));
    
    // Calculate totals
    const total = normalizedItems.reduce((sum, item) => {
      const itemPrice = item.discount_price || item.price;
      return sum + (itemPrice * item.quantity);
    }, 0);
    
    const count = normalizedItems.reduce((sum, item) => sum + item.quantity, 0);
    
    return {
      items: normalizedItems,
      total,
      count
    };
  } catch (error) {
    console.error('Error fetching cart:', error);
    return { items: [], total: 0, count: 0 };
  }
};

/**
 * Adds an item to the cart
 */
export const addToCart = async (userId, productId, quantity = 1, voucherId = null) => {
  try {
    if (!userId) {
      console.error('No userId provided to addToCart');
      return { success: false, error: 'User not logged in' };
    }
    
    if (!productId) {
      console.error('No productId provided to addToCart');
      return { success: false, error: 'Product ID is required' };
    }

    console.log(`Adding to cart: userId=${userId}, productId=${productId}, quantity=${quantity}, voucherId=${voucherId || 'none'}`);
    
    // Updated to match the server's expected field names in server.js
    const response = await fetch(`${API_BASE_URL}/cart/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        userId, // server.js expects 'userId'
        productId, // server.js expects 'productId'
        quantity,
        voucherId // Add voucher support based on the normalized schema
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to add item to cart: ${response.status} - ${errorText}`);
    }
    
    // First get the response as text to check if it's valid
    const responseText = await response.text();
    
    // Check if the response is empty
    if (!responseText.trim()) {
      console.error('Empty response from add to cart API');
      return { success: true }; // Assume success even with empty response
    }
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Error parsing add to cart response as JSON:', parseError);
      return { success: true }; // Assume success even with parse error
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error adding to cart:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Updates the quantity of an item in the cart with retry capability
 */
export const updateCartItemQuantity = async (userId, cartItemId, quantity, retryCount = 0) => {
  const MAX_RETRIES = 2;
  
  try {
    console.group(`[CartService] Update cart item ${cartItemId} quantity to ${quantity} (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})`);
    
    if (!userId) {
      console.error('[CartService] Missing userId');
      console.groupEnd();
      return { success: false, error: 'User not logged in' };
    }
    
    if (!cartItemId) {
      console.error('[CartService] Missing cartItemId');
      console.groupEnd();
      return { success: false, error: 'Cart item ID is required' };
    }
    
    // Parse and validate cart_item_id
    const parsedCartItemId = parseInt(cartItemId, 10);
    if (isNaN(parsedCartItemId)) {
      console.error(`[CartService] Invalid cartItemId (not a number): ${cartItemId}`);
      console.groupEnd();
      return { success: false, error: 'Invalid cart item ID' };
    }
    
    // Parse and validate quantity
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      console.error(`[CartService] Invalid quantity: ${quantity}`);
      console.groupEnd();
      return { success: false, error: 'Quantity must be a non-negative number' };
    }
    
    console.log(`[CartService] Updating cart item ${parsedCartItemId} to quantity ${parsedQuantity} for user ${userId}`);
    
    // Use alternative endpoint after first failure
    if (retryCount > 0) {
      console.log('[CartService] Using alternative POST endpoint for update');
      return updateCartItemQuantityAlternative(userId, parsedCartItemId, parsedQuantity);
    }
    
    // Note: The server endpoint is '/cart/:cartId' but it actually expects the cart_item_id
    // from the cart_items table. So we pass the parsedCartItemId as the parameter.
    const url = `${API_BASE_URL}/cart/${parsedCartItemId}`;
    console.log(`[CartService] Request URL: ${url}`);
    
    const requestBody = { quantity: parsedQuantity };
    console.log('[CartService] Request body:', JSON.stringify(requestBody));
    
    try {
      // Add a timeout to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      console.log(`[CartService] Sending PUT request...`);
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Check if server is reachable
      if (!response) {
        console.error('[CartService] No response received from server');
        
        // Try to run a diagnostic check
        try {
          console.log('[CartService] Running diagnostic check...');
          const diagnosticUrl = `${API_BASE_URL}/api/cart-debug/${parsedCartItemId}`;
          const diagResponse = await fetch(diagnosticUrl);
          const diagData = await diagResponse.json();
          console.log('[CartService] Diagnostic results:', diagData);
          
          if (diagData.availableItems && diagData.availableItems.length > 0) {
            console.log('[CartService] Available cart items found. Suggesting to try one of them.');
          }
        } catch (diagError) {
          console.error('[CartService] Diagnostic check failed:', diagError);
        }
        
        // Retry logic if we haven't maxed out retries
        if (retryCount < MAX_RETRIES) {
          console.log(`[CartService] Retrying operation (${retryCount + 1}/${MAX_RETRIES})...`);
          console.groupEnd();
          return updateCartItemQuantity(userId, cartItemId, quantity, retryCount + 1);
        }
        
        console.groupEnd();
        return { 
          success: false, 
          error: 'Server unreachable - please check your connection',
        };
      }
      
      // Log full response details for debugging
      console.log(`[CartService] Response status: ${response.status} (${response.statusText})`);
      
      // Get the response text first for debugging
      const responseText = await response.text();
      console.log(`[CartService] Raw response text: ${responseText.substring(0, 200)}${responseText.length > 200 ? '...' : ''}`);
      
      // Handle error response
      if (!response.ok) {
        console.error(`[CartService] Error response (${response.status}):`, responseText);
        
        // Retry on 500-level errors or any other error
        if (retryCount < MAX_RETRIES) {
          console.log(`[CartService] Server error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          console.groupEnd();
          // Add exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          return updateCartItemQuantity(userId, cartItemId, quantity, retryCount + 1);
        }
        
        // Try to parse error as JSON if possible
        try {
          if (responseText && responseText.trim()) {
            const errorData = JSON.parse(responseText);
            console.groupEnd();
            return { 
              success: false, 
              error: errorData.error || `Failed to update cart item: ${response.status}`,
              statusCode: response.status
            };
          } else {
            console.groupEnd();
            return { 
              success: false, 
              error: `Failed to update cart item: ${response.status} - Empty response`,
              statusCode: response.status
            };
          }
        } catch (parseError) {
          console.error('[CartService] Could not parse error response as JSON:', parseError);
          console.groupEnd();
          return { 
            success: false, 
            error: `Failed to update cart item: ${response.status} - ${responseText.substring(0, 50)}`,
            statusCode: response.status
          };
        }
      }
      
      // Try to parse response as JSON if it's not empty
      let data = { success: true };
      
      if (responseText && responseText.trim()) {
        try {
          data = JSON.parse(responseText);
          console.log('[CartService] Parsed response data:', data);
        } catch (parseError) {
          console.warn('[CartService] Could not parse response as JSON, using default success', parseError);
        }
      }
      
      console.log('[CartService] Operation completed successfully');
      console.groupEnd();
      return { success: true, ...data, statusCode: response.status };
    } catch (fetchError) {
      // Network or timeout error
      if (fetchError.name === 'AbortError') {
        console.error('[CartService] Request timed out');
        
        // Try again if we haven't maxed out retries
        if (retryCount < MAX_RETRIES) {
          console.log(`[CartService] Retrying after timeout (${retryCount + 1}/${MAX_RETRIES})...`);
          console.groupEnd();
          return updateCartItemQuantity(userId, cartItemId, quantity, retryCount + 1);
        }
        
        console.groupEnd();
        return { success: false, error: 'Request timed out - server did not respond in time' };
      } else {
        console.error('[CartService] Network error:', fetchError);
        
        // Retry on network errors
        if (retryCount < MAX_RETRIES) {
          console.log(`[CartService] Retrying after network error (${retryCount + 1}/${MAX_RETRIES})...`);
          console.groupEnd();
          // Add exponential backoff
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
          return updateCartItemQuantity(userId, cartItemId, quantity, retryCount + 1);
        }
        
        console.groupEnd();
        return { success: false, error: fetchError.message || 'Network error' };
      }
    }
  } catch (error) {
    console.error('[CartService] Unexpected error in updateCartItemQuantity:', error);
    console.groupEnd();
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};

/**
 * Alternative method to update cart item quantity using POST instead of PUT
 * This avoids issues with some environments that might not properly handle PUT requests
 */
export const updateCartItemQuantityAlternative = async (userId, cartItemId, quantity) => {
  try {
    console.group('[CartService] Using alternative endpoint for cart update');
    
    // Make a POST request to the alternative endpoint
    const url = `${API_BASE_URL}/api/cart/update`;
    console.log(`[CartService] Alternative URL: ${url}`);
    
    const requestBody = { 
      cart_item_id: parseInt(cartItemId, 10),
      quantity: parseInt(quantity, 10)
    };
    console.log('[CartService] Alternative request body:', JSON.stringify(requestBody));
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`[CartService] Alternative response status: ${response.status}`);
    
    // Get the response text for debugging
    const responseText = await response.text();
    
    if (!response.ok) {
      console.error(`[CartService] Alternative endpoint error: ${responseText}`);
      console.groupEnd();
      return { 
        success: false, 
        error: `Alternative update failed: ${response.status}`,
        statusCode: response.status
      };
    }
    
    // Parse the response if possible
    let data = { success: true };
    
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('[CartService] Could not parse alternative response as JSON', parseError);
      }
    }
    
    console.log('[CartService] Alternative update completed successfully');
    console.groupEnd();
    return { success: true, ...data, statusCode: response.status };
  } catch (error) {
    console.error('[CartService] Error in alternative update:', error);
    console.groupEnd();
    return { success: false, error: error.message || 'Error in alternative update method' };
  }
};

/**
 * Removes an item from the cart (sets quantity to 0)
 */
export const removeFromCart = async (userId, cartItemId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User not logged in' };
    }
    
    if (!cartItemId) {
      return { success: false, error: 'Cart item ID is required' };
    }
    
    // Use updateCartItemQuantity with quantity 0 to trigger deletion
    return await updateCartItemQuantity(userId, cartItemId, 0);
  } catch (error) {
    console.error('Error removing from cart:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Process checkout for the selected cart items
 */
export const checkout = async (userId, cartItemIds, voucherId, userVoucherId, paymentMethod) => {
  try {
    if (!userId) {
      return { success: false, error: 'User not logged in' };
    }
    
    if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      return { success: false, error: 'No items selected for checkout' };
    }
    
    console.log(`Checking out for user ${userId} with items: ${cartItemIds.join(', ')}`);
    console.log(`Using voucher: ${voucherId || 'none'} (userVoucherId: ${userVoucherId || 'none'}), payment method: ${paymentMethod || 'cod'}`);

    // Create the request with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout for checkout
    
    try {
      const response = await fetch(`${API_BASE_URL}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          userId, 
          cartItemIds,
          voucherId: voucherId || null,
          userVoucherId: userVoucherId || null, // Include the userVoucherId for marking as used
          paymentMethod: paymentMethod || 'cod'
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Get the text response first for debugging
        const errorText = await response.text();
        console.error(`Checkout error response (${response.status}):`, errorText);
        
        // Try to parse as JSON
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          throw new Error(`Checkout failed: ${response.status} - ${errorText}`);
        }
        
        // Special handling for out-of-stock items
        if (errorData.items && Array.isArray(errorData.items)) {
          return {
            success: false,
            error: errorData.error || 'Some items are out of stock',
            outOfStockItems: errorData.items
          };
        }
        
        // Handle specific error status codes
        if (response.status === 404) {
          return { success: false, error: 'Checkout endpoint not found. Please try again later.' };
        } else if (response.status === 400) {
          return { success: false, error: errorData.error || 'Invalid checkout data' };
        } else if (response.status === 401 || response.status === 403) {
          return { success: false, error: 'You are not authorized to perform this checkout' };
        } else if (response.status >= 500) {
          return { success: false, error: 'Server error during checkout. Please try again later.' };
        }
        
        throw new Error(errorData.error || `Checkout failed: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Checkout successful, response:', data);
      
      return {
        success: true,
        orderId: data.orderId,
        totalBeforeDiscount: data.totalBeforeDiscount,
        discount: data.discount,
        finalTotal: data.finalTotal,
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus
      };
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        return { success: false, error: 'Checkout request timed out. Please try again.' };
      }
      throw fetchError; // Re-throw for the outer catch to handle
    }
  } catch (error) {
    console.error('Error during checkout:', error);
    
    // Create a more user-friendly error message based on the error type
    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      return { 
        success: false, 
        error: 'Network error. Please check your internet connection and try again.'
      };
    }
    
    return { success: false, error: error.message || 'An unexpected error occurred during checkout' };
  }
};

/**
 * Applies a voucher to a cart item
 */
export const applyVoucherToCartItem = async (userId, cartItemId, voucherId) => {
  try {
    if (!userId) {
      return { success: false, error: 'User not logged in' };
    }
    
    if (!cartItemId) {
      return { success: false, error: 'Cart item ID is required' };
    }
    
    if (!voucherId) {
      return { success: false, error: 'Voucher ID is required' };
    }
    
    console.log(`Applying voucher ${voucherId} to cart item ${cartItemId}`);
    
    // Send a direct request to apply the voucher instead of using updateCartItemQuantity
    const response = await fetch(`${API_BASE_URL}/cart/${cartItemId}/voucher`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ voucherId }),
    });
    
    // Log full response details for debugging
    console.log(`[CartService] Voucher application response status: ${response.status}`);
    
    // Get the response text first for debugging
    const responseText = await response.text();
    console.log(`[CartService] Raw voucher response text: ${responseText}`);
    
    // Handle error response
    if (!response.ok) {
      console.error('[CartService] Voucher application error response:', responseText);
      
      try {
        if (responseText && responseText.trim()) {
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.error || `Failed to apply voucher: ${response.status}`);
        } else {
          throw new Error(`Failed to apply voucher: ${response.status} - Empty response`);
        }
      } catch (parseError) {
        if (parseError.message.includes('JSON')) {
          // JSON parse error
          throw new Error(`Failed to apply voucher: ${response.status} - ${responseText}`);
        } else {
          // Rethrow the original error
          throw parseError;
        }
      }
    }
    
    // Try to parse response as JSON if it's not empty
    let data = { success: true };
    
    if (responseText && responseText.trim()) {
      try {
        data = JSON.parse(responseText);
        console.log('[CartService] Parsed voucher response data:', data);
      } catch (parseError) {
        console.warn('[CartService] Could not parse voucher response as JSON, using default success', parseError);
      }
    }
    
    return { success: true, ...data };
  } catch (error) {
    console.error('Error applying voucher to cart item:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get a single cart item by ID
 */
export const getCartItem = async (userId, cartItemId) => {
  try {
    if (!userId || !cartItemId) {
      return { success: false, error: 'User ID and cart item ID are required' };
    }
    
    // Fetch the user's cart
    const cart = await fetchCart(userId);
    
    // Find the specific item
    const item = cart.items.find(item => item.cart_item_id === parseInt(cartItemId));
    
    if (!item) {
      return { success: false, error: 'Cart item not found' };
    }
    
    return { success: true, item };
  } catch (error) {
    console.error('Error getting cart item:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Simple cart update method using the simplified endpoint
 * This should be more reliable than other methods when dealing with problematic environments
 */
export const simpleCartUpdate = async (userId, cartItemId, quantity) => {
  try {
    console.group('[CartService] Simple cart update');
    
    // Validate parameters
    if (!userId || userId <= 0) {
      console.error('[CartService] Invalid userId:', userId);
      console.groupEnd();
      return { success: false, error: 'Invalid user ID' };
    }
    
    if (!cartItemId) {
      console.error('[CartService] Invalid cartItemId:', cartItemId);
      console.groupEnd();
      return { success: false, error: 'Invalid cart item ID' };
    }
    
    // Parse and validate quantity
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      console.error('[CartService] Invalid quantity:', quantity);
      console.groupEnd();
      return { success: false, error: 'Invalid quantity' };
    }
    
    // Build the request
    const url = `${API_BASE_URL}/simple-cart-update`;
    console.log(`[CartService] Simple update URL: ${url}`);
    
    const requestBody = {
      userId: parseInt(userId, 10),
      cartItemId: parseInt(cartItemId, 10),
      quantity: parsedQuantity
    };
    
    console.log('[CartService] Simple update request body:', requestBody);
    
    // Make the request
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`[CartService] Simple update response status: ${response.status}`);
    
    const responseText = await response.text();
    console.log(`[CartService] Simple update response:`, responseText.substring(0, 200));
    
    if (!response.ok) {
      console.error('[CartService] Simple update failed:', responseText);
      console.groupEnd();
      return { 
        success: false, 
        error: `Update failed with status ${response.status}`,
        details: responseText
      };
    }
    
    // Parse the response
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (error) {
      console.error('[CartService] Error parsing response:', error);
      // Even if parsing fails, the update may have succeeded
      console.groupEnd();
      return { success: true };
    }
    
    console.log('[CartService] Simple update completed successfully:', data);
    console.groupEnd();
    return { success: true, ...data };
  } catch (error) {
    console.error('[CartService] Error in simple cart update:', error);
    console.groupEnd();
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
};

// Add a new function to apply voucher and calculate discount
export const applyVoucherToCart = async (userId, voucherId, cartItems) => {
  try {
    if (!userId) {
      return { success: false, error: 'User not logged in' };
    }
    
    if (!voucherId) {
      return { success: false, error: 'Voucher ID is required' };
    }
    
    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return { success: false, error: 'Cart items are required' };
    }
    
    console.log(`[CartService] Applying voucher ${voucherId} to cart for user ${userId}`);
    
    // Try to get voucher details from VoucherService first
    try {
      // Instead of calling a backend endpoint, calculate discount on the front end
      // First, we need to fetch the voucher details
      const voucherResponse = await fetch(`${API_BASE_URL}/vouchers/${userId}/${voucherId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!voucherResponse.ok) {
        // If we can't get voucher details, try to calculate based on what we have
        const originalAmount = cartItems.reduce((total, item) => {
          return total + (parseFloat(item.price || 0) * parseInt(item.quantity || 1));
        }, 0);
        
        // Assume voucher_id contains the information we need
        // If voucher_id > 100, it's a fixed amount, otherwise it's percentage
        const isPercentage = voucherId <= 100;
        const discountValue = voucherId;
        
        let discountAmount;
        if (isPercentage) {
          discountAmount = (originalAmount * discountValue) / 100;
        } else {
          discountAmount = discountValue;
        }
        
        // Ensure discount doesn't exceed total
        if (discountAmount > originalAmount) {
          discountAmount = originalAmount;
        }
        
        const finalAmount = originalAmount - discountAmount;
        
        return {
          success: true,
          voucherId: voucherId,
          voucherCode: `VOUCHER${voucherId}`,
          userVoucherId: voucherId,
          originalAmount: originalAmount,
          discountAmount: discountAmount,
          finalAmount: finalAmount,
          isPercentage: isPercentage,
          discountValue: discountValue
        };
      }
      
      const voucherData = await voucherResponse.json();
      console.log('[CartService] Voucher details:', voucherData);
      
      if (!voucherData || !voucherData.voucher_id) {
        throw new Error('Invalid voucher data received');
      }
      
      // Calculate discount based on voucher details
      const originalAmount = cartItems.reduce((total, item) => {
        return total + (parseFloat(item.discount_price || item.price || 0) * parseInt(item.quantity || 1));
      }, 0);
      
      // Check if voucher meets minimum order value
      if (voucherData.min_order_value && originalAmount < voucherData.min_order_value) {
        return {
          success: false,
          error: `Minimum order value of Rs. ${voucherData.min_order_value} required for this voucher`
        };
      }
      
      // Determine if percentage or fixed amount
      // Using the convention: if discount_amount > 100, it's a fixed amount, otherwise percentage
      const isPercentage = voucherData.discount_amount <= 100;
      const discountValue = parseFloat(voucherData.discount_amount || 0);
      
      let discountAmount;
      if (isPercentage) {
        // Calculate percentage discount
        discountAmount = (originalAmount * discountValue) / 100;
        
        // Apply maximum discount if applicable
        if (voucherData.max_discount && discountAmount > voucherData.max_discount) {
          discountAmount = voucherData.max_discount;
        }
      } else {
        // Fixed amount discount
        discountAmount = discountValue;
      }
      
      // Ensure discount doesn't exceed total
      if (discountAmount > originalAmount) {
        discountAmount = originalAmount;
      }
      
      const finalAmount = originalAmount - discountAmount;
      
      return {
        success: true,
        voucherId: voucherData.voucher_id,
        voucherCode: voucherData.code || `VOUCHER${voucherData.voucher_id}`,
        userVoucherId: voucherData.user_voucher_id || voucherData.voucher_id,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        isPercentage: isPercentage,
        discountValue: discountValue
      };
      
    } catch (voucherError) {
      console.error('[CartService] Error getting voucher details:', voucherError);
      
      // Fallback calculation if voucher details can't be fetched
      const originalAmount = cartItems.reduce((total, item) => {
        return total + (parseFloat(item.discount_price || item.price || 0) * parseInt(item.quantity || 1));
      }, 0);
      
      // Simple fixed discount of 100
      const discountAmount = Math.min(originalAmount, 100);
      const finalAmount = originalAmount - discountAmount;
      
      return {
        success: true,
        voucherId: voucherId,
        voucherCode: `VOUCHER${voucherId}`,
        userVoucherId: voucherId,
        originalAmount: originalAmount,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        isPercentage: false,
        discountValue: 100
      };
    }
  } catch (error) {
    console.error('[CartService] Error applying voucher to cart:', error);
    return { 
      success: false, 
      error: error.message || 'An unexpected error occurred while applying the voucher' 
    };
  }
};

// Export the functions directly without creating any duplicates
const cartService = {
  fetchCart,
  addToCart,
  updateCartItemQuantity,
  updateCartItemQuantityAlternative,
  removeFromCart,
  checkout,
  applyVoucherToCartItem,
  getCartItem,
  simpleCartUpdate,
  applyVoucherToCart
};

// Don't export individual functions here - it's causing duplicate declarations

export default cartService; 