import React, { useState, useCallback, useMemo } from 'react';
import './PaymentOptions.css';

const PaymentOptions = ({ selectedPaymentMethod, onSelectPaymentMethod }) => {
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    nameOnCard: ''
  });
  
  const [errors, setErrors] = useState({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    
    // Reset validation state if user makes changes after validation
    if (isValidated) {
      setIsValidated(false);
    }
    
    // Format card number with spaces every 4 digits
    if (name === 'cardNumber') {
      const cleaned = value.replace(/\s/g, '');
      if (cleaned.length <= 16 && /^\d*$/.test(cleaned)) {
        // Format with spaces after every 4 digits
        const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
        setCardDetails(prev => ({
          ...prev,
          [name]: formatted
        }));
      }
    } else if (name === 'expiryDate') {
      // Format expiry date as MM/YY
      const cleaned = value.replace(/\D/g, '');
      
      if (cleaned.length <= 4) {
        let formatted = cleaned;
        let tempError = null;
        
        // Handle first digit of month (can only be 0 or 1)
        if (cleaned.length === 1 && parseInt(cleaned) > 1) {
          formatted = '0' + cleaned;
        }
        
        // Handle second digit of month (if first digit is 1, second can only be 0-2)
        if (cleaned.length === 2) {
          const month = parseInt(cleaned);
          if (month > 12) {
            formatted = '12';
            tempError = 'Month cannot be greater than 12';
          } else if (month === 0) {
            formatted = '01';
            tempError = 'Month cannot be 00';
          }
        }
        
        // Add slash after month
        if (cleaned.length > 2) {
          formatted = formatted.slice(0, 2) + '/' + formatted.slice(2);
        }
        
        // Update card details
        setCardDetails(prev => ({
          ...prev,
          [name]: formatted
        }));
        
        // Show immediate error feedback for month
        if (tempError) {
          setErrors(prev => ({
            ...prev,
            [name]: tempError
          }));
        } else if (errors[name] && errors[name].includes('Month')) {
          // Clear month-specific errors when corrected
          setErrors(prev => ({
            ...prev,
            [name]: ''
          }));
        }
        
        // Validate the year if 4 digits have been entered
        if (cleaned.length === 4) {
          const month = parseInt(formatted.slice(0, 2));
          const year = parseInt(formatted.slice(3));
          const fullYear = 2000 + year;
          const today = new Date();
          const currentYear = today.getFullYear();
          const currentMonth = today.getMonth() + 1;
          
          if (fullYear < currentYear || (fullYear === currentYear && month < currentMonth)) {
            setErrors(prev => ({
              ...prev,
              [name]: 'Card has expired'
            }));
          } else if (fullYear > currentYear + 10) {
            setErrors(prev => ({
              ...prev,
              [name]: 'Expiry date too far in the future'
            }));
          } else {
            // Clear any previous expiry errors
            setErrors(prev => ({
              ...prev,
              [name]: ''
            }));
          }
        }
      }
    } else {
      setCardDetails(prev => ({
        ...prev,
        [name]: value
      }));
    }
    
    // Clear the error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  }, [isValidated, setIsValidated, errors, setCardDetails, setErrors]);
  
  const validateCardDetails = useCallback(() => {
    const newErrors = {};
    
    // Validate card number (16 digits, spaces allowed)
    const cardNumberClean = cardDetails.cardNumber.replace(/\s/g, '');
    if (!cardNumberClean || cardNumberClean.length !== 16 || !/^\d+$/.test(cardNumberClean)) {
      newErrors.cardNumber = 'Please enter a valid 16-digit card number';
    }
    
    // Validate expiry date (MM/YY format)
    if (!cardDetails.expiryDate || !/^(0[1-9]|1[0-2])\/[0-9]{2}$/.test(cardDetails.expiryDate)) {
      newErrors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
    } else {
      // Extract month and year
      const [month, yearStr] = cardDetails.expiryDate.split('/');
      const monthNum = parseInt(month);
      const yearNum = parseInt(yearStr);
      const fullYear = 2000 + yearNum;
      
      // Get current date for comparison
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1; // JavaScript months are 0-indexed
      
      // Check if month is valid (1-12)
      if (monthNum < 1 || monthNum > 12) {
        newErrors.expiryDate = 'Invalid month, must be between 01-12';
      } 
      // Check if card is expired
      else if (fullYear < currentYear || (fullYear === currentYear && monthNum < currentMonth)) {
        newErrors.expiryDate = 'Card has expired';
      } 
      // Check if expiry date is too far in the future (more than 10 years)
      else if (fullYear > currentYear + 10) {
        newErrors.expiryDate = 'Expiry date too far in the future (max 10 years)';
      }
    }
    
    // Validate CVV (3 or 4 digits)
    if (!cardDetails.cvv || !/^[0-9]{3,4}$/.test(cardDetails.cvv)) {
      newErrors.cvv = 'Please enter a valid CVV (3-4 digits)';
    }
    
    // Validate name on card
    if (!cardDetails.nameOnCard || cardDetails.nameOnCard.trim().length < 3) {
      newErrors.nameOnCard = 'Please enter the name as shown on your card';
    }
    
    setErrors(newErrors);
    setShowValidationSummary(Object.keys(newErrors).length > 0);
    return Object.keys(newErrors).length === 0;
  }, [cardDetails, setErrors, setShowValidationSummary]);
  
  const validateCardForm = useCallback(() => {
    const isValid = validateCardDetails();
    setShowValidationSummary(!isValid);
    setIsValidated(isValid);
    return isValid;
  }, [validateCardDetails, setShowValidationSummary, setIsValidated]);
  
  const handleValidateClick = useCallback((e) => {
    e.preventDefault();
    validateCardForm();
  }, [validateCardForm]);
  
  // This function can be called by the parent component to validate before proceeding
  React.useEffect(() => {
    // Expose validation function to parent component via ref or custom event
    if (selectedPaymentMethod === 'card') {
      window.validateCardPayment = validateCardForm;
    } else {
      window.validateCardPayment = () => true; // Always valid for COD
    }
    
    return () => {
      window.validateCardPayment = undefined;
    };
  }, [selectedPaymentMethod, validateCardForm]);

  // Memoize payment method handlers
  const handleCardSelect = useCallback(() => onSelectPaymentMethod('card'), [onSelectPaymentMethod]);
  const handleCodSelect = useCallback(() => onSelectPaymentMethod('cod'), [onSelectPaymentMethod]);

  // Memoize validation summary display
  const validationSummary = useMemo(() => {
    if (showValidationSummary && Object.keys(errors).length > 0) {
      return (
        <div className="card-validation-summary">
          Please correct the following issues before proceeding:
          <ul>
            {Object.values(errors).map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  }, [showValidationSummary, errors]);

  // Memoize card form component
  const CardForm = useMemo(() => {
    // Calculate max valid year for the tooltip
    const currentYear = new Date().getFullYear();
    const maxYear = (currentYear + 10) % 100; // Get last 2 digits
    const currentYearShort = currentYear % 100; // Get last 2 digits of current year
    
    return (
      <div className="card-details">
        <div className="form-group">
          <label>Card Number</label>
          <input 
            type="text" 
            placeholder="1234 5678 9012 3456" 
            name="cardNumber" 
            value={cardDetails.cardNumber}
            onChange={handleInputChange}
            className={errors.cardNumber ? 'input-error' : ''}
          />
          {errors.cardNumber && <div className="error-message">{errors.cardNumber}</div>}
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label>Expiry Date</label>
            <div className="input-with-hint">
              <input 
                type="text" 
                placeholder="MM/YY" 
                name="expiryDate"
                value={cardDetails.expiryDate}
                onChange={handleInputChange}
                className={errors.expiryDate ? 'input-error' : ''}
              />
              <div className="input-hint">
                Format: MM/YY (Valid: 01-12/{currentYearShort}-{maxYear})
              </div>
            </div>
            {errors.expiryDate && <div className="error-message">{errors.expiryDate}</div>}
          </div>
          
          <div className="form-group">
            <label>CVV</label>
            <input 
              type="text" 
              placeholder="123" 
              name="cvv"
              value={cardDetails.cvv}
              onChange={handleInputChange}
              className={errors.cvv ? 'input-error' : ''}
            />
            {errors.cvv && <div className="error-message">{errors.cvv}</div>}
          </div>
        </div>
        
        <div className="form-group">
          <label>Name on Card</label>
          <input 
            type="text" 
            placeholder="John Doe" 
            name="nameOnCard"
            value={cardDetails.nameOnCard}
            onChange={handleInputChange}
            className={errors.nameOnCard ? 'input-error' : ''}
          />
          {errors.nameOnCard && <div className="error-message">{errors.nameOnCard}</div>}
        </div>
        
        <button 
          className="validate-card-button" 
          onClick={handleValidateClick}
        >
          Validate Card Details
        </button>
        
        {isValidated && (
          <div className="validation-success">
            <span className="success-icon">✓</span> Card details successfully validated
          </div>
        )}
        
        {validationSummary}
      </div>
    );
  }, [
    cardDetails, 
    errors, 
    handleInputChange, 
    handleValidateClick, 
    isValidated, 
    validationSummary
  ]);

  // Memoize COD notice
  const CodNotice = useMemo(() => {
    return (
      <div className="cod-notice">
        <p>You will pay at the time of delivery. Please keep exact change ready.</p>
      </div>
    );
  }, []);

  return (
    <div className="payment-options-container">
      <h3>Payment Method</h3>
      
      <div className="payment-methods">
        <div 
          className={`payment-method ${selectedPaymentMethod === 'card' ? 'selected' : ''}`}
          onClick={handleCardSelect}
        >
          <div className="payment-method-icon">💳</div>
          <div className="payment-method-details">
            <h4>Credit/Debit Card</h4>
            <p>Pay securely with your card</p>
          </div>
          <div className="payment-method-radio">
            <input 
              type="radio" 
              checked={selectedPaymentMethod === 'card'} 
              onChange={handleCardSelect}
              name="payment-method"
            />
          </div>
        </div>
        
        <div 
          className={`payment-method ${selectedPaymentMethod === 'cod' ? 'selected' : ''}`}
          onClick={handleCodSelect}
        >
          <div className="payment-method-icon">💵</div>
          <div className="payment-method-details">
            <h4>Cash on Delivery</h4>
            <p>Pay when you receive your order</p>
          </div>
          <div className="payment-method-radio">
            <input 
              type="radio" 
              checked={selectedPaymentMethod === 'cod'} 
              onChange={handleCodSelect}
              name="payment-method"
            />
          </div>
        </div>
      </div>
      
      {selectedPaymentMethod === 'card' && CardForm}
      {selectedPaymentMethod === 'cod' && CodNotice}
    </div>
  );
};

export default PaymentOptions; 