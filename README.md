# E-Commerce Application

A full-stack e-commerce application built with React.js and Node.js, featuring a normalized SQL Server database for efficient data management.

## 🚀 Features

- **User Authentication** - Login/signup with secure session management
- **Product Catalog** - Browse, search, and filter products
- **Shopping Cart** - Real-time cart updates with normalized database structure
- **Voucher System** - Apply discounts to entire cart or specific items
- **Order Management** - Complete checkout process and order history
- **Wishlist** - Save products for later
- **Admin Panel** - Manage products, orders, and users
- **Responsive Design** - Works on desktop and mobile devices

## 🛠️ Tech Stack

- **Frontend**: React.js 19.0.0, React Router, CSS3
- **Backend**: Node.js, Express.js, SQL Server
- **Database**: Microsoft SQL Server with normalized schema
- **Authentication**: Session-based authentication

## 📦 Installation

### Prerequisites
- Node.js (v14 or later)
- Microsoft SQL Server
- npm or yarn

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd project
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Database Setup**
   ```bash
   cd backend
   # Initialize database tables
   node db/init-db.js
   ```

4. **Start the application**
   ```bash
   # Start backend server (from backend directory)
   node server.js
   
   # Start frontend (from frontend directory)
   npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 📁 Project Structure

```
project/
├── backend/           # Node.js API server
│   ├── config/       # Database configuration
│   ├── db/           # Database scripts
│   └── server.js     # Main server file
├── frontend/         # React.js application
│   ├── src/          # Source code
│   ├── public/       # Static assets
│   └── package.json
└── README.md
```

## 🗄️ Database Schema

The application uses a normalized database schema with the following key tables:

- **users** - User accounts and authentication
- **products** - Product catalog
- **carts** - Shopping cart metadata
- **cart_items** - Individual cart items
- **orders** - Order information
- **order_items** - Order line items
- **vouchers** - Discount vouchers
- **wishlist** - User wishlists
- **reviews** - Product reviews

## 🔧 Configuration

Database connection settings can be configured via environment variables:

```bash
DB_USER=your_username
DB_PASSWORD=your_password
DB_SERVER=your_server
DB_NAME=project
DB_PORT=1433
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE). 