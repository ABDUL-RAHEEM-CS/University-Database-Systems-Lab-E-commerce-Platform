/**
 * Database configuration file
 * 
 * This file centralizes the database connection settings and allows for
 * configuration through environment variables.
 */

// Default configuration for SQL Server
const dbConfig = {
  user: process.env.DB_USER || "tks",
  password: process.env.DB_PASSWORD || "1234",
  server: process.env.DB_SERVER || "DESKTOP-K0P3DIT",
  database: process.env.DB_NAME || "project",
  options: {
    trustServerCertificate: true,
    trustedConnection: false,
    enableArithAbort: true,
    instancename: process.env.DB_INSTANCE || "SQLEXPRESS",
  },
  port: parseInt(process.env.DB_PORT || "1433", 10),
};

// Export the configuration
module.exports = {
  config: dbConfig,
  
  // Helper method to get a formatted connection string for logging (without password)
  getConnectionInfo: () => {
    return `Server: ${dbConfig.server}, Database: ${dbConfig.database}, User: ${dbConfig.user}, Port: ${dbConfig.port}`;
  }
}; 