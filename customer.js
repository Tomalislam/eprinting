import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
const trackBtn = document.getElementById('trackBtn');
const searchInput = document.getElementById('searchInput');
const searchType = document.getElementById('searchType');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const ordersContainer = document.getElementById('ordersContainer');

// Status styling configuration
const statusClasses = {
    'Order Confirmed': 'status-confirmed',
    'Printing Your Order': 'status-printing',
    'Your Order Has Been Printed': 'status-printed',
    'Ready for Shipping': 'status-shipping',
    'Shipped': 'status-shipped',
    'Delivered': 'status-delivered'
};

// Format phone number input
const formatPhoneInput = (value) => {
    let numbers = value.replace(/\D/g, '');
    numbers = numbers.substring(0, 11);
    
    if (numbers.startsWith('01')) {
        if (numbers.length > 5) {
            numbers = `${numbers.substring(0, 5)}-${numbers.substring(5)}`;
        }
        return numbers.substring(0, 11);
    }
    return numbers;
};

// Validate Bangladeshi phone number
const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return /^01\d{9}$/.test(cleaned);
};

// Validate Order ID format
const validateOrderId = (orderId) => {
    return /^ORD\d+$/i.test(orderId);
};

// Show/hide loading state
const showLoading = (isLoading) => {
    loading.classList.toggle('hidden', !isLoading);
    trackBtn.disabled = isLoading;
};

// Show error messages
const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    ordersContainer.innerHTML = '';
};

// Create order card element
const createOrderCard = (orderData) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
        <div class="order-status ${statusClasses[orderData.status] || ''}">
            ${orderData.status}
        </div>
        <div class="detail-item">
            <span class="detail-label">Order ID:</span>
            <span class="detail-value">${orderData.order_id}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Customer Name:</span>
            <span class="detail-value">${orderData.name}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Phone Number:</span>
            <span class="detail-value">${orderData.phone}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Documents:</span>
            <span class="detail-value">
                <a href="${orderData.drive_link}" target="_blank" class="drive-link">
                    <i class="fas fa-external-link-alt"></i> View Files
                </a>
            </span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Total Price:</span>
            <span class="detail-value">৳${orderData.total_price + orderData.delivery_charge}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Status Updated:</span>
            <span class="detail-value">
                ${new Date(orderData.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                })}
            </span>
        </div>
    `;
    return card;
};

// Handle search type changes
searchType.addEventListener('change', () => {
    searchInput.value = '';
    searchInput.placeholder = searchType.value === 'phone' 
        ? '01XXXXXXXXX' 
        : 'ORDXXXXXXX';
        
    if (searchType.value === 'phone') {
        searchInput.type = 'tel';
        searchInput.pattern = '01\\d{9}';
    } else {
        searchInput.type = 'text';
        searchInput.pattern = 'ORD\\d+';
    }
});

// Handle phone number input formatting
searchInput.addEventListener('input', () => {
    if (searchType.value === 'phone') {
        searchInput.value = formatPhoneInput(searchInput.value);
    }
});

// Main tracking function
trackBtn.addEventListener('click', async () => {
    try {
        showLoading(true);
        errorMessage.classList.add('hidden');
        
        const searchValue = searchInput.value.trim();
        const currentSearchType = searchType.value;

        // Validate input
        if (!searchValue) {
            showError('Please enter a search value');
            return;
        }

        // Build Firestore query
        let field, value;
        if (currentSearchType === 'phone') {
            if (!validatePhoneNumber(searchValue)) {
                showError('Invalid phone number format (01XXXXXXXXX)');
                return;
            }
            field = 'phone';
            value = searchValue.replace(/\D/g, '');
        } else {
            if (!validateOrderId(searchValue)) {
                showError('Invalid Order ID (must start with ORD)');
                return;
            }
            field = 'order_id';
            value = searchValue.toUpperCase();
        }

        // Execute query
        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where(field, '==', value));
        const querySnapshot = await getDocs(q);

        // Handle results
        if (querySnapshot.empty) {
            showError('No orders found');
            return;
        }

        // Display results
        ordersContainer.innerHTML = '';
        querySnapshot.forEach(doc => {
            const orderData = doc.data();
            ordersContainer.appendChild(createOrderCard(orderData));
        });

    } catch (error) {
        console.error('Tracking error:', error);
        showError('Error fetching orders. Please try again.');
    } finally {
        showLoading(false);
    }
});
