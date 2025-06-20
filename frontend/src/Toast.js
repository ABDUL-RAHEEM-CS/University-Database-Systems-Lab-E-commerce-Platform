import React, { useState, useEffect } from 'react';
import './Toast.css';

// Create a global toast state manager
let toastQueue = [];
let showToastFunction = null;

// Function to show toast from anywhere in the app
export const showToast = (message, type = 'success', duration = 3000) => {
  if (showToastFunction) {
    showToastFunction(message, type, duration);
  } else {
    // Queue the toast if component not mounted yet
    toastQueue.push({ message, type, duration });
  }
};

function Toast() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Set the global function when component mounts
    showToastFunction = (message, type, duration) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type, duration }]);
      
      // Auto-remove after duration
      setTimeout(() => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
      }, duration);
    };

    // Process any queued toasts
    if (toastQueue.length > 0) {
      toastQueue.forEach(toast => {
        showToastFunction(toast.message, toast.type, toast.duration);
      });
      toastQueue = [];
    }

    // Cleanup function
    return () => {
      showToastFunction = null;
    };
  }, []);

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div 
          key={toast.id} 
          className={`toast toast-${toast.type}`}
        >
          <div className="toast-content">
            {toast.type === 'success' && <span className="toast-icon">✓</span>}
            {toast.type === 'error' && <span className="toast-icon">✕</span>}
            {toast.type === 'info' && <span className="toast-icon">ℹ</span>}
            {toast.type === 'warning' && <span className="toast-icon">⚠</span>}
            <p>{toast.message}</p>
          </div>
          <button 
            className="toast-close"
            onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export default Toast; 