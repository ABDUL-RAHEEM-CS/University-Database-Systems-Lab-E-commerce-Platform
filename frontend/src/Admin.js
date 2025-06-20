import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import './admin_override.css';

function Admin() {
  const navigate = useNavigate();
  
  // State Management
  const [activeMenu, setActiveMenu] = useState("");
  const [selectedSubmenu, setSelectedSubmenu] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Data States
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [vouchers, setVouchers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [admin, setAdmin] = useState(null);
  
  // Form States
  const [searchTerm, setSearchTerm] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [stockToAdd, setStockToAdd] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Add confirmation dialog states
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogData, setConfirmDialogData] = useState({
    title: "",
    message: "",
    onConfirm: null,
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "danger" // danger, warning, info
  });
  // Add voucher form state
  const [voucherForm, setVoucherForm] = useState({
    code: '',
    discount_amount: '',
    min_order_value: '',
    expiry_date: '',
    usage_limit: '1'
  });
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    description: "",
    price: "",
    discount_price: "",
    stock_quantity: "",
    category: "",
    product_link: "",
    pieces_sold: 0,
    rating: 0,
    discount_start: "",
    discount_end: "",
  });
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    address: "",
    phone: "",
  });
  
  // Admin profile image state
  const [adminProfileImage, setAdminProfileImage] = useState(null);

  // Authentication Check
  useEffect(() => {
    const isAdmin = localStorage.getItem('isAdmin');
    const adminId = localStorage.getItem('adminId');
    
    if (!isAdmin || !adminId) {
      navigate('/admin/login');
    }
    
    // Load saved profile image or set default to Admin Logo
    const savedImage = localStorage.getItem('adminProfileImage');
    if (savedImage) {
      setAdminProfileImage(savedImage);
    } else {
      setAdminProfileImage("/Admin Logo.png");
    }
  }, [navigate]);

  // Data Fetching Effects
  useEffect(() => {
    if (selectedSubmenu === "view_users") {
      fetchUsers();
    }
  }, [selectedSubmenu]);

  useEffect(() => {
    if (selectedSubmenu === "view_products") {
      fetchProducts();
    }
  }, [selectedSubmenu]);

  useEffect(() => {
    if (selectedSubmenu === "view_orders") {
      fetchOrders();
    }
  }, [selectedSubmenu]);

  useEffect(() => {
    if (selectedSubmenu === "all_voucher") {
      fetchVouchers();
    }
  }, [selectedSubmenu]);

  useEffect(() => {
    if (selectedSubmenu === "view_inventory") {
      fetchInventory();
    }
  }, [selectedSubmenu]);

  useEffect(() => {
    if (selectedSubmenu === "view_reviews") {
      fetchReviews();
    }
  }, [selectedSubmenu]);

  useEffect(() => {
    if (selectedSubmenu === "view_admin_profile") {
      fetchAdminProfile();
    }
  }, [selectedSubmenu]);

  // Additional useEffect hooks for new menu items
  useEffect(() => {
    if (selectedSubmenu === "add_stock" && products.length === 0) {
      fetchProducts();
    }
  }, [selectedSubmenu, products.length]);

  useEffect(() => {
    if (selectedSubmenu === "remove_user" && users.length === 0) {
      fetchUsers();
    }
  }, [selectedSubmenu, users.length]);

  useEffect(() => {
    if (selectedSubmenu === "remove_product" && products.length === 0) {
      fetchProducts();
    }
  }, [selectedSubmenu, products.length]);

  useEffect(() => {
    if (selectedSubmenu === "cancel_order" && orders.length === 0) {
      fetchOrders();
    }
  }, [selectedSubmenu, orders.length]);

  // Voucher useEffect hooks
  useEffect(() => {
    if (selectedSubmenu === "remove_voucher" && vouchers.length === 0) {
      fetchVouchers();
    }
  }, [selectedSubmenu, vouchers.length]);

  // API Functions
  const fetchUsers = async () => {
    try {
      const response = await fetch("http://localhost:5000/users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("http://localhost:5000/products");
      const data = await response.json();
      setProducts(data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch("http://localhost:5000/orders");
      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    }
  };

  const fetchVouchers = async () => {
    try {
      const response = await fetch("http://localhost:5000/admin/vouchers");
      const data = await response.json();
      setVouchers(data);
    } catch (error) {
      console.error("Error fetching vouchers:", error);
    }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch("http://localhost:5000/inventory");
      const data = await response.json();
      setInventory(data);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await fetch("http://localhost:5000/reviews");
      const data = await response.json();
      setReviews(data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    }
  };

  const fetchAdminProfile = async () => {
    try {
      const response = await fetch("http://localhost:5000/admin");
      const data = await response.json();
      setAdmin(data);
    } catch (error) {
      console.error("Error fetching admin profile:", error);
    }
  };

  // Menu Functions
  const toggleMenu = (menu) => {
    setActiveMenu(activeMenu === menu ? "" : menu);
  };

  const handleSubmenuClick = (submenu) => {
    setSelectedSubmenu(submenu);
    setMobileMenuOpen(false);
  };

  const handleSignOut = () => {
    // Show toast notification
    if (window.showToast) {
      window.showToast("Admin signed out successfully", "success");
    }

    // Clear admin data from localStorage
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('adminId');
    localStorage.removeItem('adminName');
    
    // Dispatch an event to notify NavBar about admin sign out
    const event = new CustomEvent('admin-signed-out');
    window.dispatchEvent(event);
    
    // Navigate to admin login page
    navigate('/admin/login');
  };

  // Filter users based on search
  const filteredUsers = searchTerm
    ? users.filter((user) =>
        user.user_id.toString().includes(searchTerm.trim()) ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : users;

  // Status change handler
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Show loading toast
      window.showToast(`Updating order #${orderId} status to ${newStatus}...`, "info");
      
      const response = await fetch(`http://localhost:5000/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      if (data.success) {
        setOrders(orders.map((order) =>
          order.order_id === orderId
            ? { ...order, order_status: newStatus }
            : order
        ));
        window.showToast(`✅ Order #${orderId} status successfully updated to ${newStatus}`, "success");
      } else {
        window.showToast("❌ Failed to update order status", "error");
      }
    } catch (error) {
      console.error("Failed to update order status:", error);
      window.showToast("❌ Failed to update order status", "error");
    }
  };

  // Navigation menu configuration
  const menuItems = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: "🏠",
      action: () => setSelectedSubmenu(""),
    },
    {
      id: "profile",
      title: "Admin Profile",
      icon: "👤",
      submenu: [
        { id: "view_admin_profile", title: "View Profile" },
        { id: "change_admin_password", title: "Change Password" },
      ],
    },
    {
      id: "users",
      title: "Users",
      icon: "👥",
      submenu: [
        { id: "view_users", title: "View All Users" },
        { id: "add_user", title: "Add User" },
        { id: "remove_user", title: "Remove User" },
      ],
    },
    {
      id: "products",
      title: "Products",
      icon: "📦",
      submenu: [
        { id: "view_products", title: "View All Products" },
        { id: "add_product", title: "Add Product" },
        { id: "add_stock", title: "Add Stock" },
        { id: "remove_product", title: "Remove Product" },
      ],
    },
    {
      id: "orders",
      title: "Orders",
      icon: "📋",
      submenu: [
        { id: "view_orders", title: "View Orders" },
        { id: "cancel_order", title: "Cancel Order" },
      ],
    },
    {
      id: "vouchers",
      title: "Vouchers",
      icon: "🎟️",
      submenu: [
        { id: "all_voucher", title: "View All Vouchers" },
        { id: "add_voucher", title: "Add Voucher" },
        { id: "remove_voucher", title: "Remove Voucher" },
      ],
    },
    {
      id: "inventory",
      title: "Inventory",
      icon: "📊",
      action: () => setSelectedSubmenu("view_inventory"),
    },
    {
      id: "reviews",
      title: "Reviews",
      icon: "⭐",
      action: () => setSelectedSubmenu("view_reviews"),
    },
  ];

  // Additional handler functions for admin operations
  const handleAddStock = async (productId, stockToAdd) => {
    try {
      const response = await fetch("http://localhost:5000/products/add-stock", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product_id: parseInt(productId),
          stock_quantity: parseInt(stockToAdd),
        }),
      });

      const data = await response.json();
      if (data.success) {
        window.showToast(`Stock added successfully to product #${productId}`, "success");
        fetchProducts(); // Refresh products
        fetchInventory(); // Refresh inventory
      } else {
        window.showToast("Failed to add stock", "error");
      }
    } catch (error) {
      console.error("Error adding stock:", error);
      window.showToast("Failed to add stock", "error");
    }
  };

  const handleRemoveUser = (userId) => {
    showConfirmationDialog(
      "Remove User",
      `Are you sure you want to remove user #${userId}? This action cannot be undone.`,
      async () => {
        try {
          // Show loading toast
          window.showToast(`Removing user #${userId}...`, "info");
          
          const response = await fetch(`http://localhost:5000/users/delete/${userId}`, {
            method: "DELETE",
          });

          const data = await response.json();
          if (data.success) {
            window.showToast(`✅ User #${userId} removed successfully`, "success");
            fetchUsers(); // Refresh users list
          } else {
            window.showToast(`❌ ${data.error || "Failed to remove user"}`, "error");
          }
        } catch (error) {
          console.error("Error removing user:", error);
          window.showToast("❌ Failed to remove user - Server error", "error");
        }
        closeConfirmationDialog();
      },
      "danger",
      "Remove User",
      "Cancel"
    );
  };

  const handleRemoveProduct = (productId) => {
    showConfirmationDialog(
      "Remove Product",
      `Are you sure you want to remove product #${productId}? This action cannot be undone.`,
      async () => {
        try {
          // Show loading toast
          window.showToast(`Removing product #${productId}...`, "info");
          
          const response = await fetch(`http://localhost:5000/products/delete/${productId}`, {
            method: "DELETE",
          });

          const data = await response.json();
          if (data.success) {
            window.showToast(`✅ Product #${productId} removed successfully`, "success");
            fetchProducts(); // Refresh products list
          } else {
            window.showToast(`❌ ${data.error || "Failed to remove product"}`, "error");
          }
        } catch (error) {
          console.error("Error removing product:", error);
          window.showToast("❌ Failed to remove product - Server error", "error");
        }
        closeConfirmationDialog();
      },
      "danger",
      "Remove Product",
      "Cancel"
    );
  };

  const handleCancelOrder = (orderId, customerName) => {
    showConfirmationDialog(
      "Cancel Order",
      `Are you sure you want to cancel Order #${orderId}${customerName ? ` for ${customerName}` : ''}? This action cannot be undone.`,
      async () => {
        try {
          // Show loading toast
          window.showToast(`Cancelling order #${orderId}...`, "info");
          
          const response = await fetch(`http://localhost:5000/orders/${orderId}/cancel`, {
            method: "PUT",
          });

          const data = await response.json();
          if (data.success) {
            window.showToast(`✅ Order #${orderId} cancelled successfully`, "success");
            fetchOrders(); // Refresh orders list
          } else {
            window.showToast(`❌ ${data.error || "Failed to cancel order"}`, "error");
          }
        } catch (error) {
          console.error("Error cancelling order:", error);
          window.showToast("❌ Failed to cancel order - Server error", "error");
        }
        closeConfirmationDialog();
      },
      "warning",
      "Cancel Order",
      "Keep Order"
    );
  };

  // eslint-disable-next-line no-unused-vars
  const handleAddVoucher = async (voucherData) => {
    try {
      const response = await fetch("http://localhost:5000/admin/vouchers", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(voucherData),
      });

      const data = await response.json();
      if (data.success) {
        window.showToast("Voucher added successfully", "success");
        fetchVouchers(); // Refresh vouchers list
      } else {
        window.showToast("Failed to add voucher", "error");
      }
    } catch (error) {
      console.error("Error adding voucher:", error);
      window.showToast("Failed to add voucher", "error");
    }
  };

  const handleRemoveVoucher = (voucherId, voucherCode) => {
    showConfirmationDialog(
      "Remove Voucher",
      `Are you sure you want to remove voucher "${voucherCode}" (ID: ${voucherId})? This action cannot be undone.`,
      async () => {
        try {
          // Show loading toast
          window.showToast(`Removing voucher #${voucherId}...`, "info");
          
          const response = await fetch(`http://localhost:5000/admin/vouchers/${voucherId}`, {
            method: "DELETE",
          });

          const data = await response.json();
          if (data.success) {
            window.showToast(`✅ Voucher "${voucherCode}" removed successfully`, "success");
            fetchVouchers(); // Refresh vouchers list
          } else {
            window.showToast(`❌ ${data.error || "Failed to remove voucher"}`, "error");
          }
        } catch (error) {
          console.error("Error removing voucher:", error);
          window.showToast("❌ Failed to remove voucher - Server error", "error");
        }
        closeConfirmationDialog();
      },
      "danger",
      "Remove Voucher",
      "Cancel"
    );
  };

  const handleChangePassword = async (currentPassword, newPassword) => {
    try {
      // Show loading toast
      window.showToast("Changing password...", "info");
      
      const response = await fetch("http://localhost:5000/admin/change-password", {
        method: "POST", // Use POST route which validates current password
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminId: parseInt(localStorage.getItem('adminId')),
          currentPassword: currentPassword,
          newPassword: newPassword,
        }),
      });

      const data = await response.json();
      if (data.success) {
        window.showToast("✅ Password changed successfully", "success");
        // Clear form fields
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        window.showToast(`❌ ${data.error || "Failed to change password"}`, "error");
      }
    } catch (error) {
      console.error("Error changing password:", error);
      window.showToast("❌ Failed to change password - Server error", "error");
    }
  };

  // Form submission handler for password change
  const handlePasswordFormSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      window.showToast("Please fill in all password fields", "warning");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      window.showToast("New password and confirmation don't match", "warning");
      return;
    }
    
    if (newPassword.length < 6) {
      window.showToast("New password must be at least 6 characters long", "warning");
      return;
    }
    
    if (currentPassword === newPassword) {
      window.showToast("New password must be different from current password", "warning");
      return;
    }
    
    await handleChangePassword(currentPassword, newPassword);
  };

  // Helper function to show confirmation dialog
  const showConfirmationDialog = (title, message, onConfirm, type = "danger", confirmText = "Confirm", cancelText = "Cancel") => {
    setConfirmDialogData({
      title,
      message,
      onConfirm,
      confirmText,
      cancelText,
      type
    });
    setShowConfirmDialog(true);
  };

  // Helper function to close confirmation dialog
  const closeConfirmationDialog = () => {
    setShowConfirmDialog(false);
    setConfirmDialogData({
      title: "",
      message: "",
      onConfirm: null,
      confirmText: "Confirm",
      cancelText: "Cancel",
      type: "danger"
    });
  };

  // Voucher form submit handler
  const handleVoucherSubmit = async (e) => {
    e.preventDefault();
    try {
      // Show loading toast
      window.showToast("Creating voucher...", "info");
      
      const response = await fetch('http://localhost:5000/admin/vouchers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(voucherForm),
      });

      const data = await response.json();
      if (data.success) {
        window.showToast('✅ Voucher created successfully!', 'success');
        // Reset form
        setVoucherForm({
          code: '',
          discount_amount: '',
          min_order_value: '',
          expiry_date: '',
          usage_limit: '1'
        });
        fetchVouchers(); // Refresh vouchers list
      } else {
        window.showToast(`❌ ${data.error || 'Failed to create voucher'}`, 'error');
      }
    } catch (error) {
      console.error('Error creating voucher:', error);
      window.showToast('❌ Failed to create voucher - Server error', 'error');
    }
  };

  // Handle profile image change
  const handleProfileImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check file size (limit to 5MB)
      if (file.size > 5 * 1024 * 1024) {
        window.showToast("Image size should be less than 5MB", "error");
        return;
      }

      // Check file type
      if (!file.type.startsWith('image/')) {
        window.showToast("Please select a valid image file", "error");
        return;
      }

      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setAdminProfileImage(e.target.result);
        // Store in localStorage to persist across sessions
        localStorage.setItem('adminProfileImage', e.target.result);
        window.showToast("Profile picture updated successfully", "success");
      };
      reader.readAsDataURL(file);
    }
  };

  // Render functions
  const renderSidebar = () => (
    <aside className={`admin-sidebar ${mobileMenuOpen ? 'mobile-open' : ''}`}>
      <div className="sidebar-header">
        <h1 className="admin-title">Admin Panel</h1>
        <p className="admin-subtitle">Khokhar Mart</p>
      </div>
      
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <div key={item.id} className="nav-section">
            <div className="nav-item">
              <div
                className={`nav-link ${activeMenu === item.id ? 'active expanded' : ''}`}
                onClick={() => item.action ? item.action() : toggleMenu(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-text">{item.title}</span>
                {item.submenu && <span className="nav-arrow">▶</span>}
              </div>
              
              {item.submenu && activeMenu === item.id && (
                <div className="submenu">
                  {item.submenu.map((subitem) => (
                    <div
                      key={subitem.id}
                      className={`submenu-item ${selectedSubmenu === subitem.id ? 'active' : ''}`}
                      onClick={() => handleSubmenuClick(subitem.id)}
                    >
                      {subitem.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </nav>
      
      <div className="signout-section">
        <button className="signout-btn" onClick={handleSignOut}>
          🚪 Sign Out
        </button>
      </div>
    </aside>
  );

  const renderDashboard = () => (
    <div className="dashboard-welcome">
      <div className="welcome-icon">🎛️</div>
      <h1 className="welcome-title">Welcome to Admin Dashboard</h1>
      <p className="welcome-message">
        Select an option from the sidebar to manage users, products, orders, vouchers, or view reports.
        Use the navigation menu to access different sections of the admin panel.
      </p>
    </div>
  );

  const renderUsers = () => (
    <div className="data-table-container">
      <div className="table-header">
        <h2 className="table-title">All Users</h2>
        <p className="table-count">{filteredUsers.length} users found</p>
      </div>
      
      <div style={{ padding: '20px' }}>
        <div className="search-container">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search by User ID, Name, or Email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      
      <div className="table-content">
        {filteredUsers.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.user_id}>
                  <td>{user.user_id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || 'N/A'}</td>
                  <td>
                    {user.street_no && user.house_no && user.city && user.country
                      ? `${user.street_no} ${user.house_no}, ${user.block_name || ''} ${user.society || ''}, ${user.city}, ${user.country}`.replace(/\s+/g, ' ').trim()
                      : 'Address not provided'
                    }
                  </td>
                  <td>{new Date(user.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">👥</div>
            <div className="no-data-message">No users found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="data-table-container">
      <div className="table-header">
        <h2 className="table-title">All Products</h2>
        <p className="table-count">{products.length} products found</p>
      </div>
      
      <div className="table-content">
        {products.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>ID</th>
                <th>Name</th>
                <th>Description</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Stock</th>
                <th>Sold</th>
                <th>Rating</th>
                <th>Category</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.product_id}>
                  <td>
                    <img
                      src={product.product_link}
                      alt={product.product_name}
                      style={{
                        width: '50px',
                        height: '50px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                      }}
                    />
                  </td>
                  <td>{product.product_id}</td>
                  <td>{product.product_name}</td>
                  <td>{product.description}</td>
                  <td>Rs. {product.price}</td>
                  <td>{product.discount_price ? `Rs. ${product.discount_price}` : 'N/A'}</td>
                  <td>{product.stock_quantity}</td>
                  <td>{product.pieces_sold}</td>
                  <td>{product.rating}</td>
                  <td>{product.category}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">📦</div>
            <div className="no-data-message">No products found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="data-table-container">
      <div className="table-header">
        <h2 className="table-title">All Orders</h2>
        <p className="table-count">{orders.length} orders found</p>
      </div>
      
      <div className="table-content">
        {orders.length > 0 ? (
          <div style={{ padding: '20px' }}>
            {orders.map((order) => (
              <div key={order.order_id} style={{
                background: 'white',
                borderRadius: '10px',
                padding: '20px',
                marginBottom: '15px',
                border: '1px solid #e9ecef',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                  <h3 style={{ margin: 0, color: '#2c3e50' }}>Order #{order.order_id}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <select
                      value={order.order_status || 'Processing'}
                      onChange={(e) => handleStatusChange(order.order_id, e.target.value)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '2px solid #e9ecef',
                        background: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Processing">Processing</option>
                      <option value="Shipped">Shipped</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <span className={`status-badge status-${(order.order_status || 'processing').toLowerCase()}`}>
                      {order.order_status || 'Processing'}
                    </span>
                  </div>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                  <div>
                    <strong>Customer:</strong> {order.user_name || 'N/A'}
                  </div>
                  <div>
                    <strong>Email:</strong> {order.user_email || 'N/A'}
                  </div>
                  <div>
                    <strong>Total:</strong> Rs. {order.total_amount || 0}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date(order.order_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">📋</div>
            <div className="no-data-message">No orders found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderVouchers = () => (
    <div className="data-table-container">
      <div className="table-header">
        <h2 className="table-title">All Vouchers</h2>
        <p className="table-count">{vouchers.length} vouchers found</p>
      </div>
      
      <div className="table-content">
        {vouchers.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Code</th>
                <th>Discount Amount</th>
                <th>Min Order Value</th>
                <th>Usage Limit</th>
                <th>Expiry Date</th>
                <th>Times Used</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => (
                <tr key={voucher.voucher_id}>
                  <td>{voucher.voucher_id}</td>
                  <td><strong>{voucher.code}</strong></td>
                  <td style={{ color: '#28a745', fontWeight: 'bold' }}>
                    Rs. {voucher.discount_amount}
                  </td>
                  <td>Rs. {voucher.min_order_value}</td>
                  <td>{voucher.usage_limit}</td>
                  <td>
                    {voucher.expiry_date 
                      ? new Date(voucher.expiry_date).toLocaleDateString() 
                      : 'No expiry'
                    }
                  </td>
                  <td>
                    <span style={{ 
                      color: voucher.times_used > 0 ? '#dc3545' : '#6c757d',
                      fontWeight: 'bold' 
                    }}>
                      {voucher.times_used || 0}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${
                      voucher.status === 'active' ? 'status-delivered' : 
                      voucher.status === 'expired' ? 'status-cancelled' : 'status-processing'
                    }`}>
                      {voucher.status || 'active'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemoveVoucher(voucher.voucher_id, voucher.code)}
                      style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                    >
                      🗑️ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">🎟️</div>
            <div className="no-data-message">No vouchers found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderInventory = () => (
    <div className="data-table-container">
      <div className="table-header">
        <h2 className="table-title">Inventory Logs</h2>
        <p className="table-count">{inventory.length} entries found</p>
      </div>
      
      <div className="table-content">
        {inventory.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Inventory ID</th>
                <th>Product ID</th>
                <th>Stock Change</th>
                <th>Updated At</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.inventory_id}>
                  <td>{item.inventory_id}</td>
                  <td>{item.product_id}</td>
                  <td>
                    <span style={{
                      color: item.stock_added > 0 ? '#28a745' : '#dc3545',
                      fontWeight: 'bold'
                    }}>
                      {item.stock_added > 0 ? '+' : ''}{item.stock_added}
                    </span>
                  </td>
                  <td>{new Date(item.updated_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">📊</div>
            <div className="no-data-message">No inventory logs found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderReviews = () => (
    <div className="data-table-container">
      <div className="table-header">
        <h2 className="table-title">Product Reviews</h2>
        <p className="table-count">{reviews.length} reviews found</p>
      </div>
      
      <div className="table-content">
        {reviews.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Review ID</th>
                <th>User ID</th>
                <th>Product ID</th>
                <th>Rating</th>
                <th>Review</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {reviews.map((review) => (
                <tr key={review.review_id}>
                  <td>{review.review_id}</td>
                  <td>{review.user_id}</td>
                  <td>{review.product_id}</td>
                  <td>
                    <span style={{ color: '#ffc107', fontWeight: 'bold' }}>
                      {'⭐'.repeat(review.rating)}
                    </span>
                  </td>
                  <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {review.review_text}
                  </td>
                  <td>{new Date(review.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">⭐</div>
            <div className="no-data-message">No reviews found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderAdminProfile = () => (
    <div className="form-container">
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Admin Profile</h2>
      {admin ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '15px', alignItems: 'center' }}>
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ position: 'relative', display: 'inline-block' }}>
              <img
                src={adminProfileImage || "/Admin Logo.png"}
                alt="Admin"
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #667eea'
                }}
              />
              <label
                style={{
                  position: 'absolute',
                  bottom: '5px',
                  right: '5px',
                  background: '#667eea',
                  borderRadius: '50%',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid white',
                  fontSize: '14px'
                }}
              >
                📷
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleProfileImageChange}
                />
              </label>
            </div>
            <p style={{ fontSize: '12px', color: '#666', marginTop: '10px', fontStyle: 'italic' }}>
              Click the camera icon to change profile picture
            </p>
          </div>
          <strong>ID:</strong>
          <span>{admin.admin_id}</span>
          <strong>Name:</strong>
          <span>{admin.name}</span>
          <strong>Email:</strong>
          <span>{admin.email}</span>
        </div>
      ) : (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      )}
    </div>
  );

  const renderAddProduct = () => (
    <div className="form-container">
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Add New Product</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleAddProduct();
      }}>
        <div className="form-group">
          <label className="form-label">Product Name</label>
          <input
            type="text"
            className="form-input"
            value={newProduct.product_name}
            onChange={(e) => setNewProduct({...newProduct, product_name: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-input form-textarea"
            value={newProduct.description}
            onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
            required
          />
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label className="form-label">Price (Rs.)</label>
            <input
              type="number"
              className="form-input"
              value={newProduct.price}
              onChange={(e) => setNewProduct({...newProduct, price: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Discount Price (Rs.)</label>
            <input
              type="number"
              className="form-input"
              value={newProduct.discount_price}
              onChange={(e) => setNewProduct({...newProduct, discount_price: e.target.value})}
            />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="form-group">
            <label className="form-label">Stock Quantity</label>
            <input
              type="number"
              className="form-input"
              value={newProduct.stock_quantity}
              onChange={(e) => setNewProduct({...newProduct, stock_quantity: e.target.value})}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="form-label">Category</label>
            <input
              type="text"
              className="form-input"
              value={newProduct.category}
              onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Product Image URL</label>
          <input
            type="url"
            className="form-input"
            value={newProduct.product_link}
            onChange={(e) => setNewProduct({...newProduct, product_link: e.target.value})}
            required
          />
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
          Add Product
        </button>
      </form>
    </div>
  );

  const renderAddUser = () => (
    <div className="form-container">
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Add New User</h2>
      <form onSubmit={(e) => {
        e.preventDefault();
        handleAddUser();
      }}>
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            className="form-input"
            value={newUser.name}
            onChange={(e) => setNewUser({...newUser, name: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Email</label>
          <input
            type="email"
            className="form-input"
            value={newUser.email}
            onChange={(e) => setNewUser({...newUser, email: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={newUser.password}
            onChange={(e) => setNewUser({...newUser, password: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Phone</label>
          <input
            type="tel"
            className="form-input"
            value={newUser.phone}
            onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Address</label>
          <textarea
            className="form-input form-textarea"
            value={newUser.address}
            onChange={(e) => setNewUser({...newUser, address: e.target.value})}
            required
          />
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
          Add User
        </button>
      </form>
    </div>
  );

  // Handler functions
  const handleAddProduct = async () => {
    try {
      const response = await fetch('http://localhost:5000/products/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });

      const data = await response.json();
      if (data.success) {
        window.showToast('Product added successfully!', 'success');
        setNewProduct({
          product_name: "",
          description: "",
          price: "",
          discount_price: "",
          stock_quantity: "",
          category: "",
          product_link: "",
          pieces_sold: 0,
          rating: 0,
          discount_start: "",
          discount_end: "",
        });
        // Refresh products if we're viewing them
        if (selectedSubmenu === "view_products") {
          fetchProducts();
        }
      } else {
        window.showToast(data.error || 'Failed to add product', 'error');
      }
    } catch (error) {
      console.error('Error adding product:', error);
      window.showToast('Error adding product', 'error');
    }
  };

  const handleAddUser = async () => {
    try {
      // Transform user data to match backend format
      const userData = {
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        phone: newUser.phone,
        street_no: 1,
        house_no: 1,
        block_name: "Block A",
        society: "Society",
        city: "City",
        country: "Pakistan"
      };

      const response = await fetch('http://localhost:5000/users/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      if (data.success) {
        window.showToast('User added successfully!', 'success');
        setNewUser({
          name: "",
          email: "",
          password: "",
          address: "",
          phone: "",
        });
        // Refresh users if we're viewing them
        if (selectedSubmenu === "view_users") {
          fetchUsers();
        }
      } else {
        window.showToast(data.error || 'Failed to add user', 'error');
      }
    } catch (error) {
      console.error('Error adding user:', error);
      window.showToast('Error adding user', 'error');
    }
  };

  // Additional render functions for missing menu items
  const handleAddStockSubmit = (e) => {
    e.preventDefault();
    if (selectedProductId && stockToAdd && parseInt(stockToAdd) > 0) {
      handleAddStock(selectedProductId, stockToAdd);
      setSelectedProductId("");
      setStockToAdd("");
    } else {
      window.showToast("Please select a product and enter a valid stock quantity", "error");
    }
  };

  const renderAddStock = () => (
    <div className="form-container">
      <h2>Add Stock</h2>
      <form onSubmit={handleAddStockSubmit} style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="form-group">
          <label className="form-label">Select Product</label>
          <select
            className="form-input"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            required
          >
            <option value="">Choose a product...</option>
            {products.map((product) => (
              <option key={product.product_id} value={product.product_id}>
                #{product.product_id} - {product.product_name} (Current Stock: {product.stock_quantity})
              </option>
            ))}
          </select>
        </div>
        
        <div className="form-group">
          <label className="form-label">Stock Quantity to Add</label>
          <input
            type="number"
            className="form-input"
            placeholder="Enter quantity to add"
            value={stockToAdd}
            onChange={(e) => setStockToAdd(e.target.value)}
            min="1"
            required
          />
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
          Add Stock
        </button>
      </form>
    </div>
  );

  const renderRemoveProduct = () => (
    <div className="form-container">
      <h2>Remove Product</h2>
      <p>Select products to remove from the catalog.</p>
      
      <div className="table-content">
        {products.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>ID</th>
                <th>Name</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.product_id}>
                  <td>
                    <img
                      src={product.product_link}
                      alt={product.product_name}
                      style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                    />
                  </td>
                  <td>{product.product_id}</td>
                  <td>{product.product_name}</td>
                  <td>Rs. {product.price}</td>
                  <td>{product.stock_quantity}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemoveProduct(product.product_id)}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">📦</div>
            <div className="no-data-message">No products found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderRemoveUser = () => (
    <div className="form-container">
      <h2>Remove User</h2>
      <p>Select users to remove from the system.</p>
      
      <div className="table-content">
        {users.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.user_id}>
                  <td>{user.user_id}</td>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>{user.phone || 'N/A'}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemoveUser(user.user_id)}
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">👥</div>
            <div className="no-data-message">No users found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderCancelOrder = () => (
    <div className="form-container">
      <h2 style={{ marginBottom: '10px', color: '#2c3e50' }}>Cancel Customer Orders</h2>
      <p style={{ color: '#666', marginBottom: '30px' }}>Review and cancel customer orders when necessary. This action cannot be undone.</p>
      
      <div className="table-content">
        {orders.length > 0 ? (
          <div style={{ padding: '10px' }}>
            {orders.filter(order => order.order_status !== 'Cancelled').map((order) => (
              <div key={order.order_id} style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '20px',
                boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
                border: '1px solid #e9ecef',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ 
                      margin: '0 0 16px 0', 
                      color: '#2c3e50',
                      fontSize: '1.4rem',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      📋 Order #{order.order_id}
                    </h3>
                    
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                      gap: '16px',
                      marginBottom: '20px'
                    }}>
                      <div>
                        <p style={{ margin: '0 0 8px 0', color: '#6c757d', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#495057' }}>👤 Customer:</strong>
                        </p>
                        <p style={{ margin: '0', color: '#2c3e50', fontWeight: '500' }}>
                          {order.user_name}
                        </p>
                        <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '0.9rem' }}>
                          {order.user_email}
                        </p>
                      </div>
                      
                      <div>
                        <p style={{ margin: '0 0 8px 0', color: '#6c757d', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#495057' }}>💰 Total Amount:</strong>
                        </p>
                        <p style={{ margin: '0', color: '#28a745', fontWeight: '600', fontSize: '1.2rem' }}>
                          Rs. {(order.final_total || order.total_price)?.toLocaleString()}
                        </p>
                      </div>
                      
                      <div>
                        <p style={{ margin: '0 0 8px 0', color: '#6c757d', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#495057' }}>📅 Order Date:</strong>
                        </p>
                        <p style={{ margin: '0', color: '#2c3e50' }}>
                          {new Date(order.order_date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: '#6c757d', fontSize: '0.9rem' }}>Status:</span>
                      <span className={`status-badge status-${order.order_status?.toLowerCase()}`} style={{
                        padding: '6px 16px',
                        borderRadius: '20px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {order.order_status}
                      </span>
                    </div>
                  </div>
                  
                  <div style={{ marginLeft: '20px' }}>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleCancelOrder(order.order_id, order.user_name)}
                      style={{ 
                        padding: '12px 24px',
                        fontSize: '0.95rem',
                        fontWeight: '500',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)'
                      }}
                      onMouseOver={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.4)';
                      }}
                      onMouseOut={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.3)';
                      }}
                    >
                      ❌ Cancel Order
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data" style={{
            textAlign: 'center',
            padding: '60px 20px',
            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
            borderRadius: '12px',
            border: '2px dashed #dee2e6'
          }}>
            <div className="no-data-icon" style={{ fontSize: '4rem', marginBottom: '20px' }}>📋</div>
            <div className="no-data-message" style={{ 
              fontSize: '1.2rem', 
              color: '#6c757d',
              fontWeight: '500' 
            }}>
              No active orders found to cancel
            </div>
            <p style={{ color: '#adb5bd', marginTop: '8px' }}>
              All orders are either already cancelled or completed
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderAddVoucher = () => (
      <div className="form-container">
        <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Add New Voucher</h2>
        <form onSubmit={handleVoucherSubmit}>
          <div className="form-group">
            <label className="form-label">Voucher Code</label>
            <input
              type="text"
              className="form-input"
              value={voucherForm.code}
              onChange={(e) => setVoucherForm({...voucherForm, code: e.target.value.toUpperCase()})}
              placeholder="e.g., SAVE20, WELCOME10"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Discount Amount (Rs.)</label>
              <input
                type="number"
                className="form-input"
                value={voucherForm.discount_amount}
                onChange={(e) => setVoucherForm({...voucherForm, discount_amount: e.target.value})}
                placeholder="100"
                min="0"
                step="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Minimum Order Value (Rs.)</label>
              <input
                type="number"
                className="form-input"
                value={voucherForm.min_order_value}
                onChange={(e) => setVoucherForm({...voucherForm, min_order_value: e.target.value})}
                placeholder="500"
                min="0"
                step="0.01"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div className="form-group">
              <label className="form-label">Expiry Date</label>
              <input
                type="datetime-local"
                className="form-input"
                value={voucherForm.expiry_date}
                onChange={(e) => setVoucherForm({...voucherForm, expiry_date: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Usage Limit</label>
              <input
                type="number"
                className="form-input"
                value={voucherForm.usage_limit}
                onChange={(e) => setVoucherForm({...voucherForm, usage_limit: e.target.value})}
                placeholder="1"
                min="1"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
            🎟️ Create Voucher
          </button>
        </form>
      </div>
    );

  const renderRemoveVoucher = () => (
    <div className="form-container">
      <h2 style={{ marginBottom: '20px', color: '#2c3e50' }}>Remove Vouchers</h2>
      
      <div className="table-content">
        {vouchers.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Discount</th>
                <th>Min Order</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Times Used</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.map((voucher) => (
                <tr key={voucher.voucher_id}>
                  <td><strong>{voucher.code}</strong></td>
                  <td>Rs. {voucher.discount_amount}</td>
                  <td>Rs. {voucher.min_order_value}</td>
                  <td>{new Date(voucher.expiry_date).toLocaleDateString()}</td>
                  <td>
                    <span className={`status-badge status-${voucher.status === 'active' ? 'delivered' : 'cancelled'}`}>
                      {voucher.status}
                    </span>
                  </td>
                  <td>{voucher.times_used || 0}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRemoveVoucher(voucher.voucher_id, voucher.code)}
                      style={{ padding: '6px 12px', fontSize: '0.9rem' }}
                    >
                      🗑️ Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="no-data">
            <div className="no-data-icon">🎟️</div>
            <div className="no-data-message">No vouchers found</div>
          </div>
        )}
      </div>
    </div>
  );

  const renderChangePassword = () => (
    <div className="form-container">
      <h2>Change Password</h2>
      <form onSubmit={handlePasswordFormSubmit} style={{ maxWidth: '400px', margin: '0 auto' }}>
        <div className="form-group">
          <label className="form-label">Current Password</label>
          <input
            type="password"
            className="form-input"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter your current password"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">New Password</label>
          <input
            type="password"
            className="form-input"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password (min 6 characters)"
            minLength="6"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Confirm New Password</label>
          <input
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your new password"
            minLength="6"
            required
          />
        </div>
        
        <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
          Change Password
        </button>
      </form>
    </div>
  );

  // Main render function
  const renderContent = () => {
    switch (selectedSubmenu) {
      case "view_users":
        return renderUsers();
      case "add_user":
        return renderAddUser();
      case "remove_user":
        return renderRemoveUser();
      case "view_products":
        return renderProducts();
      case "add_product":
        return renderAddProduct();
      case "add_stock":
        return renderAddStock();
      case "remove_product":
        return renderRemoveProduct();
      case "view_orders":
        return renderOrders();
      case "cancel_order":
        return renderCancelOrder();
      case "all_voucher":
        return renderVouchers();
      case "add_voucher":
        return renderAddVoucher();
      case "remove_voucher":
        return renderRemoveVoucher();
      case "view_inventory":
        return renderInventory();
      case "view_reviews":
        return renderReviews();
      case "view_admin_profile":
        return renderAdminProfile();
      case "change_admin_password":
        return renderChangePassword();
      default:
        return renderDashboard();
    }
  };

  const getPageTitle = () => {
    const titles = {
      "view_users": "User Management",
      "add_user": "Add New User",
      "remove_user": "Remove User",
      "view_products": "Product Management",
      "add_product": "Add New Product",
      "add_stock": "Add Stock",
      "remove_product": "Remove Product",
      "view_orders": "Order Management",
      "cancel_order": "Cancel Order",
      "all_voucher": "Voucher Management",
      "add_voucher": "Add Voucher",
      "remove_voucher": "Remove Voucher",
      "view_inventory": "Inventory Management",
      "view_reviews": "Review Management",
      "view_admin_profile": "Admin Profile",
      "change_admin_password": "Change Password",
    };
    return titles[selectedSubmenu] || "Dashboard";
  };

  const getPageSubtitle = () => {
    const subtitles = {
      "view_users": "Manage user accounts and information",
      "add_user": "Create a new user account",
      "remove_user": "Remove user accounts from the system",
      "view_products": "View and manage product catalog",
      "add_product": "Add a new product to the catalog",
      "add_stock": "Add stock quantity to existing products",
      "remove_product": "Remove products from the catalog",
      "view_orders": "Track and manage customer orders",
      "cancel_order": "Cancel customer orders",
      "all_voucher": "Manage discount vouchers and promotions",
      "add_voucher": "Create new discount vouchers",
      "remove_voucher": "Remove existing vouchers",
      "view_inventory": "Monitor inventory changes and stock levels",
      "view_reviews": "View customer reviews and ratings",
      "view_admin_profile": "View and manage admin account",
      "change_admin_password": "Change admin account password",
    };
    return subtitles[selectedSubmenu] || "Welcome to the admin control panel";
  };

  // Confirmation Dialog Component
  const renderConfirmationDialog = () => {
    if (!showConfirmDialog) return null;

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '500px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden',
          animation: 'modalSlideIn 0.3s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid #dee2e6',
            background: confirmDialogData.type === 'danger' ? '#f8d7da' : 
                       confirmDialogData.type === 'warning' ? '#fff3cd' : '#d1ecf1'
          }}>
            <h3 style={{
              margin: 0,
              color: confirmDialogData.type === 'danger' ? '#721c24' : 
                     confirmDialogData.type === 'warning' ? '#856404' : '#0c5460',
              fontSize: '1.3rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {confirmDialogData.type === 'danger' ? '⚠️' : 
               confirmDialogData.type === 'warning' ? '⚠️' : 'ℹ️'} 
              {confirmDialogData.title}
            </h3>
          </div>

          {/* Content */}
          <div style={{
            padding: '24px',
            lineHeight: '1.6',
            color: '#495057',
            fontSize: '1rem'
          }}>
            <p style={{ margin: 0 }}>
              {confirmDialogData.message}
            </p>
          </div>

          {/* Actions */}
          <div style={{
            padding: '16px 24px 24px 24px',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            background: '#f8f9fa'
          }}>
            <button
              onClick={closeConfirmationDialog}
              style={{
                padding: '10px 20px',
                background: 'white',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                color: '#6c757d',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.borderColor = '#adb5bd';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#dee2e6';
              }}
            >
              {confirmDialogData.cancelText}
            </button>
            <button
              onClick={confirmDialogData.onConfirm}
              style={{
                padding: '10px 20px',
                background: confirmDialogData.type === 'danger' ? '#dc3545' : 
                           confirmDialogData.type === 'warning' ? '#fd7e14' : '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.target.style.background = confirmDialogData.type === 'danger' ? '#c82333' : 
                                           confirmDialogData.type === 'warning' ? '#fd6c2f' : '#0b5ed7';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = confirmDialogData.type === 'danger' ? '#dc3545' : 
                                           confirmDialogData.type === 'warning' ? '#fd7e14' : '#0d6efd';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {confirmDialogData.confirmText}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-dashboard">
      <button 
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        ☰
      </button>
      
      {renderSidebar()}
      
      <main className="admin-main">
        <div className="content-header">
          <h1 className="content-title">{getPageTitle()}</h1>
          <p className="content-subtitle">{getPageSubtitle()}</p>
        </div>
        
        <div className="content-body">
          {renderContent()}
        </div>
      </main>

      {/* Confirmation Dialog */}
      {renderConfirmationDialog()}
    </div>
  );
}

export default Admin;