import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { Helmet } from "react-helmet";
import ProductDetails from "./ProductDetails";
import Cart from "./Cart";
import Admin from "./Admin";
import AdminLogin from "./AdminLogin";
import Toast, { showToast } from "./Toast";
import NavBar from "./NavBar";
import WishlistPage from "./pages/WishlistPage";
import MyOrdersScreen from "./components/MyOrdersScreen";
import HomeRatingDisplay from "./components/HomeRatingDisplay";
import CartService from './services/CartService';
import UserService from './services/UserService';
import ProductService from './services/ProductService';

// Make showToast available globally
window.showToast = showToast;

// Footer Component
function Footer() {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      showToast("Thank you for subscribing to our newsletter!", "success");
      setEmail("");
    } else {
      showToast("Please enter a valid email address", "warning");
    }
  };

  return (
    <footer className="site-footer">
      <div className="footer-container">
        <div className="footer-section about">
          <h3>About Khokhar Mart</h3>
          <p>Khokhar Mart is your one-stop shop for all your shopping needs. We provide high-quality products at competitive prices.</p>
        </div>

        <div className="footer-section quick-links">
          <h3>Quick Links</h3>
          <ul className="footer-links">
            <li><Link to="/">Home</Link></li>
            <li><Link to="/login">Login</Link></li>
            <li><Link to="/signup">Sign Up</Link></li>
            <li><a href="#terms">Terms & Conditions</a></li>
            <li><a href="#privacy">Privacy Policy</a></li>
          </ul>
        </div>

        <div className="footer-section contact">
          <h3>Contact Us</h3>
          <p><i className="fas fa-phone footer-icon"></i> +92 123 456 7890</p>
          <p><i className="fas fa-envelope footer-icon"></i> info@khokharmart.com</p>
          <p><i className="fas fa-map-marker-alt footer-icon"></i> Lahore, Pakistan</p>
        </div>

        <div className="footer-section social">
          <h3>Follow Us</h3>
          <div className="social-links">
            <a href="https://www.instagram.com/itx_abdul.raheem/" target="_blank" rel="noopener noreferrer" className="social-link">
              <i className="fab fa-instagram social-icon instagram"></i> Instagram
            </a>
            <a href="https://www.linkedin.com/in/abdul-raheem-fast/" target="_blank" rel="noopener noreferrer" className="social-link">
              <i className="fab fa-linkedin social-icon linkedin"></i> LinkedIn
            </a>
          </div>
        </div>

        <div className="footer-section newsletter">
          <h3>Newsletter</h3>
          <p>Subscribe to our newsletter for the latest updates and offers.</p>
          <form onSubmit={handleSubscribe} className="newsletter-form">
            <input
              type="email"
              placeholder="Your Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="newsletter-input"
            />
            <button type="submit" className="newsletter-button">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} Khokhar Mart. All Rights Reserved.</p>
      </div>
    </footer>
  );
}

function Home() {
  const [message, setMessage] = useState("");
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Store all products
  const [userId, setUserId] = useState(null);
  const [userName, setUserName] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [cartCount, setCartCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState(""); // Store current search query
  const [isLoading, setIsLoading] = useState(true); // Add loading state
  
  // eslint-disable-next-line no-unused-vars
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    const storedUserName = localStorage.getItem("userName");

    console.log("DEBUG - StoredUserId:", storedUserId);
    console.log("DEBUG - StoredUserName:", storedUserName);

    if (storedUserId) {
      setUserId(storedUserId);

      if (storedUserName) {
        setUserName(storedUserName);
        console.log("DEBUG - Setting userName from localStorage:", storedUserName);
      } else {
        // Fetch user info to get the name if not in localStorage
        UserService.getUserInfo(storedUserId)
          .then(data => {
            if (data.success && data.username) {
              setUserName(data.username);
              localStorage.setItem("userName", data.username);
            }
          })
          .catch(error => console.error("Error fetching user data:", error));
      }
    }
  }, []);

  // If userName is not set but stored in localStorage, use that
  useEffect(() => {
    if (!userName) {
      const storedUserName = localStorage.getItem("userName");
      if (storedUserName) {
        setUserName(storedUserName);
      }
    }
  }, [userName]);

  console.log("User ID in Home:", userId);

  useEffect(() => {
    fetch("http://localhost:5000", { 
      method: 'GET',
      headers: {
        'Accept': 'text/plain, application/json'
      }
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }
        return response.text();
      })
      .then((data) => setMessage(data))
      .catch(error => {
        console.error("Error fetching from server:", error);
        // Don't set message to error to avoid UI disruption
      });
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        console.log("Starting to fetch products from API directly");
        
        // Try a direct fetch to products endpoint
        try {
          const directResponse = await fetch("http://localhost:5000/products", {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          console.log(`Direct products fetch status: ${directResponse.status} ${directResponse.statusText}`);
          
          if (directResponse.ok) {
            const responseText = await directResponse.text();
            console.log(`Direct products response text (first 100 chars): ${responseText.substring(0, 100)}...`);
            
            try {
              const directData = JSON.parse(responseText);
              console.log(`Direct products fetch found ${directData.length} products`);
              if (directData.length > 0) {
                console.log("Sample product:", directData[0]);
                
                // Use this data directly
                const normalizedProducts = directData.map(product => ({
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
                }));
                
                setAllProducts(normalizedProducts);
                setProducts(normalizedProducts);
                console.log("Products loaded directly:", normalizedProducts.length);
                setIsLoading(false);
                return; // Skip ProductService call
              }
            } catch (parseError) {
              console.error("Error parsing direct products response:", parseError);
            }
          }
        } catch (directError) {
          console.error("Error with direct products fetch:", directError);
        }
        
        // Fallback to ProductService if direct fetch fails
        console.log("Falling back to ProductService.fetchAllProducts()");
        const data = await ProductService.fetchAllProducts();
        console.log("ProductService.fetchAllProducts returned:", data ? data.length : 0, "products");
        
        if (data && data.length > 0) {
          setAllProducts(data); // Store all products
          setProducts(data); // Display all products initially
          console.log("Products loaded:", data.length);
        } else {
          console.warn("⚠️ No products returned from API");
          showToast("No products found", "warning");
        }
      } catch (error) {
        console.error("Error in products fetch useEffect:", error);
        showToast("Failed to load products", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Handle search functionality
  useEffect(() => {
    // Function to filter products based on search query
    const filterProducts = async (query) => {
      setSearchQuery(query);

      if (!query.trim()) {
        // If no search query, show all products
        setProducts(allProducts);
        return;
      }

      try {
        const results = await ProductService.searchProducts(query);
        setProducts(results);

        // Show message about search results
        if (results.length === 0) {
          showToast(`No products found for "${query}"`, "info");
        } else {
          showToast(`Found ${results.length} products for "${query}"`, "success");
        }
      } catch (error) {
        console.error("Error searching products:", error);
      }
    };

    // Listen for search events from NavBar
    const handleSearch = (event) => {
      filterProducts(event.detail.query);
    };

    // Listen for reset search event
    const handleResetSearch = () => {
      setSearchQuery("");
      setProducts(allProducts);
    };

    window.addEventListener('product-search', handleSearch);
    window.addEventListener('reset-product-search', handleResetSearch);

    // Clean up event listeners
    return () => {
      window.removeEventListener('product-search', handleSearch);
      window.removeEventListener('reset-product-search', handleResetSearch);
    };
  }, [allProducts]); // Run when allProducts changes

  // Fetch cart count when component mounts and when userId changes
  useEffect(() => {
    if (userId) {
      CartService.fetchCart(userId)
        .then(cart => setCartCount(cart.count))
        .catch(error => console.error("Error fetching cart:", error));
    }
  }, [userId]);

  // Update handleAddToCart to update cart count
  const handleAddToCart = (productId) => {
    if (!userId) {
      showToast("Please login to add items to cart.", "warning");
      return;
    }

    CartService.addToCart(userId, productId, 1)
      .then(result => {
        if (result.success) {
          setCartCount(prevCount => prevCount + 1);
          showToast("Item added to cart successfully", "success");

          // Dispatch custom event to update cart count in NavBar
          const event = new CustomEvent('cart-updated', {
            detail: {
              action: 'increment',
              amount: 1
            }
          });
          window.dispatchEvent(event);
        } else {
          showToast("Failed to add item to cart", "error");
        }
      })
      .catch(error => {
        console.error("Error adding to cart:", error);
        showToast("Failed to add item to cart", "error");
      });
  };

  // Add this function to handle sign out
  // eslint-disable-next-line no-unused-vars
  const handleSignOut = () => {
    // Clear user data from localStorage
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");

    // Reset state
    setUserId(null);
    setUserName("");
    setCartCount(0); // Reset cart count

    // Show sign out success toast
    showToast("Signed out successfully", "success");

    // Refresh the page to ensure all user-specific content is removed
    window.location.href = "/";
  };

  // Listen for sign out events from other components
  useEffect(() => {
    const handleUserSignOut = () => {
      setCartCount(0);
      setUserId(null);
      setUserName("");
    };

    window.addEventListener('user-signed-out', handleUserSignOut);

    return () => {
      window.removeEventListener('user-signed-out', handleUserSignOut);
    };
  }, []);

  // Listen for review updates to refresh product data
  useEffect(() => {
    const handleReviewsUpdated = async (event) => {
      const { productId } = event.detail;
      console.log('Reviews updated for product:', productId);
      
      try {
        // First try to fetch the specific product
        const singleProductResponse = await fetch(`http://localhost:5000/products/${productId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (singleProductResponse.ok) {
          const updatedProduct = await singleProductResponse.json();
          
          // Update both allProducts and products arrays
          const updateProductData = (productsArray) => {
            return productsArray.map(product => {
              if (product.product_id === parseInt(productId)) {
                return {
                  ...product,
                  rating: parseFloat(updatedProduct.rating) || 0,
                  review_count: parseInt(updatedProduct.review_count) || 0
                };
              }
              return product;
            });
          };
          
          setAllProducts(prevProducts => updateProductData(prevProducts));
          setProducts(prevProducts => updateProductData(prevProducts));
          
          console.log('Product rating and review count updated on home page');
          showToast('Product rating updated on home page', 'success');
        } else {
          // Fallback: Refresh all products if single product fetch fails
          console.log('Single product fetch failed, refreshing all products');
          const allProductsResponse = await fetch("http://localhost:5000/products", {
            method: 'GET',
            headers: {
              'Accept': 'application/json'
            }
          });
          
          if (allProductsResponse.ok) {
            const allProductsData = await allProductsResponse.json();
            const normalizedProducts = allProductsData.map(product => ({
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
            }));
            
            setAllProducts(normalizedProducts);
            setProducts(normalizedProducts);
            console.log('All products refreshed after review update');
          }
        }
      } catch (error) {
        console.error('Error updating product data after review change:', error);
        // Silent fail - don't show error to user
      }
    };

    window.addEventListener('reviews-updated', handleReviewsUpdated);

    return () => {
      window.removeEventListener('reviews-updated', handleReviewsUpdated);
    };
  }, []);

  const handleViewMyOrders = () => {
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      showToast("Please login to view your orders", "warning");
      return;
    }
    
    navigate("/my-orders");
  };

  return (
    <div>
      <div style={{ textAlign: "right", margin: "1rem" }}>
        <button onClick={handleViewMyOrders} className="view-orders-btn">
          View My Orders
        </button>

      </div>

      <Helmet>
        <title>Khokhar Mart - Home</title>
        <meta name="description" content="Shop the best products at Khokhar Mart" />
      </Helmet>

      {searchQuery && (
        <div className="search-results-header">
          <h2>Search Results for: "{searchQuery}"</h2>
          <button
            onClick={() => {
              setSearchQuery("");
              setProducts(allProducts);
            }}
            className="clear-search-btn"
          >
            Clear Search
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="loading-container">
          <p>Loading products...</p>
        </div>
      ) : products.length > 0 ? (
        <div className="products-flex">
          {products.map((product, index) => (
            <Link
              to="/productDetails"
              state={product}
              className="complete_product"
              key={index}
            >
              <div>
                <img className="products" src={product.product_link} alt={product.product_name} />
                <p className="product_text">{product.product_name}</p>

                <div className="product-footer">
                  <div className="price-info">
                    <p className="productRS">Rs.</p>
                    <p className="discount_price">{product.discount_price}</p>
                    <p className="product_price">{product.price}</p>
                    <p className="product_sold">{product.pieces_sold}+ sold</p>
                  </div>
                  <button
                    className="cart-button"
                    onClick={(e) => {
                      e.preventDefault(); // stop Link navigation
                      handleAddToCart(product.product_id);
                    }}
                  >
                    🛒
                  </button>
                </div>

                <HomeRatingDisplay 
                  rating={product.rating} 
                  reviewCount={product.review_count} 
                />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="no-products-found">
          <p>No products found matching your search criteria.</p>
          <button
            onClick={() => {
              setSearchQuery("");
              setIsLoading(true);
              
              // Reload products from API
              fetch("http://localhost:5000/products", {
                method: 'GET',
                headers: {
                  'Accept': 'application/json'
                }
              })
                .then(response => response.json())
                .then(data => {
                  console.log(`Reloaded ${data.length} products`);
                  // Normalize the products
                  const normalizedProducts = data.map(product => ({
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
                  }));
                  setAllProducts(normalizedProducts);
                  setProducts(normalizedProducts);
                  setIsLoading(false);
                })
                .catch(error => {
                  console.error("Error reloading products:", error);
                  setProducts(allProducts); // Fallback to any existing products
                  setIsLoading(false);
                });
            }}
            className="back-to-all-products"
          >
            View All Products
          </button>
        </div>
      )}

      <p>{message}</p>
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const { email, password } = formData;

    if (!email || !password) {
      showToast("Please fill in both fields.", "warning");
      return;
    }

    try {
      setIsLoading(true);
      console.log("Attempting login with:", { email });

      // Structure login data according to what the server expects
      const loginData = {
        email: email,
        password: password
      };

      console.log("Sending login data:", loginData);

      const response = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(loginData)
      });

      // Parse response as text first to handle potential non-JSON responses
      const responseText = await response.text();
      console.log("Server response status:", response.status);
      console.log("Server response text:", responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
        console.log("Parsed response data:", data);
      } catch (e) {
        console.error("Failed to parse response as JSON:", responseText);
        throw new Error("Unexpected response from server: " + responseText);
      }

      if (response.ok && data.success) {
        // Store user info in localStorage
        localStorage.setItem("userId", data.userId);

        if (data.username) {
          localStorage.setItem("userName", data.username);
        }

        showToast("Login Successful!", "success");

        // Dispatch an event to update cart and user info in navbar
        const event = new CustomEvent('user-logged-in', {
          detail: { 
            userId: data.userId, 
            userName: data.username
          }
        });
        window.dispatchEvent(event);

        // Navigate to home page
        navigate("/");
      } else {
        const errorMessage = data.error || "Login Failed. Invalid email or password.";
        console.error("Login error:", errorMessage);
        showToast(errorMessage, "error");
      }
    } catch (err) {
      console.error("Login Error:", err);
      showToast("Error: " + (err.message || "Connection failed. Try again later."), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <Helmet>
        <title>Login - Khokhar Mart</title>
        <meta name="description" content="Login to your Khokhar Mart account" />
      </Helmet>
      <div className="login-form">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '32px', margin: '0 0 5px 0' }}>KM</h2>
          <p style={{ fontSize: '16px', color: '#666', margin: 0 }}>Khokhar Mart</p>
        </div>

        <h1>Login</h1>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            name="email"
            placeholder="Enter Email"
            value={formData.email}
            onChange={handleChange}
            disabled={isLoading}
          />
          <input
            type="password"
            name="password"
            placeholder="Enter Password"
            value={formData.password}
            onChange={handleChange}
            disabled={isLoading}
          />

          <button type="submit" disabled={isLoading}>
            {isLoading && <span className="spinner"></span>}
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <div className="signup-prompt">
            Don't have an Account?{" "}
            <Link to="/signup" className="signup-link">
              Sign Up
            </Link>
          </div>

          <div className="line"></div>

          <div className="admin-login">
            <span>Login as </span>
            <Link to="/admin/login" className="admin-link">
              Admin
            </Link>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/home" style={{ color: '#666', fontSize: '14px', textDecoration: 'none' }}>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}

function Signup() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    street_no: "",
    house_no: "",
    block_name: "",
    society: "",
    city: "",
    country: "",
  });

  const [errors, setErrors] = useState({});
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields validation according to the SQL schema
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";
    if (!formData.password.trim()) newErrors.password = "Password is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    
    // Address validation (required fields according to schema)
    if (!formData.street_no) newErrors.street_no = "Street number is required";
    if (!formData.house_no) newErrors.house_no = "House number is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.country.trim()) newErrors.country = "Country is required";
    
    // Numeric validation
    if (formData.street_no && (isNaN(Number(formData.street_no)) || Number(formData.street_no) <= 0)) 
      newErrors.street_no = "Must be a positive number";
    if (formData.house_no && (isNaN(Number(formData.house_no)) || Number(formData.house_no) <= 0)) 
      newErrors.house_no = "Must be a positive number";
    
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) 
      newErrors.email = "Invalid email format";
    
    // Password strength validation
    if (formData.password && formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    
    // Phone number validation - ensure it's exactly in the format the server expects
    // The database is expecting a plain digit-only string
    let phoneDigitsOnly = formData.phone.replace(/[^0-9]/g, '');
    if (formData.phone && (phoneDigitsOnly.length < 10 || phoneDigitsOnly.length > 15))
      newErrors.phone = "Phone number must be between 10-15 digits";
    
    console.log("Form validation errors:", newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showToast("Please correct the errors in the form.", "warning");
      return;
    }

    // Extra validation for phone number format
    let phoneNumber = formData.phone.replace(/[^0-9]/g, '');
    if (phoneNumber.length < 10 || phoneNumber.length > 15) {
      showToast("Phone number must be 10-15 digits", "warning");
      setErrors(prev => ({
        ...prev,
        phone: "Phone number must be 10-15 digits"
      }));
      return;
    }

    setIsLoading(true);

    try {
      // Ensure all number fields are properly converted
      const streetNo = formData.street_no ? parseInt(formData.street_no, 10) : 0;
      const houseNo = formData.house_no ? parseInt(formData.house_no, 10) : 0;
      
      // Make sure we don't send any potentially problematic values
      if (isNaN(streetNo) || isNaN(houseNo)) {
        throw new Error("Street number and house number must be valid numbers");
      }
      
      // Structure the data to match the exact format the server expects
      const signupData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        phone: phoneNumber,
        street_no: streetNo,
        house_no: houseNo,
        block_name: formData.block_name ? formData.block_name.trim() : "",
        society: formData.society ? formData.society.trim() : "",
        city: formData.city.trim(),
        country: formData.country.trim()
      };

      console.log("Sending signup data:", signupData);
      console.log("Data validation check:");
      console.log("- phone:", typeof phoneNumber, phoneNumber);
      console.log("- street_no:", typeof streetNo, streetNo);
      console.log("- house_no:", typeof houseNo, houseNo);
      
      // Check all required fields again
      const requiredFields = ['name', 'email', 'password', 'phone', 'street_no', 'house_no', 'city', 'country'];
      const missingFields = requiredFields.filter(field => !signupData[field] && signupData[field] !== 0);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      const requestBody = JSON.stringify(signupData);
      console.log("Request body as string:", requestBody);
      
      // Define API endpoint - make sure it matches the server
      const apiEndpoint = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/signup' 
        : 'http://localhost:5001/signup';  // Fallback to alternative port
      
      console.log("Using API endpoint:", apiEndpoint);
      
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: requestBody
      });

      console.log("Response status:", response.status);
      
      // Parse response
      const responseText = await response.text();
      console.log("Server response text:", responseText);
      
      try {
        // Try to parse as JSON (might be plain text error)
        const data = JSON.parse(responseText);
        console.log("Parsed response data:", data);
        
        if (response.ok && data.success) {
          showToast("Sign Up Successful!", "success");
          navigate("/login");
        } else {
          const errorMessage = data.error || "Failed to create account";
          console.error("Signup failed:", errorMessage);
          
          // Specific error handling
          if (errorMessage.includes("database error")) {
            showToast("Database error - Please try again later or contact support", "error");
          } else {
            showToast("Error: " + errorMessage, "error");
          }
        }
      } catch (e) {
        console.error("Failed to parse response as JSON:", responseText);
        if (responseText.includes("database error")) {
          showToast("Database error - Please try again later", "error");
        } else {
          showToast("Error: Unexpected server response", "error");
        }
      }
    } catch (err) {
      console.error("Signup error:", err.message);
      showToast("Error: " + (err.message || "Failed to connect to server"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="signup">
      <Helmet>
        <title>Sign Up - Khokhar Mart</title>
        <meta name="description" content="Create a new account at Khokhar Mart" />
      </Helmet>
      <div className="inner">
        <div className="signup-logo">
          <h2>KM</h2>
          <p>Khokhar Mart</p>
        </div>

        <h2 className="heading">CREATE YOUR ACCOUNT</h2>

        <form onSubmit={handleSignup} className="signup-form">
          {/* Personal Information */}
          <div className="form-section">
            <h3 className="section-title">Personal Information</h3>
            
            <div className={`input ${errors.name ? 'input-error' : ''}`}>
              <label htmlFor="name">Full Name <span className="required">*</span></label>
              <input 
                id="name"
                type="text" 
                name="name" 
                placeholder="Enter your full name" 
                value={formData.name} 
                onChange={handleChange} 
              />
              {errors.name && <div className="error-message">{errors.name}</div>}
            </div>

            <div className={`input ${errors.email ? 'input-error' : ''}`}>
              <label htmlFor="email">Email Address <span className="required">*</span></label>
              <input 
                id="email"
                type="email" 
                name="email" 
                placeholder="Enter your email address" 
                value={formData.email} 
                onChange={handleChange} 
              />
              {errors.email && <div className="error-message">{errors.email}</div>}
            </div>

            <div className={`input ${errors.password ? 'input-error' : ''}`}>
              <label htmlFor="password">Password <span className="required">*</span></label>
              <div className="password-field">
                <input 
                  id="password"
                  type={passwordVisible ? "text" : "password"} 
                  name="password" 
                  placeholder="Create a password" 
                  value={formData.password} 
                  onChange={handleChange} 
                />
                <button 
                  type="button" 
                  className="toggle-password"
                  onClick={togglePasswordVisibility}
                >
                  <i className={`fas fa-${passwordVisible ? 'eye-slash' : 'eye'}`}></i>
                </button>
              </div>
              {errors.password && <div className="error-message">{errors.password}</div>}
            </div>

            <div className={`input ${errors.phone ? 'input-error' : ''}`}>
              <label htmlFor="phone">Phone Number <span className="required">*</span></label>
              <input 
                id="phone"
                type="tel" 
                name="phone" 
                placeholder="Enter your phone number" 
                value={formData.phone} 
                onChange={handleChange} 
              />
              {errors.phone && <div className="error-message">{errors.phone}</div>}
            </div>
          </div>

          

          {/* Address Information */}
          <div className="form-section">
            <h3 className="section-title">Address Information</h3>
            
            <div className="input-row">
              <div className={`input ${errors.street_no ? 'input-error' : ''}`}>
                <label htmlFor="street_no">Street No. <span className="required">*</span></label>
                <input 
                  id="street_no"
                  type="number" 
                  name="street_no" 
                  placeholder="Street No." 
                  value={formData.street_no} 
                  onChange={handleChange} 
                />
                {errors.street_no && <div className="error-message">{errors.street_no}</div>}
              </div>

              <div className={`input ${errors.house_no ? 'input-error' : ''}`}>
                <label htmlFor="house_no">House No. <span className="required">*</span></label>
                <input 
                  id="house_no"
                  type="number" 
                  name="house_no" 
                  placeholder="House No." 
                  value={formData.house_no} 
                  onChange={handleChange} 
                />
                {errors.house_no && <div className="error-message">{errors.house_no}</div>}
              </div>
            </div>

            <div className="input-row">
              <div className="input">
                <label htmlFor="block_name">Block Name</label>
                <input 
                  id="block_name"
                  type="text" 
                  name="block_name" 
                  placeholder="Block Name (Optional)" 
                  value={formData.block_name} 
                  onChange={handleChange} 
                />
              </div>

              <div className="input">
                <label htmlFor="society">Society/Area</label>
                <input 
                  id="society"
                  type="text" 
                  name="society" 
                  placeholder="Society/Area (Optional)" 
                  value={formData.society} 
                  onChange={handleChange} 
                />
              </div>
            </div>

            <div className="input-row">
              <div className={`input ${errors.city ? 'input-error' : ''}`}>
                <label htmlFor="city">City <span className="required">*</span></label>
                <input 
                  id="city"
                  type="text" 
                  name="city" 
                  placeholder="City" 
                  value={formData.city} 
                  onChange={handleChange} 
                />
                {errors.city && <div className="error-message">{errors.city}</div>}
              </div>

              <div className={`input ${errors.country ? 'input-error' : ''}`}>
                <label htmlFor="country">Country <span className="required">*</span></label>
                <input 
                  id="country"
                  type="text" 
                  name="country" 
                  placeholder="Country" 
                  value={formData.country} 
                  onChange={handleChange} 
                />
                {errors.country && <div className="error-message">{errors.country}</div>}
              </div>
            </div>
          </div>

          <div className="required-fields-note">
            <span className="required">*</span> Required fields
          </div>

          <div className="click_">
            <button 
              type="submit" 
              className="signup-button"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </div>
        </form>

        <div className="signup_login">
          Already have an Account?
          <Link to="/login" className="login-link"> Login </Link>
        </div>

        <div className="line"></div>

        <div className="disclaimer">
          By creating an account, you agree to Khokhar Mart's Terms of Service and Privacy Policy.
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Helmet>
        <title>Khokhar Mart</title>
        <meta name="description" content="Your one-stop shop for all your shopping needs" />
      </Helmet>
      <Toast />
      <NavBar />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<><Home /><Footer /></>} />
        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route path="/productDetails" element={<><ProductDetails /><Footer /></>} />
        <Route path="/cart/:userId" element={<><Cart /><Footer /></>} />
        <Route path="/wishlist" element={<><WishlistPage /><Footer /></>} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/my-orders" element={<><MyOrdersScreen /><Footer /></>} />
      </Routes>
    </Router>
  );
}

export default App;