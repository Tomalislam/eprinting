import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
});

function initializeEventListeners() {
    document.getElementById('trackBtn').addEventListener('click', trackOrder);
    document.getElementById('searchType').addEventListener('change', handleSearchType);
}

async function trackOrder() {
    const searchType = document.getElementById('searchType').value;
    const searchValue = document.getElementById('searchInput').value.trim();
    
    try {
        const orders = await fetchOrders(searchType, searchValue);
        displayOrders(orders);
    } catch (error) {
        showError("No orders found");
    }
}

async function fetchOrders(type, value) {
    const validValue = type === 'phone' 
        ? validatePhone(value) 
        : validateOrderID(value);

    if (!validValue) throw new Error("Invalid input");

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where(type === 'phone' ? 'phone' : 'order_id', '==', validValue));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) throw new Error("No orders found");
    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

function displayOrders(orders) {
    const container = document.getElementById('ordersContainer');
    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div class="order-id">${order.order_id}</div>
                <div class="order-status ${getStatusClass(order.status)}">${order.status}</div>
            </div>
            <div class="order-details">
                <div class="detail-row">
                    <span>Customer:</span>
                    <span>${order.name}</span>
                </div>
                <div class="detail-row">
                    <span>Phone:</span>
                    <span>${formatPhone(order.phone)}</span>
                </div>
                <div class="detail-row">
                    <span>Documents:</span>
                    <a href="${order.drive_link}" target="_blank">View Files</a>
                </div>
                <div class="detail-row">
                    <span>Total:</span>
                    <span>৳${order.total_price + order.delivery_charge}</span>
                </div>
                ${order.due_amount > 0 ? `
                    <div class="detail-row warning">
                        <span>Due Amount:</span>
                        <span>৳${order.due_amount}</span>
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// Helper Functions
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 11 && cleaned.startsWith('01') ? cleaned : null;
}

function validateOrderID(orderId) {
    return /^ORD\d+$/i.test(orderId) ? orderId.toUpperCase() : null;
}

function formatPhone(phone) {
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
}

function getStatusClass(status) {
    const statusMap = {
        'Order Confirmed': 'status-confirmed',
        'Printing Your Order': 'status-printing',
        'Printed - Awaiting Payment': 'status-printed',
        'Your Order Has Been Printed': 'status-printed',
        'Ready for Shipping': 'status-shipping',
        'Shipped': 'status-shipped',
        'Delivered': 'status-delivered'
    };
    return statusMap[status] || '';
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 3000);
}

function handleSearchType() {
    const searchType = document.getElementById('searchType').value;
    const placeholder = searchType === 'phone' 
        ? '01XXXXXXXXX' 
        : 'ORDXXXXXXX';
    document.getElementById('searchInput').placeholder = placeholder;
}
