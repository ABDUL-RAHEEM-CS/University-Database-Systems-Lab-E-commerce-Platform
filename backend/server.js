const express = require("express");
const sql = require("mssql");
const cors = require("cors");
const { config, getConnectionInfo } = require('./config/database');

const app = express();

// Modified connection pool configuration
const dbConfig = {
  ...require('./config/database').config,
  options: {
    enableArithAbort: true,
    trustServerCertificate: true,
    encrypt: false,
    requestTimeout: 60000, // Increase timeout to 60 seconds
    connectionTimeout: 60000 // Increase connection timeout to 60 seconds
  },
  pool: {
    max: 10, // Maximum number of connections in the pool
    min: 0, // Minimum number of connections in the pool
    idleTimeoutMillis: 30000 // How long a connection can be idle before being removed
  }
};

// Global pool that will be initialized when server starts
let pool;

// Function to get a connection pool - with auto-reconnect
async function getPool() {
  try {
    if (!pool) {
      console.log("Creating new database connection pool...");
      pool = await sql.connect(dbConfig);
      
      // Handle pool errors
      pool.on('error', async err => {
        console.error('SQL Pool Error:', err);
        if (err.code === 'ECONNRESET' || err.code === 'ETIMEOUT') {
          console.log('Connection lost. Reconnecting...');
          pool = null; // Reset the pool to force a new connection next time
        }
      });
    }
    return pool;
  } catch (err) {
    console.error('Database connection error:', err);
    // If we couldn't connect, null the pool so we try again next time
    pool = null;
    throw err;
  }
}

// Initialize the database connection
async function initializeDatabase() {
  try {
    console.log(`Connecting to database: ${getConnectionInfo()}`);
    pool = await sql.connect(dbConfig);
    console.log("✅ Database connection established");
    
    // Run structure check functions after connection is established
    console.log(`Running database structure checks...`);
    await Promise.all([
      repairVoucherTableStructure(),
      checkAndCreateReviewsTable(),
      checkAndCreateWishlistTables(),
      checkAndCreateCartTables(),
      checkAndCreateInventoryTable(),
      checkAndCreateOrderVouchersTable()
    ]);
      console.log(`✅ Database structure checks completed`);
  } catch (error) {
    console.error(`❌ Error connecting to database:`, error);
    process.exit(1); // Exit if we can't connect to the database
  }
}

// Make sure the JSON body parser is before CORS handler
app.use(express.json());

// Log all request bodies for debugging
app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') {
    console.log(`[REQUEST] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
      console.log(`[REQUEST BODY] ${JSON.stringify(req.body)}`);
    }
  }
  next();
});

// Configure CORS to allow frontend requests - extremely permissive for troubleshooting
app.use((req, res, next) => {
  // Allow requests from any origin
  res.header('Access-Control-Allow-Origin', '*');
  // Allow all headers
  res.header('Access-Control-Allow-Headers', '*');
  // Allow all methods
  res.header('Access-Control-Allow-Methods', '*');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Enhanced error logging middleware
app.use((err, req, res, next) => {
  console.error(`Error processing ${req.method} ${req.url}:`, err);
  res.status(500).json({ error: "An internal server error occurred" });
});

// User login endpoint
app.post("/login", async (req, res) => {
  console.log("LOGIN ATTEMPT RECEIVED:", req.body);
  const { email, password } = req.body;

  if (!email || !password) {
    console.log("LOGIN REJECTED: Missing email or password");
    return res.status(400).json({
      success: false,
      error: "Email and password are required"
    });
  }

  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries) {
    try {
      console.log(`Attempting login for email: ${email} (Attempt ${retryCount + 1}/${maxRetries + 1})`);
      const pool = await getPool();
      
      console.log("Connected to DB, executing query...");
      const result = await pool
        .request()
        .input("email", sql.NVarChar, email)
        .input("password", sql.NVarChar, password)
        .query(`
          SELECT user_id, name
          FROM users
          WHERE email = @email AND password = @password
        `);

      console.log(`Query result: ${result.recordset.length} matching records`);
      
      if (result.recordset.length > 0) {
        const user = result.recordset[0];
        console.log("✅ User login successful:", user.name);
        const responseData = {
          success: true,
          userId: user.user_id,
          username: user.name,
        };
        console.log("Sending success response:", responseData);
        return res.json(responseData);
      } else {
        console.log("❌ User login failed: Invalid credentials for email:", email);
        return res.status(401).json({
          success: false,
          error: "Invalid email or password"
        });
      }
    } catch (err) {
      console.error(`User Login Error (Attempt ${retryCount + 1}/${maxRetries + 1}):`, err);
      
      // Check if it's a timeout or connection issue and retry
      if ((err.code === 'ETIMEOUT' || err.code === 'ECONNRESET') && retryCount < maxRetries) {
        retryCount++;
        console.log(`Retrying login request (${retryCount}/${maxRetries})...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // If we've exceeded retries or it's not a retriable error, return error response
      return res.status(500).json({
        success: false,
        error: "Login failed due to server error. Please try again later."
      });
    }
  }
});

const PORT = process.env.PORT || 5000;

// Start the server with error handling
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Database connection: ${getConnectionInfo()}`);
  initializeDatabase();
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Trying alternative port ${PORT + 1}...`);
    // Try alternative port
    app.listen(PORT + 1, () => {
      console.log(`Server is running on alternative port http://localhost:${PORT + 1}`);
      console.log(`Database connection: ${getConnectionInfo()}`);
      initializeDatabase();
    });
  } else {
    console.error('Server failed to start:', err);
  }
});

app.post("/signup", async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    street_no,
    house_no,
    block_name,
    society,
    city,
    country,
  } = req.body;

  // Validate required fields
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: "Missing required personal information" });
  }

  // Validate address fields
  if (!street_no || !house_no || !city || !country) {
    return res.status(400).json({ error: "Missing required address information" });
  }

  try {
    console.log(`[SIGNUP] Processing signup request for: ${email}`);
    const pool = await getPool();

    // Check if email already exists
    const emailCheck = await pool.request()
      .input("email", sql.NVarChar, email)
      .query(`
        SELECT user_id FROM users WHERE email = @email
      `);

    if (emailCheck.recordset.length > 0) {
      console.log(`[SIGNUP] Email already in use: ${email}`);
      return res.status(400).json({ error: "Email address is already in use" });
    }

    // Check if phone already exists
    const phoneCheck = await pool.request()
      .input("phone", sql.NVarChar, phone)
      .query(`
        SELECT user_id FROM users_contact_info WHERE phone = @phone
      `);

    if (phoneCheck.recordset.length > 0) {
      console.log(`[SIGNUP] Phone number already in use: ${phone}`);
      return res.status(400).json({ error: "Phone number is already in use" });
    }

    // Start a transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Step 1: Insert into users
      console.log(`[SIGNUP] Creating user record for: ${email}`);
      const userRequest = new sql.Request(transaction);
      const userResult = await userRequest
        .input("name", sql.NVarChar, name)
        .input("email", sql.NVarChar, email)
        .input("password", sql.NVarChar, password)
        .query(`
          INSERT INTO users (name, email, password, created_at)
          OUTPUT INSERTED.user_id
          VALUES (@name, @email, @password, GETDATE())
        `);

      const userId = userResult.recordset[0].user_id;
      console.log(`[SIGNUP] Created user with ID: ${userId}`);

      // Step 2: Insert into users_address
      console.log(`[SIGNUP] Creating address record for user: ${userId}`);
      const addressRequest = new sql.Request(transaction);
      await addressRequest
        .input("user_id", sql.Int, userId)
        .input("street_no", sql.Int, parseInt(street_no, 10))
        .input("house_no", sql.Int, parseInt(house_no, 10))
        .input("block_name", sql.NVarChar, block_name || "")
        .input("society", sql.NVarChar, society || "")
        .input("city", sql.NVarChar, city)
        .input("country", sql.NVarChar, country)
        .query(`
          INSERT INTO users_address (user_id, street_no, house_no, block_name, society, city, country)
          VALUES (@user_id, @street_no, @house_no, @block_name, @society, @city, @country)
        `);

      // Step 3: Insert into users_contact_info
      console.log(`[SIGNUP] Creating contact info record for user: ${userId}`);
      const contactRequest = new sql.Request(transaction);
      await contactRequest
        .input("user_id", sql.Int, userId)
        .input("phone", sql.NVarChar, phone)
        .query(`
          INSERT INTO users_contact_info (user_id, phone)
          VALUES (@user_id, @phone)
        `);

      await transaction.commit();
      console.log(`[SIGNUP] Successfully created account for: ${email}`);
      res.json({ success: true, userId });
    } catch (txError) {
      // If there's an error in the transaction, roll it back
      await transaction.rollback();
      console.error(`[SIGNUP] Transaction error:`, txError);
      
      // Check for specific errors to provide better feedback
      if (txError.message.includes('Violation of UNIQUE KEY constraint')) {
        if (txError.message.includes('email')) {
          return res.status(400).json({ error: "Email address is already in use" });
        } else if (txError.message.includes('phone')) {
          return res.status(400).json({ error: "Phone number is already in use" });
        }
      }
      
      res.status(500).json({ error: "Failed to create account due to a database error" });
    }
  } catch (err) {
    console.error("[SIGNUP] Error:", err);
    res.status(500).json({ error: "Signup failed due to server error" });
  }
});

app.get("/products", async (req, res) => {
  try {
    const pool = await getPool();

    const result = await pool.request().query(`
      SELECT 
        p.product_id,
        p.product_name,
        p.description,
        p.price,
        p.stock_quantity,
        p.product_link,
        pc.category_name as category,
        ps.pieces_sold,
        ps.rating,
        ISNULL(pd.discount_price, 0) AS discount_price,
        pd.discount_start,
        pd.discount_end,
        p.created_at,
        (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.product_id) AS review_count
      FROM products p
      LEFT JOIN product_stats ps ON p.product_id = ps.product_id
      LEFT JOIN product_categories pc ON p.category_id = pc.category_id
      LEFT JOIN product_discounts pd 
        ON p.product_id = pd.product_id 
        AND GETDATE() BETWEEN pd.discount_start AND pd.discount_end
      ORDER BY p.created_at DESC
    `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Fetch Products Error:", err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

// Get a single product by ID with updated rating and review count
app.get("/products/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    const pool = await getPool();

    const result = await pool
      .request()
      .input("productId", sql.Int, productId)
      .query(`
        SELECT 
          p.product_id,
          p.product_name,
          p.description,
          p.price,
          p.stock_quantity,
          p.product_link,
          pc.category_name as category,
          ps.pieces_sold,
          ps.rating,
          ISNULL(pd.discount_price, 0) AS discount_price,
          pd.discount_start,
          pd.discount_end,
          p.created_at,
          (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.product_id) AS review_count
        FROM products p
        LEFT JOIN product_stats ps ON p.product_id = ps.product_id
        LEFT JOIN product_categories pc ON p.category_id = pc.category_id
        LEFT JOIN product_discounts pd 
          ON p.product_id = pd.product_id 
          AND GETDATE() BETWEEN pd.discount_start AND pd.discount_end
        WHERE p.product_id = @productId
      `);

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.status(404).json({ error: "Product not found" });
    }
  } catch (err) {
    console.error("Fetch Single Product Error:", err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

app.get("/cart/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    console.log(`[CART GET] Fetching cart for user ${userId}`);
    const pool = await getPool();
    
    // Get cart items for this user using the normalized schema
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          ci.cart_item_id, 
          ci.cart_id,
          ci.quantity,
          ci.voucher_id,
          ci.added_at,
          p.product_id, 
          p.product_name, 
          p.price,
          p.product_link,
          ISNULL(pd.discount_price, p.price) AS discount_price
        FROM carts c
        JOIN cart_items ci ON c.cart_id = ci.cart_id
        JOIN products p ON ci.product_id = p.product_id
        LEFT JOIN product_discounts pd ON p.product_id = pd.product_id
            AND GETDATE() BETWEEN pd.discount_start AND pd.discount_end
        WHERE c.user_id = @userId
      `);

    console.log(`[CART GET] Found ${result.recordset.length} cart items for user ${userId}`);
    res.json(result.recordset);
  } catch (err) {
    console.error("[CART GET] Error fetching cart items:", err);
    res.status(500).json({ error: "Failed to fetch cart items" });
  }
});

app.get("/users", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        u.user_id,
        u.name,
        u.email,
        u.created_at,
        uci.phone,
        ua.street_no,
        ua.house_no,
        ua.block_name,
        ua.society,
        ua.city,
        ua.country
      FROM users u
      LEFT JOIN users_contact_info uci ON u.user_id = uci.user_id
      LEFT JOIN users_address ua ON u.user_id = ua.user_id
      ORDER BY u.created_at DESC
    `);

    res.json(result.recordset); // return all user records
  } catch (err) {
    console.error("Fetch Users Error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Get a single user by ID
app.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .query(
        "SELECT user_id, name as username, email, address, phone FROM users WHERE user_id = @userId"
      );

    if (result.recordset.length > 0) {
      res.json(result.recordset[0]); // Send the user data
    } else {
      res.status(404).json({ error: "User not found" });
    }
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

app.post("/users/add", async (req, res) => {
  const {
    name,
    email,
    password,
    street_no,
    house_no,
    block_name,
    society,
    city,
    country,
    phone,
  } = req.body;

  try {
    const pool = await getPool();
    const transaction = new sql.Transaction(pool);

    await transaction.begin();

    const request = new sql.Request(transaction);

    // Step 1: Insert into users
    const userInsertResult = await request
      .input("name", sql.NVarChar, name)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, password).query(`
        INSERT INTO users (name, email, password, created_at)
        OUTPUT INSERTED.user_id
        VALUES (@name, @email, @password, GETDATE())
      `);

    const userId = userInsertResult.recordset[0].user_id;

    // Step 2: Insert into users_address
    await request
      .input("user_id", sql.Int, userId)
      .input("street_no", sql.Int, street_no)
      .input("house_no", sql.Int, house_no)
      .input("block_name", sql.NVarChar, block_name)
      .input("society", sql.NVarChar, society)
      .input("city", sql.NVarChar, city)
      .input("country", sql.NVarChar, country).query(`
        INSERT INTO users_address (user_id, street_no, house_no, block_name, society, city, country)
        VALUES (@user_id, @street_no, @house_no, @block_name, @society, @city, @country)
      `);

    // Step 3: Insert into users_contact_info
    await request.input("phone", sql.NVarChar, phone).query(`
        INSERT INTO users_contact_info (user_id, phone)
        VALUES (@user_id, @phone)
      `);

    await transaction.commit();
    res.json({ success: true, user_id: userId });
  } catch (err) {
    console.error("Add User Error:", err);
    res.status(500).json({ error: "Failed to add user" });
  }
});

app.post("/cart/add", async (req, res) => {
  const { userId, productId, quantity, voucherId } = req.body;

  if (!userId) {
    return res.status(400).json({
      error: "User ID is required. Please login before adding items to cart.",
    });
  }

  try {
    console.log(`[CART ADD] Adding item to cart: userId=${userId}, productId=${productId}, quantity=${quantity || 1}, voucherId=${voucherId || 'null'}`);
    const pool = await getPool();

    // Step 1: Ensure the user has a cart
    console.log(`[CART ADD] Checking if user ${userId} has a cart...`);
    let cartResult = await pool.request().input("userId", sql.Int, userId)
      .query(`
        SELECT cart_id FROM carts WHERE user_id = @userId
      `);

    let cartId;
    if (cartResult.recordset.length === 0) {
      // No cart yet — create one
      console.log(`[CART ADD] Creating new cart for user ${userId}`);
      const newCart = await pool.request().input("userId", sql.Int, userId)
        .query(`
          INSERT INTO carts (user_id) OUTPUT INSERTED.cart_id
          VALUES (@userId)
        `);
      cartId = newCart.recordset[0].cart_id;
      console.log(`[CART ADD] Created new cart with ID ${cartId}`);
    } else {
      cartId = cartResult.recordset[0].cart_id;
      console.log(`[CART ADD] Using existing cart with ID ${cartId}`);
    }

    // Step 2: Check if product is already in cart_items
    console.log(`[CART ADD] Checking if product ${productId} is already in cart...`);
    const existingItem = await pool
      .request()
      .input("cartId", sql.Int, cartId)
      .input("productId", sql.Int, productId).query(`
        SELECT cart_item_id, quantity, voucher_id FROM cart_items
        WHERE cart_id = @cartId AND product_id = @productId
      `);

    if (existingItem.recordset.length > 0) {
      const cartItemId = existingItem.recordset[0].cart_item_id;
      const currentQuantity = existingItem.recordset[0].quantity;
      const currentVoucherId = existingItem.recordset[0].voucher_id;
      const newQuantity = currentQuantity + (quantity || 1);

      console.log(`[CART ADD] Product already in cart. Updating quantity from ${currentQuantity} to ${newQuantity}`);
      
      // Build the query based on whether voucherId should be updated
      let updateQuery;
      const request = pool.request()
        .input("cartItemId", sql.Int, cartItemId)
        .input("quantity", sql.Int, newQuantity);
      
      if (voucherId !== undefined && voucherId !== null) {
        // Include voucher_id in the update
        console.log(`[CART ADD] Also updating voucher_id to ${voucherId}`);
        request.input("voucherId", sql.Int, voucherId);
        updateQuery = `
          UPDATE cart_items
          SET quantity = @quantity, voucher_id = @voucherId
          WHERE cart_item_id = @cartItemId
        `;
      } else if (currentVoucherId) {
        // Keep the existing voucher_id
        console.log(`[CART ADD] Keeping existing voucher_id ${currentVoucherId}`);
        updateQuery = `
          UPDATE cart_items
          SET quantity = @quantity
          WHERE cart_item_id = @cartItemId
        `;
      } else {
        // Simple update, no voucher
        updateQuery = `
          UPDATE cart_items
          SET quantity = @quantity
          WHERE cart_item_id = @cartItemId
        `;
      }
      
      await request.query(updateQuery);

      return res.json({ success: true, updated: true, newQuantity, cartItemId });
    }

    // Step 3: Insert new item into cart_items
    console.log(`[CART ADD] Product not in cart. Adding new cart item.`);
    // Build the INSERT query based on whether voucherId is provided
    let insertQuery;
    const insertRequest = pool.request()
      .input("cartId", sql.Int, cartId)
      .input("productId", sql.Int, productId)
      .input("quantity", sql.Int, quantity || 1);
    
    if (voucherId !== undefined && voucherId !== null) {
      // Include voucher_id in the insert
      console.log(`[CART ADD] Including voucher_id ${voucherId} in new cart item`);
      insertRequest.input("voucherId", sql.Int, voucherId);
      insertQuery = `
        INSERT INTO cart_items (cart_id, product_id, quantity, voucher_id)
        OUTPUT INSERTED.cart_item_id
        VALUES (@cartId, @productId, @quantity, @voucherId)
      `;
    } else {
      // Simple insert, no voucher
      insertQuery = `
        INSERT INTO cart_items (cart_id, product_id, quantity)
        OUTPUT INSERTED.cart_item_id
        VALUES (@cartId, @productId, @quantity)
      `;
    }
    
    const insertResult = await insertRequest.query(insertQuery);
    const cartItemId = insertResult.recordset[0].cart_item_id;
    
    console.log(`[CART ADD] Added item to cart successfully with cart_item_id ${cartItemId}`);
    res.json({ success: true, added: true, cartItemId });
    
  } catch (err) {
    console.error("[CART ADD] Error:", err);
    res.status(500).json({ error: "Failed to add product to cart" });
  }
});

app.delete("/users/delete/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("id", sql.Int, userId)
      .query("DELETE FROM Users WHERE user_id = @id");

    if (result.rowsAffected[0] > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ success: false });
  }
});

app.get("/orders", async (req, res) => {
  try {
    const pool = await getPool();

    // Get all orders with their order items and payment info
    const ordersResult = await pool.request().query(`
      SELECT 
        o.order_id,
        o.user_id,
        u.name as user_name,
        u.email as user_email,
        uci.phone as user_phone,
        o.total_price,
        o.total as final_total,
        o.order_date,
        o.order_status,
        CONCAT(
          ISNULL(CAST(ua.street_no AS VARCHAR), ''),
          ' ',
          ISNULL(CAST(ua.house_no AS VARCHAR), ''),
          ' ',
          ISNULL(ua.block_name, ''),
          ' ',
          ISNULL(ua.society, ''),
          ' ',
          ISNULL(ua.city, ''),
          ' ',
          ISNULL(ua.country, '')
        ) as shipping_address,
        p.payment_method,
        p.payment_status
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.user_id
      LEFT JOIN users_contact_info uci ON o.user_id = uci.user_id
      LEFT JOIN users_address ua ON o.user_id = ua.user_id
      LEFT JOIN payments p ON o.order_id = p.order_id
      ORDER BY o.order_date DESC
    `);

    // If no orders found, return empty array
    if (ordersResult.recordset.length === 0) {
      return res.json([]);
    }

    // Get all order items with product details
    const itemsResult = await pool.request().query(`
      SELECT 
        oi.order_id,
        oi.order_item_id,
        oi.product_id,
        p.product_name,
        p.product_link,
        oi.quantity,
        oi.subtotal,
        (oi.subtotal / oi.quantity) as unit_price
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.product_id
      ORDER BY oi.order_id
    `);

    // Group items by order_id
    const orderItems = {};
    itemsResult.recordset.forEach(item => {
      if (!orderItems[item.order_id]) {
        orderItems[item.order_id] = [];
      }
      orderItems[item.order_id].push(item);
    });

    // Add items to their respective orders
    const orders = ordersResult.recordset.map(order => {
      return {
        ...order,
        items: orderItems[order.order_id] || []
      };
    });

    res.json(orders);
  } catch (err) {
    console.error("Fetch Orders Error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

// Get orders for a specific user
app.get("/orders/user/:userId", async (req, res) => {
  const { userId } = req.params;
  
  console.log(`Fetching orders for user: ${userId}`);
  
  if (!userId) {
    return res.status(400).json({ error: "User ID is required" });
  }
  
  try {
    const pool = await getPool();
    
    // Get all orders for this user
    const ordersResult = await pool.request()
      .input("userId", sql.Int, userId)
      .query(`
        SELECT 
          o.order_id,
          o.user_id,
          o.total_price,
          o.total as final_total,
          o.order_date,
          o.order_status,
          CONCAT(
            ISNULL(CAST(ua.street_no AS VARCHAR), ''),
            ' ',
            ISNULL(CAST(ua.house_no AS VARCHAR), ''),
            ' ',
            ISNULL(ua.block_name, ''),
            ' ',
            ISNULL(ua.society, ''),
            ' ',
            ISNULL(ua.city, ''),
            ' ',
            ISNULL(ua.country, '')
          ) as shipping_address,
          p.payment_method,
          p.payment_status
        FROM orders o
        LEFT JOIN users_address ua ON o.user_id = ua.user_id
        LEFT JOIN payments p ON o.order_id = p.order_id
        WHERE o.user_id = @userId
        ORDER BY o.order_date DESC
      `);
    
    // If no orders found, return empty array
    if (ordersResult.recordset.length === 0) {
      return res.json([]);
    }
    
    // Get all items for these orders
    const orderIds = ordersResult.recordset.map(order => order.order_id);
    
    // Convert array to comma-separated string for the IN clause
    const orderIdsString = orderIds.join(',');
    
    const itemsResult = await pool.request()
      .query(`
        SELECT 
          oi.order_id,
          oi.order_item_id,
          oi.product_id,
          p.product_name,
          p.product_link,
          oi.quantity,
          oi.subtotal,
          (oi.subtotal / oi.quantity) as unit_price
        FROM order_items oi
        LEFT JOIN products p ON oi.product_id = p.product_id
        WHERE oi.order_id IN (${orderIdsString})
        ORDER BY oi.order_id
      `);
    
    // Group items by order_id
    const orderItems = {};
    itemsResult.recordset.forEach(item => {
      if (!orderItems[item.order_id]) {
        orderItems[item.order_id] = [];
      }
      orderItems[item.order_id].push(item);
    });
    
    // Add items to their respective orders
    const orders = ordersResult.recordset.map(order => {
      return {
        ...order,
        items: orderItems[order.order_id] || []
      };
    });
    
    res.json(orders);
  } catch (err) {
    console.error(`Error fetching orders for user ${userId}:`, err);
    res.status(500).json({ error: "Failed to fetch user orders" });
  }
});

// DELETE /orders/delete/:orderId  – remove a single order
app.delete("/orders/delete/:orderId", async (req, res) => {
  const { orderId } = req.params;

  // Basic validation
  if (!orderId) {
    return res.status(400).json({ error: "Missing orderId parameter" });
  }

  try {
    // Get a pooled connection
    const pool = await getPool();

    // Delete order items first
    await pool.request().input("orderId", sql.Int, orderId)
      .query(`
        DELETE FROM order_items
        WHERE order_id = @orderId
      `);

    // Delete payment record if exists
    await pool.request().input("orderId", sql.Int, orderId)
      .query(`
        DELETE FROM payments
        WHERE order_id = @orderId
      `);

    // Parameterised DELETE to avoid SQL‑injection
    const result = await pool.request().input("orderId", sql.Int, orderId)
      .query(`
        DELETE FROM orders
        WHERE order_id = @orderId
      `);

    // No rows affected ➜ order not found
    if (result.rowsAffected[0] === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    // Success 🎉
    res.json({ success: true });
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/admin", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query("SELECT * FROM admins");

    if (result.recordset.length === 0) {
      return res.status(404).json({ error: "Admin not found" });
    }

    res.json(result.recordset[0]);
  } catch (err) {
    console.error("Error fetching admin profile:", err);
    res.status(500).json({ error: err.message });
  }
});

// Admin Login
app.post("/admin/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  try {
    const pool = await getPool();
    const result = await pool
      .request()
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, password).query(`
        SELECT admin_id, name
        FROM admins
        WHERE email = @email AND password = @password
      `);

    if (result.recordset.length > 0) {
      const admin = result.recordset[0];
      console.log("✅ Admin login successful:", admin.name);
      res.json({
        success: true,
        adminId: admin.admin_id,
        adminName: admin.name,
      });
    } else {
      console.log(
        "❌ Admin login failed: Invalid credentials for email:",
        email
      );
      res.status(401).json({
        success: false,
        error: "Invalid email or password",
      });
    }
  } catch (err) {
    console.error("Admin Login Error:", err);
    res.status(500).json({
      success: false,
      error: "Login failed due to server error",
    });
  }
});

// Removed the insecure PUT route that didn't validate current password

// Get available vouchers for a user - with improved error handling
app.get("/vouchers/:userId", async (req, res) => {
  const { userId } = req.params;

  console.log("=============================================");
  console.log(`VOUCHER REQUEST received for userId: ${userId}`);
  console.log("=============================================");

  try {
    const pool = await getPool();

    // Based on the user-provided schema, query the vouchers table correctly
    const vouchersQuery = `
        SELECT 
        v.voucher_id, 
        v.code, 
        v.admin_id,
        v.discount_amount,
        v.min_order_value,
        v.expiry_date, 
        v.usage_limit,
        v.status,
        v.created_at,
        CASE WHEN uv.user_voucher_id IS NOT NULL THEN 'user_specific' ELSE 'global' END as voucher_type,
        uv.user_voucher_id,
        uv.claimed_at,
        uv.used
      FROM vouchers v 
      LEFT JOIN user_vouchers uv ON v.voucher_id = uv.voucher_id AND uv.user_id = @userId
      WHERE (v.status = 'active' OR v.status IS NULL)
        AND (v.expiry_date IS NULL OR v.expiry_date > GETDATE())
        AND (uv.user_id IS NULL OR uv.user_id = @userId)
        AND (uv.used IS NULL OR uv.used = 0)
    `;
    
    // Execute the query
    const vouchersResult = await pool.request()
      .input("userId", sql.Int, userId)
      .query(vouchersQuery);
      
    console.log(`Query returned ${vouchersResult.recordset.length} vouchers`);

    // If no vouchers found, create a default welcome voucher
    if (vouchersResult.recordset.length === 0) {
      console.log("No vouchers found. Creating default welcome voucher...");
      
      try {
        // Create a welcome voucher in the database
        console.log("Creating new welcome voucher...");
        const welcomeVoucherResult = await pool.request()
          .input("code", sql.VarChar(50), "WELCOME10")
          .input("discountAmount", sql.Decimal(10, 2), 100.00)
          .input("minOrderValue", sql.Decimal(10, 2), 500.00)
          .input("expiryDate", sql.DateTime, new Date(new Date().setMonth(new Date().getMonth() + 1)))
          .input("usageLimit", sql.Int, 1)
          .input("status", sql.VarChar(10), "active")
          .query(`
            IF NOT EXISTS (SELECT 1 FROM vouchers WHERE code = @code)
            BEGIN
              INSERT INTO vouchers (code, discount_amount, min_order_value, expiry_date, usage_limit, status)
              OUTPUT INSERTED.voucher_id
              VALUES (@code, @discountAmount, @minOrderValue, @expiryDate, @usageLimit, @status)
            END
            ELSE
            BEGIN
              SELECT voucher_id FROM vouchers WHERE code = @code
            END
          `);
          
        if (welcomeVoucherResult.recordset.length > 0) {
          const voucherId = welcomeVoucherResult.recordset[0].voucher_id;
          console.log(`Welcome voucher ID: ${voucherId}`);
          
          // Assign to user if not already assigned
          const assignResult = await pool.request()
            .input("userId", sql.Int, userId)
            .input("voucherId", sql.Int, voucherId)
            .query(`
              IF NOT EXISTS (SELECT 1 FROM user_vouchers WHERE user_id = @userId AND voucher_id = @voucherId)
              BEGIN
                INSERT INTO user_vouchers (user_id, voucher_id, claimed_at, used)
                OUTPUT INSERTED.user_voucher_id
                VALUES (@userId, @voucherId, GETDATE(), 0)
              END
              ELSE
              BEGIN
                SELECT user_voucher_id FROM user_vouchers 
                WHERE user_id = @userId AND voucher_id = @voucherId AND (used = 0 OR used IS NULL)
              END
            `);
            
          if (assignResult.recordset.length > 0) {
            const userVoucherId = assignResult.recordset[0].user_voucher_id;
            console.log(`Assigned voucher to user, user_voucher_id: ${userVoucherId}`);
            
            // Return the welcome voucher
            return res.json([{
              voucher_id: voucherId,
              code: "WELCOME10",
              discount_amount: 100.00,
              min_order_value: 500.00,
              expiry_date: new Date(new Date().setMonth(new Date().getMonth() + 1)),
              usage_limit: 1,
              status: "active",
              voucher_type: "user_specific",
              user_voucher_id: userVoucherId,
              // Add these for frontend compatibility
              discount_type: "fixed",
              discount_value: 100.00,
              minimum_order_value: 500.00,
              max_discount: 100.00
            }]);
          }
        }
      } catch (voucherCreateError) {
        console.error("Error creating welcome voucher:", voucherCreateError);
      }
    }

    // Process vouchers to ensure they have proper format for frontend compatibility
    const processedVouchers = vouchersResult.recordset.map((voucher) => {
      // Create a copy of the voucher to modify
      const processedVoucher = { ...voucher };

      // Add frontend-compatible properties
      processedVoucher.discount_type = processedVoucher.discount_amount > 100 ? "fixed" : "percentage";
      processedVoucher.discount_value = processedVoucher.discount_amount;
      processedVoucher.minimum_order_value = processedVoucher.min_order_value;
      
      // Add reasonable max_discount for percentage vouchers
      if (processedVoucher.discount_type === "percentage") {
        processedVoucher.max_discount = 1000;
      } else {
        processedVoucher.max_discount = processedVoucher.discount_amount;
      }

      return processedVoucher;
    });

    res.json(processedVouchers);
  } catch (err) {
    console.error("Error in voucher retrieval:", err.message);
    // Still return empty array to not break the frontend
    res.json([]);
  }
});

// Endpoint to mark a voucher as used
app.post("/vouchers/use", async (req, res) => {
  const { userId, voucherId, userVoucherId } = req.body;
  
  if (!userId || !voucherId) {
    return res.status(400).json({ error: "Missing userId or voucherId" });
  }
  
  try {
    const pool = await getPool();
    
    // If it's a user-specific voucher, mark it as used in user_vouchers table
    if (userVoucherId) {
      await pool.request()
        .input("userVoucherId", sql.Int, userVoucherId)
        .query(`
          UPDATE user_vouchers
          SET used = 1
          WHERE user_voucher_id = @userVoucherId
        `);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error("Error marking voucher as used:", err);
    res.status(500).json({ error: "Failed to mark voucher as used" });
  }
});

//For changing of quantity in cart
app.put("/cart/:cartId", async (req, res) => {
  const { cartId } = req.params;
  const { quantity } = req.body;

  // Log the request for debugging
  console.log(`[CART UPDATE] Request received - cartId=${cartId} (${typeof cartId}), quantity=${quantity} (${typeof quantity}), body=${JSON.stringify(req.body)}`);
  
  try {
    console.log(`[CART UPDATE] Connecting to database...`);
    const pool = await getPool();
    console.log(`[CART UPDATE] Connected to database successfully`);

    // Parse cartId as integer to ensure proper type
    const cartItemId = parseInt(cartId, 10);
    if (isNaN(cartItemId)) {
      console.error(`[CART UPDATE] Invalid cartId: ${cartId} - not a number`);
      return res.status(400).json({ error: `Invalid cart item ID: must be a number` });
    }
    console.log(`[CART UPDATE] Parsed cartId ${cartId} as integer: ${cartItemId}`);

    // Check if the cart item exists in the cart_items table using cart_item_id
    console.log(`[CART UPDATE] Checking if cart item ${cartItemId} exists...`);
    let oldRow;
    try {
      oldRow = await pool.request().input("cartItemId", sql.Int, cartItemId).query(`
          SELECT cart_item_id, cart_id, product_id, quantity, added_at
          FROM cart_items
          WHERE cart_item_id = @cartItemId
      `);
      
      console.log(`[CART UPDATE] Query result:`, oldRow.recordset.length > 0 ? 
        { 
          found: true,
          cart_item_id: oldRow.recordset[0].cart_item_id,
          cart_id: oldRow.recordset[0].cart_id,
          quantity: oldRow.recordset[0].quantity
        } : 
        { found: false }
      );
    } catch (dbError) {
      console.error(`[CART UPDATE] Database error checking cart item: ${dbError.message}`);
      return res.status(500).json({ error: `Database error checking cart item: ${dbError.message}` });
    }

    if (!oldRow || oldRow.recordset.length === 0) {
      console.error(`[CART UPDATE] Cart item ${cartItemId} not found`);
      return res.status(404).json({ error: `Cart item with id ${cartItemId} not found` });
    }

    // Parse quantity as integer
    const parsedQuantity = parseInt(quantity, 10);
    if (isNaN(parsedQuantity)) {
      console.error(`[CART UPDATE] Invalid quantity: ${quantity} - not a number`);
      return res.status(400).json({ error: `Invalid quantity: must be a number` });
    }
    console.log(`[CART UPDATE] Parsed quantity ${quantity} as integer: ${parsedQuantity}`);

    // If quantity is 0, delete the item
    if (parsedQuantity === 0) {
      console.log(`[CART UPDATE] Deleting cart item ${cartItemId} because quantity is 0`);
      try {
        await pool.request().input("cartItemId", sql.Int, cartItemId).query(`
            DELETE FROM cart_items
            WHERE cart_item_id = @cartItemId
        `);
        console.log(`[CART UPDATE] Cart item ${cartItemId} deleted successfully`);
        return res.status(200).json({ success: true, message: `Cart item ${cartItemId} removed from cart` });
      } catch (dbError) {
        console.error(`[CART UPDATE] Database error deleting cart item: ${dbError.message}`);
        return res.status(500).json({ error: `Database error deleting cart item: ${dbError.message}` });
      }
    }

    // Update the cart item with the new quantity
    console.log(`[CART UPDATE] Updating cart item ${cartItemId} to quantity ${parsedQuantity}`);
    try {
      await pool.request()
        .input("cartItemId", sql.Int, cartItemId)
        .input("quantity", sql.Int, parsedQuantity)
        .query(`
            UPDATE cart_items
            SET quantity = @quantity
            WHERE cart_item_id = @cartItemId
        `);
      console.log(`[CART UPDATE] Cart item ${cartItemId} updated successfully to quantity ${parsedQuantity}`);
      return res.status(200).json({ 
      success: true,
        message: `Cart item ${cartItemId} updated successfully`, 
        quantity: parsedQuantity,
        cartItemId: cartItemId
      });
    } catch (dbError) {
      console.error(`[CART UPDATE] Database error updating cart item: ${dbError.message}`);
      return res.status(500).json({ error: `Database error updating cart item: ${dbError.message}` });
    }
  } catch (error) {
    console.error(`[CART UPDATE] Server error: ${error.message}`);
    return res.status(500).json({ error: `Server error: ${error.message}` });
  }
});

app.post("/checkout", async (req, res) => {
  const { userId, cartItemIds, voucherId, userVoucherId, paymentMethod } = req.body;
  
  console.log("[CHECKOUT] Request body:", JSON.stringify(req.body));

  if (!userId) {
    console.error('[CHECKOUT] Missing userId in request');
    return res.status(400).json({ error: "User ID is required" });
  }

  if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
    console.error('[CHECKOUT] Missing or invalid cartItemIds in request:', cartItemIds);
    return res.status(400).json({ error: "No items selected for checkout" });
  }

  try {
    console.log(`[CHECKOUT] Processing checkout for user ${userId}`);
    console.log(`[CHECKOUT] Items: ${cartItemIds.join(', ')}${voucherId ? ', with voucher: ' + voucherId : ''}`);
    console.log(`[CHECKOUT] Payment method: ${paymentMethod || 'cod'}`);
    
    const pool = await getPool();

    // Step 1: Verify that each cart item exists and belongs to the user
    console.log(`[CHECKOUT] Verifying cart items belong to user ${userId}...`);
    
    // Create parameter placeholders for the cart item IDs
    const cartItemIdParams = cartItemIds.map((_, i) => `@cartItemId${i}`).join(', ');
    
    // Build the query
    const verifyItemsQuery = `
      SELECT 
        ci.cart_item_id, 
        ci.cart_id,
        ci.quantity,
        ci.voucher_id,
        p.product_id, 
        p.product_name, 
        p.price,
        p.stock_quantity,
        ISNULL(pd.discount_price, p.price) AS discount_price
      FROM carts c
      JOIN cart_items ci ON c.cart_id = ci.cart_id
      JOIN products p ON ci.product_id = p.product_id
      LEFT JOIN product_discounts pd ON p.product_id = pd.product_id
          AND GETDATE() BETWEEN pd.discount_start AND pd.discount_end
      WHERE c.user_id = @userId
        AND ci.cart_item_id IN (${cartItemIdParams})
    `;
    
    const verifyRequest = pool.request().input("userId", sql.Int, userId);
    
    // Add parameters for each cart item ID
    for (let i = 0; i < cartItemIds.length; i++) {
      verifyRequest.input(`cartItemId${i}`, sql.Int, cartItemIds[i]);
    }
    
    const verifyItemsResult = await verifyRequest.query(verifyItemsQuery);
    console.log(`[CHECKOUT] Found ${verifyItemsResult.recordset.length} matching cart items`);

    // Check if all items were found
    if (verifyItemsResult.recordset.length !== cartItemIds.length) {
      console.log(`[CHECKOUT] Not all cart items were found for user ${userId}`);
      return res.status(400).json({ error: "Some items don't exist or don't belong to your cart" });
    }

    // Step 2: Check if all products are in stock
    const outOfStockItems = verifyItemsResult.recordset.filter(
      item => item.quantity > item.stock_quantity
    );

    if (outOfStockItems.length > 0) {
      console.log(`[CHECKOUT] Out of stock items found:`, outOfStockItems);
      return res.status(400).json({
        error: "Some items are out of stock",
        items: outOfStockItems.map(item => ({
          cart_item_id: item.cart_item_id,
          product_name: item.product_name,
          requested: item.quantity,
          available: item.stock_quantity
        }))
      });
    }

    // Step 3: Calculate order total
    const subtotal = verifyItemsResult.recordset.reduce(
      (sum, item) => sum + (parseFloat(item.discount_price) * item.quantity),
      0
    );
    console.log(`[CHECKOUT] Order subtotal: ${subtotal}`);

    // Step 4: Apply voucher if provided
    let totalDiscount = 0;
    let appliedVoucher = null;
    
    if (voucherId) {
      console.log(`[CHECKOUT] Processing voucher ${voucherId}`);
      const voucherResult = await pool.request()
        .input("voucherId", sql.Int, voucherId)
        .query(`
          SELECT voucher_id, code, discount_amount, min_order_value, expiry_date
          FROM vouchers
          WHERE voucher_id = @voucherId
            AND status = 'active' 
            AND expiry_date > GETDATE()
        `);

      if (voucherResult.recordset.length > 0) {
        const voucher = voucherResult.recordset[0];
        if (subtotal >= parseFloat(voucher.min_order_value)) {
          // Check if it's a percentage or fixed discount
          const isPercentage = voucher.discount_amount <= 100;
          
          if (isPercentage) {
            // Calculate percentage discount
            totalDiscount = (subtotal * voucher.discount_amount) / 100;
            
            // Cap at max discount (default 1000)
            const maxDiscount = 1000;
            if (totalDiscount > maxDiscount) {
              totalDiscount = maxDiscount;
            }
          } else {
            // Fixed amount discount
            totalDiscount = parseFloat(voucher.discount_amount);
          }
          
          console.log(`[CHECKOUT] Applied voucher ${voucherId} with discount ${totalDiscount}`);
          appliedVoucher = voucher;
    } else {
          console.log(`[CHECKOUT] Order total ${subtotal} is less than voucher min_order_value ${voucher.min_order_value}`);
        }
      } else {
        console.log(`[CHECKOUT] Voucher ${voucherId} not found or not active`);
      }
    }

    // Calculate final total
    const finalTotal = Math.max(0, subtotal - totalDiscount);
    console.log(`[CHECKOUT] Order calculation: Subtotal ${subtotal}, Discount ${totalDiscount}, Final ${finalTotal}`);

    // Step 5: Create order
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Double-check stock levels before proceeding - they might have changed since verification
      console.log(`[CHECKOUT] Double-checking stock levels before finalizing order...`);
      for (const item of verifyItemsResult.recordset) {
        const stockCheckResult = await new sql.Request(transaction)
          .input("productId", sql.Int, item.product_id)
          .input("quantity", sql.Int, item.quantity)
          .query(`
            SELECT product_id, stock_quantity, @quantity AS requested_quantity,
            CASE WHEN stock_quantity >= @quantity THEN 1 ELSE 0 END AS has_sufficient_stock
            FROM products WHERE product_id = @productId
          `);
            
        if (stockCheckResult.recordset.length === 0) {
          throw new Error(`Product ${item.product_id} no longer exists`);
        }
            
        const stockCheck = stockCheckResult.recordset[0];
        if (stockCheck.has_sufficient_stock !== 1) {
          throw new Error(`Product ${item.product_id} (${item.product_name}) now has insufficient stock. Available: ${stockCheck.stock_quantity}, Requested: ${stockCheck.requested_quantity}`);
        }
      }

      // Store voucher information separately if needed later
      let appliedVoucherId = null;
      if (voucherId) {
        appliedVoucherId = voucherId;
        console.log(`[CHECKOUT] Storing voucher ID ${appliedVoucherId} for reference`);
      }

      // Create order record
      console.log(`[CHECKOUT] Creating order for user ${userId}...`);
      const orderResult = await new sql.Request(transaction)
        .input("userId", sql.Int, userId)
        .input("totalPrice", sql.Decimal(10, 2), subtotal)
        .input("discount", sql.Decimal(10, 2), totalDiscount)
        .input("finalTotal", sql.Decimal(10, 2), finalTotal)
        .input("status", sql.VarChar, "processing")
      .query(`
          INSERT INTO orders (
            user_id, 
            total_price, 
            total, 
            order_status
          )
          OUTPUT INSERTED.order_id
          VALUES (
            @userId, 
            @totalPrice, 
            @finalTotal, 
            @status
          )
        `);

      const orderId = orderResult.recordset[0].order_id;
      console.log(`[CHECKOUT] Created order ${orderId}`);
      
      // If there's a voucher, store the relation separately
      if (voucherId) {
        try {
          console.log(`[CHECKOUT] Recording voucher ${voucherId} usage for order ${orderId}`);
          // Create a separate record linking order to voucher if needed
          // This approach doesn't require modifying the orders table
          await new sql.Request(transaction)
            .input("orderId", sql.Int, orderId)
            .input("voucherId", sql.Int, voucherId)
            .query(`
              IF OBJECT_ID('order_vouchers', 'U') IS NOT NULL
              BEGIN
                INSERT INTO order_vouchers (order_id, voucher_id)
                VALUES (@orderId, @voucherId)
              END
            `);
        } catch (voucherErr) {
          // This shouldn't stop the checkout process if it fails
          console.warn(`[CHECKOUT] Could not record voucher usage: ${voucherErr.message}`);
        }
      }

      // Create order items
      console.log(`[CHECKOUT] Creating order items...`);
      for (const item of verifyItemsResult.recordset) {
        await new sql.Request(transaction)
          .input("orderId", sql.Int, orderId)
          .input("productId", sql.Int, item.product_id)
          .input("quantity", sql.Int, item.quantity)
          .input("subtotal", sql.Decimal(10, 2), parseFloat(item.discount_price) * item.quantity)
          .query(`
            INSERT INTO order_items (order_id, product_id, quantity, subtotal)
            VALUES (@orderId, @productId, @quantity, @subtotal)
          `);

        // Update product stock
        await new sql.Request(transaction)
          .input("productId", sql.Int, item.product_id)
          .input("quantity", sql.Int, item.quantity)
          .query(`
            UPDATE products
            SET stock_quantity = stock_quantity - @quantity
            WHERE product_id = @productId
          `);
          
        // Track inventory changes
        try {
          console.log(`[CHECKOUT] Tracking inventory for product ${item.product_id}, quantity ${item.quantity}`);
          await new sql.Request(transaction)
            .input("productId", sql.Int, item.product_id)
            .input("quantity", sql.Int, item.quantity)
            .query(`
              INSERT INTO inventory (product_id, stock_added, stock_removed, updated_at)
              VALUES (@productId, 0, @quantity, GETDATE())
            `);
          console.log(`[CHECKOUT] Inventory tracking successful for product ${item.product_id}`);
        } catch (invErr) {
          console.error(`[CHECKOUT] Error tracking inventory for product ${item.product_id}:`, invErr);
        }
      }

      // Create payment record
      console.log(`[CHECKOUT] Creating payment record...`);
      const paymentStatus = paymentMethod === "cod" ? "pending" : "completed";
      try {
        // First check if the payments table structure has a voucher_id column
        const paymentTableInfo = await new sql.Request(transaction).query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'payments' AND COLUMN_NAME = 'voucher_id'
        `);
        
        const hasVoucherIdColumn = paymentTableInfo.recordset.length > 0;
        
        if (hasVoucherIdColumn && voucherId) {
          // If voucher_id column exists in payments table, use it
          await new sql.Request(transaction)
            .input("orderId", sql.Int, orderId)
            .input("paymentMethod", sql.VarChar, paymentMethod || "cod")
            .input("paymentStatus", sql.VarChar, paymentStatus)
            .input("voucherId", sql.Int, voucherId)
            .query(`
              INSERT INTO payments (order_id, payment_method, payment_status, voucher_id)
              VALUES (@orderId, @paymentMethod, @paymentStatus, @voucherId)
            `);
        } else {
          // Otherwise use the standard columns
          await new sql.Request(transaction)
            .input("orderId", sql.Int, orderId)
            .input("paymentMethod", sql.VarChar, paymentMethod || "cod")
            .input("paymentStatus", sql.VarChar, paymentStatus)
            .query(`
              INSERT INTO payments (order_id, payment_method, payment_status)
              VALUES (@orderId, @paymentMethod, @paymentStatus)
            `);
        }
        console.log(`[CHECKOUT] Payment record created successfully`);
      } catch (payErr) {
        console.error(`[CHECKOUT] Error creating payment record:`, payErr);
        throw new Error(`Payment creation failed: ${payErr.message}`);
      }

      // If a voucher was applied, mark it as used
      if (voucherId && userVoucherId) {
        console.log(`[CHECKOUT] Marking voucher ${voucherId} (user voucher ${userVoucherId}) as used`);
        try {
          await new sql.Request(transaction)
            .input("userVoucherId", sql.Int, userVoucherId)
            .query(`
              UPDATE user_vouchers
              SET used = 1
              WHERE user_voucher_id = @userVoucherId
            `);
          console.log(`[CHECKOUT] Voucher marked as used successfully`);
        } catch (voucherErr) {
          console.error(`[CHECKOUT] Error marking voucher as used:`, voucherErr);
        }
      }

      // Remove cart items that were part of this order
      console.log(`[CHECKOUT] Removing ordered items from cart...`);
      try {
        // Build parameterized query for cart items deletion
        const deleteParams = new sql.Request(transaction);
        
        // Add parameters for each cart item ID
        const deleteParamNames = [];
        for (let i = 0; i < cartItemIds.length; i++) {
          const paramName = `cartItemId${i}`;
          deleteParams.input(paramName, sql.Int, cartItemIds[i]);
          deleteParamNames.push(`@${paramName}`);
        }
        
        const deleteQuery = `
          DELETE FROM cart_items 
          WHERE cart_item_id IN (${deleteParamNames.join(', ')})
        `;
        
        console.log(`[CHECKOUT] Executing cart items deletion query...`);
        await deleteParams.query(deleteQuery);
        console.log(`[CHECKOUT] Cart items deleted successfully`);
      } catch (delErr) {
        console.error(`[CHECKOUT] Error deleting cart items:`, delErr);
      }

      // Commit transaction
      await transaction.commit();
      console.log(`[CHECKOUT] Order ${orderId} completed successfully`);

      // Return successful response
      res.json({
        success: true,
        orderId,
        totalBeforeDiscount: subtotal,
        discount: totalDiscount,
        finalTotal,
        paymentMethod: paymentMethod || "cod",
        paymentStatus,
        voucherApplied: appliedVoucher ? {
          voucherId: appliedVoucher.voucher_id,
          code: appliedVoucher.code,
          discountAmount: totalDiscount
        } : null
      });
    } catch (txErr) {
      // If there's an error, rollback transaction
      await transaction.rollback();
      console.error("[CHECKOUT] Transaction error:", txErr);
      res.status(500).json({ error: "Failed to process order: " + txErr.message });
    }
  } catch (err) {
    console.error("[CHECKOUT] Error:", err);
    res.status(500).json({ error: "Failed to process checkout: " + err.message });
  }
});

// Helper function to check and create reviews table
async function checkAndCreateReviewsTable() {
  console.log("Checking reviews table structure...");
  try {
    // Check if reviews table exists
    const pool = await getPool();
    const reviewsTableCheck = await pool.request().query(`
      SELECT OBJECT_ID('reviews') as table_id
    `);
    
    if (!reviewsTableCheck.recordset[0].table_id) {
      console.log("Creating reviews table...");
      await pool.request().query(`
        CREATE TABLE reviews (
          review_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL,
          product_id INT NOT NULL,
          rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          review_text TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id),
          FOREIGN KEY (product_id) REFERENCES products(product_id),
          CONSTRAINT UQ_user_product_review UNIQUE (user_id, product_id)
        )
      `);
    }
    
    console.log("Reviews table structure check completed");
    return true;
  } catch (error) {
    console.error("Error checking reviews table:", error);
    return false;
  }
}

// GET endpoint to retrieve reviews for a specific product
app.get("/reviews/product/:productId", async (req, res) => {
  const { productId } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request().input("productId", sql.Int, productId)
      .query(`
        SELECT r.review_id, r.user_id, r.product_id, r.rating, r.review_text, r.created_at, 
               u.name as user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.user_id
        WHERE r.product_id = @productId
        ORDER BY r.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching product reviews:", err);
    res.status(500).json({ error: "Failed to fetch product reviews" });
  }
});

// GET endpoint to retrieve reviews by a specific user
app.get("/reviews/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getPool();
    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT r.review_id, r.user_id, r.product_id, r.rating, r.review_text, r.created_at,
               p.product_name, p.product_link
        FROM reviews r
        JOIN products p ON r.product_id = p.product_id
        WHERE r.user_id = @userId
        ORDER BY r.created_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching user reviews:", err);
    res.status(500).json({ error: "Failed to fetch user reviews" });
  }
});

// POST endpoint to add a new review
app.post("/reviews/add", async (req, res) => {
  const { userId, productId, rating, reviewText } = req.body;

  // Validate required fields
  if (!userId || !productId || !rating) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Validate rating range
  if (rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Rating must be between 1 and 5" });
  }

  try {
    const pool = await getPool();

    // Check if user has already reviewed this product
    const checkExisting = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("productId", sql.Int, productId).query(`
        SELECT review_id FROM reviews 
        WHERE user_id = @userId AND product_id = @productId
      `);

    if (checkExisting.recordset.length > 0) {
      // Update existing review
      const result = await pool
        .request()
        .input("userId", sql.Int, userId)
        .input("productId", sql.Int, productId)
        .input("rating", sql.Int, rating)
        .input("reviewText", sql.NVarChar, reviewText || "").query(`
          UPDATE reviews 
          SET rating = @rating, review_text = @reviewText, created_at = GETDATE()
          WHERE user_id = @userId AND product_id = @productId;
          
          SELECT review_id FROM reviews 
          WHERE user_id = @userId AND product_id = @productId;
        `);

      // Update product rating after updating review
      await updateProductRating(productId);

      return res.json({
        success: true,
        message: "Review updated successfully",
        reviewId: result.recordset[0].review_id,
      });
    }

    // Insert new review
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("productId", sql.Int, productId)
      .input("rating", sql.Int, rating)
      .input("reviewText", sql.NVarChar, reviewText || "").query(`
        INSERT INTO reviews (user_id, product_id, rating, review_text)
        OUTPUT INSERTED.review_id
        VALUES (@userId, @productId, @rating, @reviewText)
      `);

    // Update product rating
    await updateProductRating(productId);

    res.json({
      success: true,
      message: "Review added successfully",
      reviewId: result.recordset[0].review_id,
    });
  } catch (err) {
    console.error("Error adding review:", err);
    res.status(500).json({ error: "Failed to add review" });
  }
});

// DELETE endpoint to remove a review
app.delete("/reviews/:reviewId", async (req, res) => {
  const { reviewId } = req.params;

  try {
    const pool = await getPool();

    // Get the product ID before deleting the review (for updating product rating)
    const getProductId = await pool
      .request()
      .input("reviewId", sql.Int, reviewId)
      .query(`SELECT product_id FROM reviews WHERE review_id = @reviewId`);

    if (getProductId.recordset.length === 0) {
      return res.status(404).json({ error: "Review not found" });
    }

    const productId = getProductId.recordset[0].product_id;

    // Delete the review
    await pool
      .request()
      .input("reviewId", sql.Int, reviewId)
      .query(`DELETE FROM reviews WHERE review_id = @reviewId`);

    // Update product rating
    await updateProductRating(productId);

    res.json({ success: true, message: "Review deleted successfully" });
  } catch (err) {
    console.error("Error deleting review:", err);
    res.status(500).json({ error: "Failed to delete review" });
  }
});

// Helper function to update product rating based on reviews
async function updateProductRating(productId) {
  try {
    const pool = await getPool();

    // Calculate average rating and count from reviews
    const ratingData = await pool
      .request()
      .input("productId", sql.Int, productId).query(`
        SELECT 
          AVG(CAST(rating AS FLOAT)) AS average_rating,
          COUNT(*) AS review_count
        FROM reviews
        WHERE product_id = @productId
      `);

    const averageRating = ratingData.recordset[0].average_rating || 0;

    // Update product_stats table instead of products
    await pool
      .request()
      .input("productId", sql.Int, productId)
      .input("rating", sql.Decimal(10, 1), averageRating).query(`
        UPDATE product_stats
        SET rating = @rating
        WHERE product_id = @productId
      `);

    console.log(
      `Updated product_stats for product ${productId} rating to ${averageRating}`
    );
  } catch (err) {
    console.error(
      `Error updating rating in product_stats for product ${productId}:`,
      err
    );
  }
}

// GET endpoint to check if a user has purchased a specific product
app.get("/orders/user/:userId/product/:productId", async (req, res) => {
  const { userId, productId } = req.params;

  try {
    const pool = await getPool();

    // Check if product exists in user's orders
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("productId", sql.Int, productId).query(`
        SELECT COUNT(*) AS purchaseCount
        FROM orders o
        JOIN order_items oi ON o.order_id = oi.order_id
        WHERE o.user_id = @userId AND oi.product_id = @productId
      `);

    const hasPurchased = result.recordset[0].purchaseCount > 0;

    // For demonstration purposes, always allow reviews
    // Remove this in production and use the actual purchase history
    res.json({
      hasPurchased: true,
      purchaseCount: result.recordset[0].purchaseCount,
    });
  } catch (err) {
    console.error("Error checking purchase history:", err);
    res.status(500).json({
      error: "Failed to check purchase history",
      // For demonstration, still allow reviews
      hasPurchased: true,
    });
  }
});

// Helper function to check and create wishlist tables
async function checkAndCreateWishlistTables() {
  console.log("Checking wishlist tables structure...");
  try {
    const pool = await getPool();
    // Check if wishlist table exists
    const wishlistTableCheck = await pool.request().query(`
      SELECT OBJECT_ID('wishlists') as table_id
    `);
    
    if (!wishlistTableCheck.recordset[0].table_id) {
      console.log("Creating wishlists table...");
      await pool.request().query(`
        CREATE TABLE wishlists (
          wishlist_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
      `);
    }
    
    // Check if wishlist_items table exists
    const wishlistItemsTableCheck = await pool.request().query(`
      SELECT OBJECT_ID('wishlist_items') as table_id
    `);
    
    if (!wishlistItemsTableCheck.recordset[0].table_id) {
      console.log("Creating wishlist_items table...");
      await pool.request().query(`
        CREATE TABLE wishlist_items (
          wishlist_item_id INT PRIMARY KEY IDENTITY(1,1),
          wishlist_id INT NOT NULL,
          product_id INT NOT NULL,
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (wishlist_id) REFERENCES wishlists(wishlist_id),
          FOREIGN KEY (product_id) REFERENCES products(product_id),
          CONSTRAINT UQ_wishlist_product UNIQUE (wishlist_id, product_id)
        )
      `);
    }
    
    console.log("Wishlist tables structure check completed");
    return true;
  } catch (error) {
    console.error("Error checking wishlist tables:", error);
    return false;
  }
}

// GET endpoint to retrieve a user's wishlist
app.get("/wishlist/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const pool = await getPool();

    const result = await pool.request().input("userId", sql.Int, userId).query(`
        SELECT 
          wi.wishlist_item_id,
          wi.added_at,
          p.*
        FROM wishlists w
        JOIN wishlist_items wi ON w.wishlist_id = wi.wishlist_id
        JOIN products p ON wi.product_id = p.product_id
        WHERE w.user_id = @userId
        ORDER BY wi.added_at DESC
      `);

    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching wishlist:", err);
    res.status(500).json({ error: "Failed to fetch wishlist" });
  }
});

// Helper function to repair voucher table structure
async function repairVoucherTableStructure() {
  console.log("Voucher table structure repair disabled");
  return true;
}

// Helper function to check and create cart tables
async function checkAndCreateCartTables() {
  console.log("Checking cart tables structure...");
  try {
    const pool = await getPool();
    // Check if orders table exists
    const orderTableCheck = await pool.request().query(`
      SELECT OBJECT_ID('orders') as table_id
    `);
    
    if (!orderTableCheck.recordset[0].table_id) {
      console.log("Creating orders table...");
      await pool.request().query(`
        CREATE TABLE orders (
          order_id INT PRIMARY KEY IDENTITY(1,1),
          user_id INT NOT NULL,
          total_price DECIMAL(10,2) NOT NULL,
          total DECIMAL(10,2),
          order_date DATETIME DEFAULT CURRENT_TIMESTAMP,
          order_status VARCHAR(50) NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
      `);
    }
    
    // Check if order_items table exists
    const orderItemsTableCheck = await pool.request().query(`
      SELECT OBJECT_ID('order_items') as table_id
    `);
    
    if (!orderItemsTableCheck.recordset[0].table_id) {
      console.log("Creating order_items table...");
      await pool.request().query(`
        CREATE TABLE order_items (
          order_item_id INT PRIMARY KEY IDENTITY(1,1),
          order_id INT NOT NULL,
          product_id INT NOT NULL,
          quantity INT NOT NULL,
          subtotal DECIMAL(10,2) NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(order_id),
          FOREIGN KEY (product_id) REFERENCES products(product_id)
        )
      `);
    }
    
    console.log("Cart tables structure check completed");
    return true;
  } catch (error) {
    console.error("Error checking cart tables:", error);
    return false;
  }
}

// Helper function to check and create inventory table
async function checkAndCreateInventoryTable() {
  console.log("Checking inventory table structure...");
  try {
    const pool = await getPool();
    // Check if inventory table exists
    const inventoryTableCheck = await pool.request().query(`
      SELECT OBJECT_ID('inventory') as table_id
    `);
    
    if (!inventoryTableCheck.recordset[0].table_id) {
      console.log("Creating inventory table...");
      await pool.request().query(`
        CREATE TABLE inventory (
          inventory_id INT PRIMARY KEY IDENTITY(1,1),
          product_id INT NOT NULL,
          stock_added INT NOT NULL,
          stock_removed INT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (product_id) REFERENCES products(product_id)
        )
      `);
    }
    
    console.log("Inventory table structure check completed");
    return true;
  } catch (error) {
    console.error("Error checking inventory table:", error);
    return false;
  }
}

// Endpoint to apply a voucher discount to the cart calculation
app.post("/apply-voucher", async (req, res) => {
  const { userId, voucherId, cartItems } = req.body;
  
  console.log(`[VOUCHER APPLY] Applying voucher ${voucherId} for user ${userId}`);

  try {
    // Validate required data
    if (!userId || !voucherId || !cartItems || !Array.isArray(cartItems)) {
      console.log("[VOUCHER APPLY] Missing required data");
      return res.status(400).json({ 
        success: false, 
        error: "Missing required data" 
      });
    }

    const pool = await getPool();
    
    // Get voucher details
    console.log(`[VOUCHER APPLY] Fetching voucher details for ID ${voucherId}`);
    const voucherResult = await pool.request()
      .input("voucherId", sql.Int, voucherId)
      .query(`
        SELECT 
          v.voucher_id, 
          v.code, 
          v.discount_amount,
          v.min_order_value,
          uv.user_voucher_id
        FROM vouchers v
        LEFT JOIN user_vouchers uv ON v.voucher_id = uv.voucher_id AND uv.user_id = @userId
        WHERE v.voucher_id = @voucherId
          AND (v.status = 'active' OR v.status IS NULL)
          AND (v.expiry_date IS NULL OR v.expiry_date > GETDATE())
      `);
      
    if (voucherResult.recordset.length === 0) {
      console.log(`[VOUCHER APPLY] Voucher ${voucherId} not found or not active`);
      return res.status(404).json({ 
        success: false, 
        error: "Voucher not found or expired" 
      });
    }
    
    const voucher = voucherResult.recordset[0];
    console.log(`[VOUCHER APPLY] Voucher details:`, voucher);
    
    // Calculate cart subtotal
    const subtotal = cartItems.reduce((sum, item) => {
      const itemPrice = item.discount_price || item.price;
      return sum + (parseFloat(itemPrice) * item.quantity);
    }, 0);
    
    console.log(`[VOUCHER APPLY] Cart subtotal: ${subtotal}`);
    
    // Check if the minimum order value is met
    if (subtotal < voucher.min_order_value) {
      console.log(`[VOUCHER APPLY] Minimum order value not met. Required: ${voucher.min_order_value}, Current: ${subtotal}`);
      return res.status(400).json({
        success: false,
        error: `Minimum order value of ${voucher.min_order_value} not met`
      });
    }
    
    // Calculate discount
    // Is it a percentage or fixed amount?
    const isPercentage = voucher.discount_amount <= 100;
    let discountAmount;
    
    if (isPercentage) {
      // Percentage discount
      discountAmount = (subtotal * voucher.discount_amount) / 100;
      // Apply maximum discount if specified (default 1000)
      const maxDiscount = 1000; // This could be fetched from voucher as well
      if (discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else {
      // Fixed amount discount
      discountAmount = voucher.discount_amount;
    }
    
    // Ensure discount doesn't exceed cart total
    if (discountAmount > subtotal) {
      discountAmount = subtotal;
    }
    
    console.log(`[VOUCHER APPLY] Calculated discount: ${discountAmount}`);
    
    // Calculate final amount
    const finalAmount = subtotal - discountAmount;
    
    // Return details
    res.json({
      success: true,
      voucherId: voucher.voucher_id,
      voucherCode: voucher.code,
      userVoucherId: voucher.user_voucher_id,
      originalAmount: subtotal,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      isPercentage: isPercentage,
      discountValue: voucher.discount_amount
    });
    
  } catch (err) {
    console.error("[VOUCHER APPLY] Error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Failed to apply voucher" 
    });
  }
});

// Helper function to check and create order_vouchers table
async function checkAndCreateOrderVouchersTable() {
  console.log("Checking order_vouchers table structure...");
  try {
    const pool = await getPool();
    // Check if order_vouchers table exists
    const tableCheck = await pool.request().query(`
      SELECT OBJECT_ID('order_vouchers') as table_id
    `);
    
    if (!tableCheck.recordset[0].table_id) {
      console.log("Creating order_vouchers table...");
      await pool.request().query(`
        CREATE TABLE order_vouchers (
          id INT PRIMARY KEY IDENTITY(1,1),
          order_id INT NOT NULL,
          voucher_id INT NOT NULL,
          applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (order_id) REFERENCES orders(order_id),
          FOREIGN KEY (voucher_id) REFERENCES vouchers(voucher_id),
          CONSTRAINT UQ_order_voucher UNIQUE (order_id, voucher_id)
        )
      `);
      console.log("order_vouchers table created successfully");
    } else {
      console.log("order_vouchers table already exists");
    }
    
    return true;
  } catch (error) {
    console.error("Error checking order_vouchers table:", error);
    return false;
  }
}

// ==================== ADMIN ENDPOINTS ====================

// Get all reviews for admin
app.get("/reviews", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT r.*, u.name as user_name, p.product_name
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.user_id
      LEFT JOIN products p ON r.product_id = p.product_id
      ORDER BY r.created_at DESC
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});

// Get inventory logs for admin
app.get("/inventory", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT i.*, p.product_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.product_id
      ORDER BY i.updated_at DESC
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching inventory:", err);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

// Get all vouchers for admin
app.get("/admin/vouchers", async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(`
      SELECT 
        v.voucher_id,
        v.admin_id,
        v.code,
        v.discount_amount,
        v.min_order_value,
        v.expiry_date,
        v.usage_limit,
        v.status,
        v.created_at,
        COUNT(uv.user_voucher_id) as times_used
      FROM vouchers v
      LEFT JOIN user_vouchers uv ON v.voucher_id = uv.voucher_id
      GROUP BY v.voucher_id, v.admin_id, v.code, v.discount_amount, v.min_order_value, 
               v.expiry_date, v.usage_limit, v.status, v.created_at
      ORDER BY v.created_at DESC
    `);
    
    res.json(result.recordset);
  } catch (err) {
    console.error("Error fetching vouchers:", err);
    res.status(500).json({ error: "Failed to fetch vouchers" });
  }
});

// Add new voucher
app.post("/admin/vouchers", async (req, res) => {
  try {
    const { code, discount_amount, min_order_value, expiry_date, usage_limit } = req.body;
    
    const pool = await getPool();
    const result = await pool.request()
      .input("code", sql.NVarChar, code)
      .input("discount_amount", sql.Decimal(10,2), discount_amount)
      .input("min_order_value", sql.Decimal(10,2), min_order_value)
      .input("expiry_date", sql.DateTime, expiry_date)
      .input("usage_limit", sql.Int, usage_limit)
      .query(`
        INSERT INTO vouchers (code, discount_amount, min_order_value, expiry_date, usage_limit, status)
        VALUES (@code, @discount_amount, @min_order_value, @expiry_date, @usage_limit, 'active')
      `);
    
    res.json({ success: true, message: "Voucher added successfully" });
  } catch (err) {
    console.error("Error adding voucher:", err);
    res.status(500).json({ success: false, error: "Failed to add voucher" });
  }
});

// Delete voucher
app.delete("/admin/vouchers/:voucherId", async (req, res) => {
  try {
    const { voucherId } = req.params;
    
    const pool = await getPool();
    const result = await pool.request()
      .input("voucherId", sql.Int, voucherId)
      .query(`
        DELETE FROM vouchers WHERE voucher_id = @voucherId
      `);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: "Voucher deleted successfully" });
    } else {
      res.status(404).json({ success: false, error: "Voucher not found" });
    }
  } catch (err) {
    console.error("Error deleting voucher:", err);
    res.status(500).json({ success: false, error: "Failed to delete voucher" });
  }
});

// Add new product
app.post("/products/add", async (req, res) => {
  try {
    const { 
      product_name, description, price, discount_price, stock_quantity, 
      category, product_link, rating, discount_start, discount_end 
    } = req.body;
    
    const pool = await getPool();
    
    // Start a transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();
    
    try {
      // First, get or create category
      let categoryId = null;
      if (category) {
        const categoryResult = await transaction.request()
          .input("categoryName", sql.NVarChar, category)
          .query(`
            SELECT category_id FROM product_categories WHERE category_name = @categoryName
          `);
        
        if (categoryResult.recordset.length > 0) {
          categoryId = categoryResult.recordset[0].category_id;
        } else {
          // Create new category
          const newCategoryResult = await transaction.request()
            .input("categoryName", sql.NVarChar, category)
            .query(`
              INSERT INTO product_categories (category_name)
              OUTPUT INSERTED.category_id
              VALUES (@categoryName)
            `);
          categoryId = newCategoryResult.recordset[0].category_id;
        }
      }
      
      // Insert product
      const productResult = await transaction.request()
        .input("product_name", sql.NVarChar, product_name)
        .input("description", sql.NText, description)
        .input("price", sql.Decimal(10,2), price)
        .input("stock_quantity", sql.Int, stock_quantity)
        .input("category_id", sql.Int, categoryId)
        .input("product_link", sql.NVarChar, product_link)
        .query(`
          INSERT INTO products (product_name, description, price, stock_quantity, category_id, product_link)
          OUTPUT INSERTED.product_id
          VALUES (@product_name, @description, @price, @stock_quantity, @category_id, @product_link)
        `);
      
      const productId = productResult.recordset[0].product_id;
      
      // Create product_stats entry
      await transaction.request()
        .input("product_id", sql.Int, productId)
        .input("rating", sql.Decimal(3,2), rating || 0)
        .query(`
          INSERT INTO product_stats (product_id, pieces_sold, rating)
          VALUES (@product_id, '0', @rating)
        `);
      
      // Add discount if provided
      if (discount_price && discount_start && discount_end) {
        await transaction.request()
          .input("product_id", sql.Int, productId)
          .input("discount_price", sql.Decimal(10,2), discount_price)
          .input("discount_start", sql.DateTime, discount_start)
          .input("discount_end", sql.DateTime, discount_end)
          .query(`
            INSERT INTO product_discounts (product_id, discount_price, discount_start, discount_end)
            VALUES (@product_id, @discount_price, @discount_start, @discount_end)
          `);
      }
      
      await transaction.commit();
      res.json({ success: true, message: "Product added successfully", product_id: productId });
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  } catch (err) {
    console.error("Error adding product:", err);
    res.status(500).json({ success: false, error: "Failed to add product" });
  }
});

// Add stock to product
app.post("/products/add-stock", async (req, res) => {
  try {
    const { product_id, stock_quantity } = req.body;
    
    const pool = await getPool();
    
    // Update product stock
    await pool.request()
      .input("product_id", sql.Int, product_id)
      .input("stock_quantity", sql.Int, stock_quantity)
      .query(`
        UPDATE products 
        SET stock_quantity = stock_quantity + @stock_quantity 
        WHERE product_id = @product_id
      `);
    
    // Add inventory log
    await pool.request()
      .input("product_id", sql.Int, product_id)
      .input("stock_added", sql.Int, stock_quantity)
      .input("stock_removed", sql.Int, 0)
      .query(`
        INSERT INTO inventory (product_id, stock_added, stock_removed)
        VALUES (@product_id, @stock_added, @stock_removed)
      `);
    
    res.json({ success: true, message: "Stock added successfully" });
  } catch (err) {
    console.error("Error adding stock:", err);
    res.status(500).json({ success: false, error: "Failed to add stock" });
  }
});

// Delete product
app.delete("/products/delete/:productId", async (req, res) => {
  try {
    const { productId } = req.params;
    
    const pool = await getPool();
    const result = await pool.request()
      .input("productId", sql.Int, productId)
      .query(`
        DELETE FROM products WHERE product_id = @productId
      `);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: "Product deleted successfully" });
    } else {
      res.status(404).json({ success: false, error: "Product not found" });
    }
  } catch (err) {
    console.error("Error deleting product:", err);
    res.status(500).json({ success: false, error: "Failed to delete product" });
  }
});

// Update order status
app.put("/orders/:orderId/status", async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    
    const pool = await getPool();
    const result = await pool.request()
      .input("orderId", sql.Int, orderId)
      .input("status", sql.NVarChar, status)
      .query(`
        UPDATE orders 
        SET order_status = @status 
        WHERE order_id = @orderId
      `);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: "Order status updated successfully" });
    } else {
      res.status(404).json({ success: false, error: "Order not found" });
    }
  } catch (err) {
    console.error("Error updating order status:", err);
    res.status(500).json({ success: false, error: "Failed to update order status" });
  }
});

// Cancel order
app.put("/orders/:orderId/cancel", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const pool = await getPool();
    const result = await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        UPDATE orders 
        SET order_status = 'Cancelled' 
        WHERE order_id = @orderId
      `);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: "Order cancelled successfully" });
    } else {
      res.status(404).json({ success: false, error: "Order not found" });
    }
  } catch (err) {
    console.error("Error cancelling order:", err);
    res.status(500).json({ success: false, error: "Failed to cancel order" });
  }
});

// Delete order
app.delete("/orders/delete/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const pool = await getPool();
    
    // Delete order items first
    await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        DELETE FROM order_items WHERE order_id = @orderId
      `);
    
    // Delete order
    const result = await pool.request()
      .input("orderId", sql.Int, orderId)
      .query(`
        DELETE FROM orders WHERE order_id = @orderId
      `);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: "Order deleted successfully" });
    } else {
      res.status(404).json({ success: false, error: "Order not found" });
    }
  } catch (err) {
    console.error("Error deleting order:", err);
    res.status(500).json({ success: false, error: "Failed to delete order" });
  }
});

// Delete user
app.delete("/users/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query(`
        DELETE FROM users WHERE user_id = @id
      `);
    
    if (result.rowsAffected[0] > 0) {
      res.json({ success: true, message: "User deleted successfully" });
    } else {
      res.status(404).json({ success: false, error: "User not found" });
    }
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

// Change admin password
app.post("/admin/change-password", async (req, res) => {
  try {
    const { adminId, currentPassword, newPassword } = req.body;
    
    const pool = await getPool();
    
    // Verify current password
    const verifyResult = await pool.request()
      .input("adminId", sql.Int, adminId)
      .input("currentPassword", sql.NVarChar, currentPassword)
      .query(`
        SELECT admin_id FROM admins WHERE admin_id = @adminId AND password = @currentPassword
      `);
    
    if (verifyResult.recordset.length === 0) {
      return res.status(401).json({ success: false, error: "Current password is incorrect" });
    }
    
    // Update password
    await pool.request()
      .input("adminId", sql.Int, adminId)
      .input("newPassword", sql.NVarChar, newPassword)
      .query(`
        UPDATE admins SET password = @newPassword WHERE admin_id = @adminId
      `);
    
    res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Error changing admin password:", err);
    res.status(500).json({ success: false, error: "Failed to change password" });
  }
});