const sql = require('mssql');
const { config, getConnectionInfo } = require('../config/database');

async function initializeDatabase() {
  try {
    console.log(`Connecting to database to initialize schema... (${getConnectionInfo()})`);
    const pool = await sql.connect(config);
    console.log("Connected to database successfully");

    // Run the initialization functions
    await Promise.all([
      createUsersTablesIfNotExist(pool),
      createAdminTablesIfNotExist(pool),
      createProductTablesIfNotExist(pool),
      createVoucherTablesIfNotExist(pool),
      createCartTablesIfNotExist(pool),
      createOrderTablesIfNotExist(pool),
      createWishlistTablesIfNotExist(pool),
      createReviewsTablesIfNotExist(pool),
      createPaymentTablesIfNotExist(pool),
      createInventoryTablesIfNotExist(pool),
      createAnalyticsTablesIfNotExist(pool)
    ]);

    console.log("Database initialization completed successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  } finally {
    await sql.close();
    console.log("Database connection closed");
  }
}

async function tableExists(pool, tableName) {
  const result = await pool.request().query(`
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_NAME = '${tableName}'
  `);
  return result.recordset.length > 0;
}

async function createUsersTablesIfNotExist(pool) {
  try {
    // Check if users table exists
    if (!await tableExists(pool, 'users')) {
      console.log("Creating users table...");
      await pool.request().query(`
        CREATE TABLE users (
          user_id INT PRIMARY KEY IDENTITY(1,1),
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("Users table created successfully");
    }

    // Check if users_address table exists
    if (!await tableExists(pool, 'users_address')) {
      console.log("Creating users_address table...");
      await pool.request().query(`
        CREATE TABLE users_address (
          address_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL UNIQUE,
          street_no INT NOT NULL,
          house_no INT NOT NULL,
          block_name VARCHAR(50),
          society VARCHAR(100),
          city VARCHAR(100) NOT NULL,
          country VARCHAR(100) NOT NULL,
          FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `);
      console.log("Users_address table created successfully");
    }

    // Check if users_contact_info table exists
    if (!await tableExists(pool, 'users_contact_info')) {
      console.log("Creating users_contact_info table...");
      await pool.request().query(`
        CREATE TABLE users_contact_info (
          user_id INT NOT NULL,
          phone VARCHAR(20) UNIQUE,
          PRIMARY KEY (user_id, phone),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `);
      console.log("Users_contact_info table created successfully");
    }
  } catch (error) {
    console.error("Error creating users tables:", error);
    throw error;
  }
}

async function createAdminTablesIfNotExist(pool) {
  try {
    // Check if admins table exists
    if (!await tableExists(pool, 'admins')) {
      console.log("Creating admins table...");
      await pool.request().query(`
        CREATE TABLE admins (
          admin_id INT PRIMARY KEY IDENTITY(1,1),
          name VARCHAR(255),
          email VARCHAR(255) UNIQUE,
          password VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log("Admins table created successfully");
    }
  } catch (error) {
    console.error("Error creating admin tables:", error);
    throw error;
  }
}

async function createProductTablesIfNotExist(pool) {
  try {
    // Check if product_categories table exists
    if (!await tableExists(pool, 'product_categories')) {
      console.log("Creating product_categories table...");
      await pool.request().query(`
        CREATE TABLE product_categories (
          category_id INT PRIMARY KEY IDENTITY(1,1),
          category_name VARCHAR(255) NOT NULL UNIQUE
        )
      `);
      console.log("Product_categories table created successfully");
    }

    // Check if products table exists
    if (!await tableExists(pool, 'products')) {
      console.log("Creating products table...");
      await pool.request().query(`
        CREATE TABLE products (
          product_id INT PRIMARY KEY IDENTITY(1,1),
          admin_id INT,
          product_name VARCHAR(255) NOT NULL,
          description TEXT,
          price DECIMAL(10,2) NOT NULL,
          stock_quantity INT NOT NULL,
          category_id INT,
          product_link VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE SET NULL,
          FOREIGN KEY (category_id) REFERENCES product_categories(category_id) ON DELETE SET NULL
        )
      `);
      console.log("Products table created successfully");
    }

    // Check if product_discounts table exists
    if (!await tableExists(pool, 'product_discounts')) {
      console.log("Creating product_discounts table...");
      await pool.request().query(`
        CREATE TABLE product_discounts (
          discount_id INT PRIMARY KEY IDENTITY(1,1),
          product_id INT NOT NULL,
          discount_price DECIMAL(10,2) NOT NULL,
          discount_start DATETIME NOT NULL,
          discount_end DATETIME NOT NULL,
          FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
      `);
      console.log("Product_discounts table created successfully");
    }

    // Check if product_stats table exists
    if (!await tableExists(pool, 'product_stats')) {
      console.log("Creating product_stats table...");
      await pool.request().query(`
        CREATE TABLE product_stats (
          stat_id INT PRIMARY KEY IDENTITY(1,1),
          product_id INT NOT NULL,
          pieces_sold VARCHAR(10) DEFAULT '0',
          rating DECIMAL(10,1) CHECK (rating >=0 AND rating <=5) DEFAULT 0,
          FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
      `);
      console.log("Product_stats table created successfully");
    }
  } catch (error) {
    console.error("Error creating product tables:", error);
    throw error;
  }
}

async function createVoucherTablesIfNotExist(pool) {
  try {
    // Check if vouchers table exists
    if (!await tableExists(pool, 'vouchers')) {
      console.log("Creating vouchers table...");
      await pool.request().query(`
        CREATE TABLE vouchers (
          voucher_id INT PRIMARY KEY IDENTITY(1,1),
          admin_id INT,
          code VARCHAR(50) UNIQUE NOT NULL,
          discount_amount DECIMAL(10,2) NOT NULL,
          min_order_value DECIMAL(10,2) NOT NULL,
          expiry_date DATETIME NOT NULL,
          usage_limit INT DEFAULT 1,
          status VARCHAR(10) CHECK (status IN ('active', 'expired', 'disabled')) DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE SET NULL
        )
      `);
      console.log("Vouchers table created successfully");
    }

    // Check if user_vouchers table exists
    if (!await tableExists(pool, 'user_vouchers')) {
      console.log("Creating user_vouchers table...");
      await pool.request().query(`
        CREATE TABLE user_vouchers (
          user_voucher_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL,
          voucher_id INT NOT NULL,
          claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          used BIT DEFAULT 0,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id) ON DELETE CASCADE
        )
      `);
      console.log("User_vouchers table created successfully");
    }
  } catch (error) {
    console.error("Error creating voucher tables:", error);
    throw error;
  }
}

async function createCartTablesIfNotExist(pool) {
  try {
    // Check if carts table exists
    if (!await tableExists(pool, 'carts')) {
      console.log("Creating carts table...");
      await pool.request().query(`
        CREATE TABLE carts (
          cart_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `);
      console.log("Carts table created successfully");
    }

    // Check if cart_items table exists
    if (!await tableExists(pool, 'cart_items')) {
      console.log("Creating cart_items table...");
      await pool.request().query(`
        CREATE TABLE cart_items (
          cart_item_id INT PRIMARY KEY IDENTITY(1,1),
          cart_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT CHECK (quantity > 0) NOT NULL,
          voucher_id INT,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cart_id) REFERENCES carts(cart_id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE,
          FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id) ON DELETE SET NULL
        )
      `);
      console.log("Cart_items table created successfully");
    }
  } catch (error) {
    console.error("Error creating cart tables:", error);
    throw error;
  }
}

async function createOrderTablesIfNotExist(pool) {
  try {
    // Check if orders table exists
    if (!await tableExists(pool, 'orders')) {
      console.log("Creating orders table...");
      await pool.request().query(`
        CREATE TABLE orders (
          order_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          total DECIMAL(10,2),
          order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          order_status VARCHAR(50) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `);
      console.log("Orders table created successfully");
    }

    // Check if order_items table exists
    if (!await tableExists(pool, 'order_items')) {
      console.log("Creating order_items table...");
      await pool.request().query(`
        CREATE TABLE order_items (
          order_item_id INT PRIMARY KEY IDENTITY(1,1),
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
      `);
      console.log("Order_items table created successfully");
    }
  } catch (error) {
    console.error("Error creating order tables:", error);
    throw error;
  }
}

async function createWishlistTablesIfNotExist(pool) {
  try {
    // Check if wishlists table exists
    if (!await tableExists(pool, 'wishlists')) {
      console.log("Creating wishlists table...");
      await pool.request().query(`
        CREATE TABLE wishlists (
          wishlist_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )
      `);
      console.log("Wishlists table created successfully");
    }

    // Check if wishlist_items table exists
    if (!await tableExists(pool, 'wishlist_items')) {
      console.log("Creating wishlist_items table...");
      await pool.request().query(`
        CREATE TABLE wishlist_items (
          wishlist_item_id INT PRIMARY KEY IDENTITY(1,1),
          wishlist_id INT NOT NULL,
          product_id INT NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wishlist_id) REFERENCES wishlists(wishlist_id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
      `);
      console.log("Wishlist_items table created successfully");
    }
  } catch (error) {
    console.error("Error creating wishlist tables:", error);
    throw error;
  }
}

async function createReviewsTablesIfNotExist(pool) {
  try {
    // Check if reviews table exists
    if (!await tableExists(pool, 'reviews')) {
      console.log("Creating reviews table...");
      await pool.request().query(`
        CREATE TABLE reviews (
          review_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          rating INT CHECK (rating BETWEEN 1 AND 5) NOT NULL,
          review_text TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
      `);
      console.log("Reviews table created successfully");
    }
  } catch (error) {
    console.error("Error creating reviews tables:", error);
    throw error;
  }
}

async function createPaymentTablesIfNotExist(pool) {
  try {
    // Check if payments table exists
    if (!await tableExists(pool, 'payments')) {
      console.log("Creating payments table...");
      await pool.request().query(`
        CREATE TABLE payments (
          payment_id INT PRIMARY KEY IDENTITY(1,1),
          order_id INT NOT NULL,
          payment_method VARCHAR(50) NOT NULL,
          payment_status VARCHAR(50) NOT NULL,
          transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
        )
      `);
      console.log("Payments table created successfully");
    }
  } catch (error) {
    console.error("Error creating payment tables:", error);
    throw error;
  }
}

async function createInventoryTablesIfNotExist(pool) {
  try {
    // Check if inventory table exists
    if (!await tableExists(pool, 'inventory')) {
      console.log("Creating inventory table...");
      await pool.request().query(`
        CREATE TABLE inventory (
          inventory_id INT PRIMARY KEY IDENTITY(1,1),
          product_id INT NOT NULL,
          stock_added INT NOT NULL,
          stock_removed INT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
      `);
      console.log("Inventory table created successfully");
    }
  } catch (error) {
    console.error("Error creating inventory tables:", error);
    throw error;
  }
}

async function createAnalyticsTablesIfNotExist(pool) {
  try {
    // Check if analytics table exists
    if (!await tableExists(pool, 'analytics')) {
      console.log("Creating analytics table...");
      await pool.request().query(`
        CREATE TABLE analytics (
          analytics_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT,
          product_id INT,
          action_type VARCHAR(50) NOT NULL,
          action_time DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (product_id) REFERENCES products(product_id) ON DELETE CASCADE
        )
      `);
      console.log("Analytics table created successfully");
    }
  } catch (error) {
    console.error("Error creating analytics tables:", error);
    throw error;
  }
}

// Run the initialization function
initializeDatabase(); 