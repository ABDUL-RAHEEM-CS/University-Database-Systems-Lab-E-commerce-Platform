// ProductService.js
// This service handles product-related operations

const API_BASE_URL = 'http://localhost:5000';

/**
 * Fetches all products from the API with better error handling
 */
export const fetchAllProducts = async () => {
  try {
    console.log("Fetching products from API...");
    
    // Log the full request URL
    const url = `${API_BASE_URL}/products`;
    console.log(`Making request to: ${url}`);
    
    // Now fetch products with no mode specified (default is same-origin)
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    // Log details about the response
    console.log(`Products API response status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }
    
    const responseText = await response.text();
    
    // Check if the response is empty
    if (!responseText.trim()) {
      console.error("Empty response from products API");
      return [];
    }
    
    // Log the raw response
    console.log(`Raw response from products API:`, responseText.substring(0, 100) + (responseText.length > 100 ? '...' : ''));
    
    // Try to parse the response as JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log(`Successfully parsed product data. Found ${data.length} products.`);
      
      // Check if data is in the expected format
      if (data.length > 0) {
        console.log('First product sample:', data[0]);
      }
    } catch (parseError) {
      console.error("Error parsing products response as JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 200) + "...");
      return [];
    }
    
    if (!Array.isArray(data)) {
      console.error("Product data is not an array:", typeof data);
      return [];
    }
    
    // Normalize product data to handle any schema differences
    const normalizedProducts = data.map(product => {
      return {
        product_id: product.product_id,
        product_name: product.product_name,
        description: product.description || "",
        price: parseFloat(product.price) || 0,
        discount_price: (product.discount_price && parseFloat(product.discount_price) > 0) 
          ? parseFloat(product.discount_price) 
          : parseFloat(product.price) || 0,
        product_link: product.product_link || "",
        pieces_sold: product.pieces_sold || '0',
        rating: parseFloat(product.rating) || 0,
        review_count: parseInt(product.review_count) || 0,
        stock_quantity: parseInt(product.stock_quantity) || 0
      };
    });
    
    console.log(`Returning ${normalizedProducts.length} normalized products`);
    return normalizedProducts;
  } catch (error) {
    console.error('Error fetching products:', error);
    return [];
  }
};

/**
 * Fetches product details for a specific product
 */
export const fetchProductDetails = async (productId) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });
    
    if (!response.ok) {
      // If specific endpoint fails, try to get the product from all products
      console.log("Product details endpoint failed, getting product from all products...");
      const allProducts = await fetchAllProducts();
      const product = allProducts.find(p => p.product_id === productId);
      
      if (product) {
        return product;
      }
      
      throw new Error('Failed to fetch product details');
    }
    
    const responseText = await response.text();
    
    if (!responseText.trim()) {
      console.error("Empty response from product details API");
      return null;
    }
    
    // Try to parse the response as JSON
    let product;
    try {
      product = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Error parsing product details response as JSON:", parseError);
      console.error("Response text:", responseText.substring(0, 200) + "...");
      return null;
    }
    
    // Normalize product data
    return {
      product_id: product.product_id,
      product_name: product.product_name,
      description: product.description || "",
      price: parseFloat(product.price) || 0,
      discount_price: (product.discount_price && parseFloat(product.discount_price) > 0) 
        ? parseFloat(product.discount_price) 
        : parseFloat(product.price) || 0,
      product_link: product.product_link || "",
      pieces_sold: product.pieces_sold || (product.product_stats && product.product_stats.pieces_sold) || '0',
      rating: parseFloat(product.rating) || (product.product_stats && parseFloat(product.product_stats.rating)) || 0,
      review_count: parseInt(product.review_count) || 0,
      stock_quantity: parseInt(product.stock_quantity) || 0,
      category: product.category || (product.category_id ? `Category ${product.category_id}` : ''),
    };
  } catch (error) {
    console.error(`Error fetching product ${productId}:`, error);
    return null;
  }
};

/**
 * Searches for products based on a query term
 */
export const searchProducts = async (query) => {
  // First try to fetch all products then filter them client-side
  try {
    const allProducts = await fetchAllProducts();
    
    if (!query.trim()) {
      return allProducts;
    }
    
    const searchTermLower = query.toLowerCase();
    
    return allProducts.filter(product => {
      const productName = (product.product_name || '').toLowerCase();
      const description = (product.description || '').toLowerCase();
      const category = (product.category || '').toLowerCase();
      
      return productName.includes(searchTermLower) || 
             description.includes(searchTermLower) ||
             category.includes(searchTermLower);
    });
  } catch (error) {
    console.error('Error searching products:', error);
    return [];
  }
};

const ProductService = {
  fetchAllProducts,
  fetchProductDetails,
  searchProducts,
};

export default ProductService; 