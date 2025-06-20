// VoucherService.js
// This service handles voucher-related operations

const API_BASE_URL = 'http://localhost:5000';

/**
 * Fetches all available vouchers for a user
 */
export const fetchVouchers = async (userId) => {
  try {
    if (!userId) {
      console.error('No userId provided to fetchVouchers');
      return [];
    }
    
    console.log(`Fetching vouchers for user: ${userId}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/vouchers/${userId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch vouchers: ${response.status} ${response.statusText}`);
        // Fall back to static vouchers if API fails
        return getFallbackVouchers();
      }
      
      // Get response as text first to check if it's valid
      const responseText = await response.text();
      
      // Check if the response is empty
      if (!responseText.trim()) {
        console.error('Empty response from vouchers API');
        return getFallbackVouchers();
      }
      
      // Try to parse the response as JSON
      let data;
      try {
        data = JSON.parse(responseText);
        console.log(`Received ${data.length} vouchers`);
      } catch (parseError) {
        console.error('Error parsing vouchers response as JSON:', parseError);
        return getFallbackVouchers();
      }
      
      if (!Array.isArray(data)) {
        console.error('Voucher data is not an array:', typeof data);
        return getFallbackVouchers();
      }
      
      if (data.length === 0) {
        console.log('No vouchers returned from API, using fallback data');
        return getFallbackVouchers();
      }
      
      // Normalize voucher data based on schema
      return data.map(voucher => ({
        voucher_id: voucher.voucher_id,
        code: voucher.code,
        description: voucher.description || `${voucher.code} Voucher`,
        discount_type: voucher.discount_type || 'fixed',
        discount_value: parseFloat(voucher.discount_amount || 0),
        discount_amount: parseFloat(voucher.discount_amount || 0),
        max_discount: parseFloat(voucher.max_discount || 0),
        min_order_value: parseFloat(voucher.min_order_value || 0),
        expiry_date: voucher.expiry_date ? new Date(voucher.expiry_date) : null,
        status: voucher.status || 'active',
        times_used: parseInt(voucher.times_used || 0)
      }));
    } catch (apiError) {
      console.error('API call for vouchers failed:', apiError);
      return getFallbackVouchers();
    }
  } catch (error) {
    console.error('Error fetching vouchers:', error);
    return getFallbackVouchers();
  }
};

/**
 * Provides fallback voucher data when the API is not available
 */
const getFallbackVouchers = () => {
  console.log('Using fallback voucher data');
  return [
    {
      voucher_id: 1,
      code: 'WELCOME20',
      description: '20% off on your first order',
      discount_type: 'percentage',
      discount_value: 20,
      discount_amount: 20,
      max_discount: 200,
      min_order_value: 1000,
      expiry_date: new Date(new Date().setDate(new Date().getDate() + 30)),
      status: 'active',
      times_used: 0
    },
    {
      voucher_id: 2,
      code: 'FLAT100',
      description: 'Rs. 100 off on orders above Rs. 1500',
      discount_type: 'fixed',
      discount_value: 100,
      discount_amount: 100,
      max_discount: 100,
      min_order_value: 1500,
      expiry_date: new Date(new Date().setDate(new Date().getDate() + 30)),
      status: 'active',
      times_used: 0
    },
    {
      voucher_id: 3,
      code: 'WELCOME50',
      description: 'Rs. 50 off on orders above Rs. 200',
      discount_type: 'fixed',
      discount_value: 50,
      discount_amount: 50,
      max_discount: 50,
      min_order_value: 200,
      expiry_date: new Date(new Date().setDate(new Date().getDate() + 30)),
      status: 'active',
      times_used: 0
    }
  ];
};

/**
 * Applies a voucher to a cart total
 * @param {Object} voucher - The voucher object
 * @param {number} subtotal - The cart subtotal before discount
 * @returns {number} - The discount amount to apply
 */
export const calculateVoucherDiscount = (voucher, subtotal) => {
  if (!voucher || subtotal <= 0) {
    return 0;
  }
  
  console.log('Calculating discount for voucher:', voucher.code, 'on subtotal:', subtotal);
  
  // Check minimum order value
  const minOrderValue = parseFloat(voucher.min_order_value || 0);
  if (minOrderValue > 0 && subtotal < minOrderValue) {
    console.log(`Subtotal ${subtotal} is less than minimum order value ${minOrderValue}`);
    return 0;
  }
  
  const discountType = voucher.discount_type || 'fixed';
  const discountValue = parseFloat(voucher.discount_value || voucher.discount_amount || 0);
  const maxDiscount = parseFloat(voucher.max_discount || 0);
  
  console.log('Discount parameters:', { discountType, discountValue, maxDiscount });
  
  let discountAmount = 0;
  
  if (discountType === 'percentage') {
    discountAmount = (subtotal * discountValue) / 100;
    console.log(`Percentage discount calculation: ${subtotal} * ${discountValue}% = ${discountAmount}`);
    
    // Apply maximum discount cap for percentage vouchers
    if (maxDiscount > 0 && discountAmount > maxDiscount) {
      console.log(`Capping discount at max_discount: ${maxDiscount}`);
      discountAmount = maxDiscount;
    }
  } else {
    // Assume fixed discount by default
    discountAmount = discountValue;
    console.log(`Fixed discount applied: ${discountAmount}`);
    
    // For fixed discounts, don't allow discount to exceed total
    if (discountAmount > subtotal) {
      console.log(`Limiting fixed discount to subtotal: ${subtotal}`);
      discountAmount = subtotal;
    }
  }
  
  console.log(`Final voucher discount: ${discountAmount}`);
  return discountAmount;
};

// Export as a named constant to fix ESLint warning
const voucherService = {
  fetchVouchers,
  calculateVoucherDiscount
};

export default voucherService; 