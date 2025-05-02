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

// Phone number formatting function
const formatPhoneInput = (value) => {
    let numbers = value.replace(/\D/g, '').substring(0, 11);
    if (numbers.startsWith('01') && numbers.length > 5) {
        return `${numbers.substring(0, 5)}-${numbers.substring(5)}`;
    }
    return numbers;
};

// Phone number validation
const validatePhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11 && cleaned.startsWith('01');
};

// Order ID validation
const validateOrderId = (orderId) => {
    return /^ORD\d+$/i.test(orderId);
};

// Loading state management
const showLoading = (isLoading) => {
    loading.classList.toggle('hidden', !isLoading);
    trackBtn.disabled = isLoading;
};

// Error message handling
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
            <span class="detail-label">Phone:</span>
            <span class="detail-value">${orderData.phone.replace(/(\d{5})(\d{6})/, '$1-$2')}</span>
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
            <span class="detail-label">Last Updated:</span>
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

// Search type change handler
searchType.addEventListener('change', () => {
    searchInput.value = '';
    if (searchType.value === 'phone') {
        searchInput.placeholder = '01969312826';
        searchInput.maxLength = 11;
    } else {
        searchInput.placeholder = 'ORD123456';
        searchInput.maxLength = 20;
    }
});

// Phone number input formatting
searchInput.addEventListener('input', function(e) {
    if (searchType.value === 'phone') {
        e.target.value = formatPhoneInput(e.target.value);
    }
});

// Main tracking function
trackBtn.addEventListener('click', async () => {
    try {
        showLoading(true);
        errorMessage.classList.add('hidden');
        
        const searchValue = searchInput.value.trim();
        const currentSearchType = searchType.value;

        if (!searchValue) {
            showError('Please enter a search value');
            return;
        }

        let field, value;
        if (currentSearchType === 'phone') {
            const cleanedPhone = searchValue.replace(/\D/g, '');
            if (!validatePhoneNumber(cleanedPhone)) {
                showError('Invalid phone number (must be 11 digits starting with 01)');
                return;
            }
            field = 'phone';
            value = cleanedPhone;
        } else {
            if (!validateOrderId(searchValue)) {
                showError('Invalid Order ID (must start with ORD)');
                return;
            }
            field = 'order_id';
            value = searchValue.toUpperCase();
        }

        const ordersRef = collection(db, 'orders');
        const q = query(ordersRef, where(field, '==', value));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showError('No orders found');
            return;
        }

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
