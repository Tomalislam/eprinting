import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const phoneInput = document.getElementById('phoneInput');
const trackBtn = document.getElementById('trackBtn');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const ordersContainer = document.getElementById('ordersContainer');

const statusClasses = {
    'Order Confirmed': 'status-confirmed',
    'Printing Your Order': 'status-printing',
    'Your Order Has Been Printed': 'status-printed',
    'Ready for Shipping': 'status-shipping',
    'Shipped': 'status-shipped',
    'Delivered': 'status-delivered'
};

const formatPhoneNumber = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(880|0)?(1[3-9]\d{8})$/);
    return match ? `+880${match[2]}` : phone;
};

const showLoading = (show) => {
    loading.classList.toggle('hidden', !show);
    trackBtn.disabled = show;
};

const showError = (message) => {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
    ordersContainer.innerHTML = '';
};

const createOrderCard = (order) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
        <div class="order-status ${statusClasses[order.status] || ''}">${order.status}</div>
        <div class="detail-item">
            <span class="detail-label">Order ID:</span>
            <span class="detail-value">${order.order_id}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Customer Name:</span>
            <span class="detail-value">${order.name}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Delivery Address:</span>
            <span class="detail-value">${order.address}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Documents:</span>
            <span class="detail-value">
                <a href="${order.drive_link}" target="_blank" class="drive-link">
                    <i class="fas fa-external-link-alt"></i> View Files
                </a>
            </span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Delivery Method:</span>
            <span class="detail-value">${order.delivery_system}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Total Price:</span>
            <span class="detail-value">৳${order.total_price + order.delivery_charge}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">Last Updated:</span>
            <span class="detail-value">${new Date(order.created_at).toLocaleDateString()}</span>
        </div>
    `;
    return card;
};

trackBtn.addEventListener('click', async () => {
    try {
        showLoading(true);
        errorMessage.classList.add('hidden');
        
        const rawPhone = phoneInput.value.trim();
        if (!rawPhone) {
            showError('Please enter a valid phone number');
            return;
        }

        const formattedPhone = formatPhoneNumber(rawPhone);
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, where("phone", "==", formattedPhone));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showError('No orders found with this phone number');
            return;
        }

        ordersContainer.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const orderData = doc.data();
            ordersContainer.appendChild(createOrderCard(orderData));
        });
    } catch (error) {
        console.error('Tracking error:', error);
        showError('Error fetching orders. Please try again later.');
    } finally {
        showLoading(false);
    }
});

// Input validation
phoneInput.addEventListener('input', (e) => {
    const phone = e.target.value.replace(/\D/g, '');
    let formatted = phone;
    
    if (phone.startsWith('880')) {
        formatted = phone.slice(3);
    } else if (phone.startsWith('0')) {
        formatted = phone.slice(1);
    }
    
    e.target.value = formatted.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2$3');
});
