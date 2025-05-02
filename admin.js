import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const addOrderBtn = document.getElementById('addOrderBtn');
const loginForm = document.getElementById('loginForm');
const adminPanel = document.getElementById('adminPanel');
const orderList = document.getElementById('orderList');
const addNewOrderTab = document.getElementById('addNewOrderTab');
const allOrdersTab = document.getElementById('allOrdersTab');
const dashboardTab = document.getElementById('dashboardTab');
const searchInput = document.getElementById('searchInput');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    auth.onAuthStateChanged(user => {
        if (user) {
            loginForm.classList.add('hidden');
            adminPanel.classList.remove('hidden');
            loadOrders();
            showDashboard();
        }
    });

    // Event Listeners
    if (loginBtn) loginBtn.addEventListener('click', handleLogin);
    if (addOrderBtn) addOrderBtn.addEventListener('click', addOrder);
    if (addNewOrderTab) addNewOrderTab.addEventListener('click', showAddOrder);
    if (allOrdersTab) allOrdersTab.addEventListener('click', showAllOrders);
    if (dashboardTab) dashboardTab.addEventListener('click', showDashboard);
    if (searchInput) searchInput.addEventListener('input', filterOrders);
});

async function handleLogin() {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    if (!email || !password) {
        alert("Please enter email and password!");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        loginForm.classList.add('hidden');
        adminPanel.classList.remove('hidden');
        loadOrders();
        showDashboard();
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
}

async function addOrder() {
    const orderData = {
        name: document.getElementById('name').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        drive_link: document.getElementById('driveLink').value.trim(),
        total_price: parseInt(document.getElementById('totalPrice').value) || 0,
        delivery_system: document.getElementById('deliverySystem').value,
        delivery_charge: parseInt(document.getElementById('deliveryCharge').value) || 0,
        status: document.getElementById('status').value,
        order_id: generateOrderID(),
        created_at: new Date().toISOString()
    };

    // Validation
    if (!orderData.name || !orderData.address || !orderData.phone || !orderData.drive_link) {
        alert("Please fill in all required fields!");
        return;
    }

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("Order added successfully!");
        clearOrderForm();
        loadOrders();
    } catch (error) {
        alert("Failed to add order: " + error.message);
    }
}

function generateOrderID() {
    const timestamp = Date.now().toString().slice(-5);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return `ORD${timestamp}${randomPart}`;
}

function clearOrderForm() {
    document.getElementById('name').value = '';
    document.getElementById('address').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('driveLink').value = '';
    document.getElementById('totalPrice').value = '';
    document.getElementById('deliverySystem').selectedIndex = 0;
    document.getElementById('deliveryCharge').value = '';
    document.getElementById('status').selectedIndex = 0;
}

function showDashboard() {
    document.querySelectorAll('.content-area > div').forEach(div => div.classList.add('hidden'));
    document.getElementById('dashboardSection').classList.remove('hidden');
    updateActiveNav('dashboardTab');
}

function showAddOrder() {
    document.querySelectorAll('.content-area > div').forEach(div => div.classList.add('hidden'));
    document.getElementById('addOrderSection').classList.remove('hidden');
    updateActiveNav('addNewOrderTab');
}

function showAllOrders() {
    document.querySelectorAll('.content-area > div').forEach(div => div.classList.add('hidden'));
    document.getElementById('orderListSection').classList.remove('hidden');
    updateActiveNav('allOrdersTab');
    loadOrders();
}

function updateActiveNav(activeId) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    document.getElementById(activeId).classList.add('active');
}

async function loadOrders() {
    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, orderBy("created_at", "desc"));
        const querySnapshot = await getDocs(q);
        
        window.ordersData = [];
        querySnapshot.forEach((docSnap) => {
            window.ordersData.push({ id: docSnap.id, ...docSnap.data() });
        });

        displayOrders(window.ordersData);
        updateStats();
    } catch (error) {
        console.error("Error loading orders: ", error);
        alert("Failed to load orders: " + error.message);
    }
}

function displayOrders(orders) {
    if (!orderList) return;
    
    orderList.innerHTML = orders.map(order => `
        <div class="order-card" data-id="${order.id}">
            <div class="order-header">
                <div class="order-id">${order.order_id}</div>
                <div class="order-status ${getStatusClass(order.status)}">${order.status}</div>
            </div>
            <div class="order-details">
                <div class="detail-row">
                    <span class="detail-label">Customer:</span>
                    <span class="detail-value editable" data-field="name">${order.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value editable" data-field="phone">${order.phone}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Address:</span>
                    <span class="detail-value editable" data-field="address">${order.address}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Drive Link:</span>
                    <span class="detail-value editable" data-field="drive_link">
                        <a href="${order.drive_link}" target="_blank">View Files</a>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total:</span>
                    <span class="detail-value">৳${order.total_price + order.delivery_charge}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Delivery:</span>
                    <span class="detail-value">${order.delivery_system} (৳${order.delivery_charge})</span>
                </div>
            </div>
            <div class="order-actions">
                <button class="btn btn-outline edit-btn">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-danger delete-btn">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    // Add event listeners to all edit buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const orderCard = this.closest('.order-card');
            enableEditing(orderCard);
        });
    });
}

function getStatusClass(status) {
    switch(status) {
        case 'Order Confirmed': return 'status-confirmed';
        case 'Printing Your Order': return 'status-printing';
        case 'Your Order Has Been Printed': return 'status-printed';
        case 'Ready for Shipping': return 'status-shipping';
        case 'Shipped': return 'status-shipped';
        case 'Delivered': return 'status-delivered';
        default: return '';
    }
}

function enableEditing(orderCard) {
    const orderId = orderCard.dataset.id;
    const editBtn = orderCard.querySelector('.edit-btn');
    
    if (editBtn.innerHTML.includes('Save')) {
        // Already in edit mode, save changes
        saveChanges(orderId, orderCard);
        editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    } else {
        // Enter edit mode
        orderCard.querySelectorAll('.editable').forEach(el => {
            const field = el.dataset.field;
            const value = el.textContent || el.querySelector('a')?.href || '';
            
            if (field === 'drive_link') {
                el.innerHTML = `<input type="text" class="form-control" value="${value}" data-field="${field}">`;
            } else {
                el.innerHTML = `<input type="text" class="form-control" value="${value}" data-field="${field}">`;
            }
        });
        
        editBtn.innerHTML = '<i class="fas fa-save"></i> Save';
    }
}

async function saveChanges(orderId, orderCard) {
    const inputs = orderCard.querySelectorAll('input[data-field]');
    const updatedData = {};

    inputs.forEach(input => {
        updatedData[input.dataset.field] = input.value;
    });

    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, updatedData);
        loadOrders();
    } catch (error) {
        alert("Failed to update order: " + error.message);
    }
}

function filterOrders() {
    const keyword = searchInput.value.toLowerCase();
    const filtered = window.ordersData.filter(order =>
        order.name.toLowerCase().includes(keyword) ||
        order.phone.toLowerCase().includes(keyword) ||
        order.order_id.toLowerCase().includes(keyword)
    );
    displayOrders(filtered);
}

function updateStats() {
    if (!window.ordersData) return;
    
    const totalOrders = window.ordersData.length;
    const pendingOrders = window.ordersData.filter(order => 
        order.status !== 'Delivered'
    ).length;
    const completedOrders = window.ordersData.filter(order => 
        order.status === 'Delivered'
    ).length;
    const revenue = window.ordersData.reduce((sum, order) => 
        sum + order.total_price + order.delivery_charge, 0
    );

    // Update stats cards if they exist
    const totalEl = document.querySelector('.stats-grid .card:nth-child(1) div:nth-child(2)');
    const pendingEl = document.querySelector('.stats-grid .card:nth-child(2) div:nth-child(2)');
    const completedEl = document.querySelector('.stats-grid .card:nth-child(3) div:nth-child(2)');
    const revenueEl = document.querySelector('.stats-grid .card:nth-child(4) div:nth-child(2)');
    
    if (totalEl) totalEl.textContent = totalOrders;
    if (pendingEl) pendingEl.textContent = pendingOrders;
    if (completedEl) completedEl.textContent = completedOrders;
    if (revenueEl) revenueEl.textContent = `৳${revenue}`;
}
