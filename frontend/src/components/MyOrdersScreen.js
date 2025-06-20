import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showToast } from "../Toast";
import "./MyOrdersScreen.css";          // ← make sure you have this file!

export default function MyOrdersScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  useEffect(() => {
    if (!userId) {
      showToast("Please login to view your orders", "warning");
      navigate("/");
      return;
    }
    
    const fetchOrders = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log(`Fetching orders for user: ${userId}`);
        const res = await fetch(`http://localhost:5000/orders/user/${userId}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          // Add timeout to prevent long hanging requests
          signal: AbortSignal.timeout(5000)
        });
        
        if (!res.ok) {
          // If the response is not OK, check if it's a 404 (not found) or something else
          if (res.status === 404) {
            console.log("No orders found or endpoint not available, using empty array");
            setOrders([]);
          } else {
            throw new Error(`Failed to fetch orders: ${res.status} ${res.statusText}`);
          }
        } else {
          // Parse the response as JSON
          const text = await res.text();
          
          // Check if the response is empty
          if (!text.trim()) {
            console.log("Empty response from orders API");
            setOrders([]);
          } else {
            try {
              const data = JSON.parse(text);
              console.log(`Received ${data.length} orders`);
              
              if (Array.isArray(data)) {
                setOrders(data);
              } else {
                console.error("Orders data is not an array:", typeof data);
                setOrders([]);
              }
            } catch (parseError) {
              console.error("Error parsing orders response as JSON:", parseError);
              setOrders([]);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching orders:", err);
        setError("Failed to load orders. Please try again later.");
        // Don't set orders to empty here to allow retrying
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, [userId, navigate]);

  const handleRetry = () => {
    // Trigger a re-fetch by forcing the useEffect to run again
    setLoading(true);
    setError(null);
    
    // Re-run the effect
    const fetchOrders = async () => {
      try {
        console.log("Retrying order fetch...");
        const res = await fetch(`http://localhost:5000/orders/user/${userId}`);
        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        setOrders(data);
        setError(null);
      } catch (err) {
        console.error("Retry failed:", err);
        setError("Failed to load orders. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  };

  return (
    <div className="my-orders-screen">
      <header className="orders-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1>My Orders</h1>
      </header>

      {loading ? (
        <div className="loading-orders">Loading your orders...</div>
      ) : error ? (
        <div className="error-container">
          <p className="error-message">{error}</p>
          <button className="retry-btn" onClick={handleRetry}>
            Retry
          </button>
        </div>
      ) : orders.length === 0 ? (
        <p className="no-orders">You have not placed any orders yet.</p>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.order_id} className="order-card">
              <div className="order-card-header">
                <h2>Order #{order.order_id}</h2>
                <span className={`status ${order.order_status?.toLowerCase() || 'processing'}`}>
                  {order.order_status || 'Processing'}
                </span>
              </div>
              <p className="order-date">
                {new Date(order.order_date).toLocaleString()}
              </p>
              <div className="order-totals">
                <span>Subtotal: Rs. {(order.total_price || 0).toFixed(2)}</span>
                <span>Final: Rs. {(order.final_total || 0).toFixed(2)}</span>
              </div>
              <ul className="order-items">
                {(order.items || []).map(item => (
                  <li key={item.order_item_id || item.product_id} className="order-item">
                    <img src={item.product_link || 'placeholder.jpg'} alt={item.product_name} />
                    <div>
                      <p className="item-name">{item.product_name}</p>
                      <p className="item-detail">
                        x{item.quantity} — Rs. {(item.subtotal || (item.price * item.quantity) || 0).toFixed(2)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
