import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// DOM Elements
const loginFormElement = document.getElementById('loginFormElement');
const addOrderBtn = document.getElementById('addOrderBtn');
const orderList = document.getElementById('orderList');
const searchInput = document.getElementById('searchInput');
const logoutBtn = document.getElementById('logoutBtn');

// Global Variables
let editMode = false;
let currentEditId = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            loadOrders();
            showDashboard();
        } else {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('adminPanel').classList.add('hidden');
        }
    });

    // Event Listeners
    loginFormElement?.addEventListener('submit', handleLogin);
    addOrderBtn?.addEventListener('click', handleAddOrUpdateOrder);
    logoutBtn?.addEventListener('click', handleLogout);
    document.getElementById('addNewOrderTab')?.addEventListener('click', showAddOrder);
    document.getElementById('allOrdersTab')?.addEventListener('click', showAllOrders);
    document.getElementById('dashboardTab')?.addEventListener('click', showDashboard);
    searchInput?.addEventListener('input', filterOrders);
});

// Authentication Functions
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        alert("Login Failed: " + error.message);
        document.getElementById('adminPassword').value = '';
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        alert("Logout Failed: " + error.message);
    }
}

// Order Management Functions
async function handleAddOrUpdateOrder() {
    if (editMode) {
        await saveChanges();
        return;
    }

    const orderData = {
        name: document.getElementById('name').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        drive_link: document.getElementById('driveLink').value.trim(),
        total_price: Number(document.getElementById('totalPrice').value) || 0,
        delivery_system: document.getElementById('deliverySystem').value,
        delivery_charge: Number(document.getElementById('deliveryCharge').value) || 0,
        status: document.getElementById('status').value,
        order_id: generateOrderID(),
        created_at: new Date().toISOString()
    };

    if (!validateOrder(orderData)) return;

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("Order added successfully!");
        clearOrderForm();
        loadOrders();
    } catch (error) {
        alert("Failed to add order: " + error.message);
    }
}

function validateOrder(order) {
    const requiredFields = ['name', 'address', 'phone', 'drive_link'];
    for (const field of requiredFields) {
        if (!order[field]) {
            alert(`Please fill in the ${field.replace('_', ' ')} field!`);
            return false;
        }
    }
    return true;
}

async function deleteOrder(orderId) {
    if (!confirm("Are you sure you want to delete this order?")) return;
    
    try {
        await deleteDoc(doc(db, "orders", orderId));
        loadOrders();
    } catch (error) {
        alert("Failed to delete order: " + error.message);
    }
}

// Data Loading Functions
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
        alert("Failed to load orders: " + error.message);
    }
}

function displayOrders(orders) {
    orderList.innerHTML = orders.map(order => `
        <div class="order-card" data-id="${order.id}">
            <div class="order-header">
                <div class="order-id">${order.order_id}</div>
                <div class="order-status ${getStatusClass(order.status)}">${order.status}</div>
            </div>
            <div class="order-details">
                ${createEditableField('Name', 'name', order.name, 'text')}
                ${createEditableField('Phone', 'phone', order.phone, 'tel')}
                ${createEditableField('Address', 'address', order.address, 'text')}
                ${createEditableField('Drive Link', 'drive_link', order.drive_link, 'url')}
                ${createEditableField('Total Price', 'total_price', order.total_price, 'number')}
                ${createEditableField('Delivery Charge', 'delivery_charge', order.delivery_charge, 'number')}
                ${createStatusDropdown(order.status)}
                ${createDeliverySystemDropdown(order.delivery_system)}
            </div>
            <div class="order-actions">
                <button class="btn ${editMode ? 'btn-primary' : 'btn-outline'} edit-btn">
                    ${editMode ? '<i class="fas fa-save"></i> Save' : '<i class="fas fa-edit"></i> Edit'}
                </button>
                <button class="btn btn-danger delete-btn">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    // Add Event Listeners
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const orderCard = btn.closest('.order-card');
            if (editMode) {
                await saveOrderChanges(orderCard);
            } else {
                enableEditMode(orderCard);
            }
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const orderId = btn.closest('.order-card').dataset.id;
            deleteOrder(orderId);
        });
    });
}

// Edit/Save Functions
function enableEditMode(orderCard) {
    editMode = true;
    currentEditId = orderCard.dataset.id;
    orderCard.querySelectorAll('input, select').forEach(element => {
        element.disabled = false;
    });
    loadOrders();
}

async function saveOrderChanges(orderCard) {
    const orderId = orderCard.dataset.id;
    const updatedData = {
        name: orderCard.querySelector('[data-field="name"]').value,
        phone: orderCard.querySelector('[data-field="phone"]').value,
        address: orderCard.querySelector('[data-field="address"]').value,
        drive_link: orderCard.querySelector('[data-field="drive_link"]').value,
        total_price: Number(orderCard.querySelector('[data-field="total_price"]').value),
        delivery_charge: Number(orderCard.querySelector('[data-field="delivery_charge"]').value),
        status: orderCard.querySelector('[data-field="status"]').value,
        delivery_system: orderCard.querySelector('[data-field="delivery_system"]').value
    };

    try {
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, updatedData);
        editMode = false;
        currentEditId = null;
        loadOrders();
    } catch (error) {
        alert("Failed to update order: " + error.message);
    }
}

// Helper Functions
function createEditableField(label, field, value, type = 'text') {
    return `
        <div class="detail-row">
            <span class="detail-label">${label}:</span>
            <span class="detail-value">
                <input type="${type}" 
                       class="form-control" 
                       value="${value}" 
                       data-field="${field}"
                       ${!editMode ? 'disabled' : ''}>
            </span>
        </div>
    `;
}

function createStatusDropdown(currentStatus) {
    const options = [
        'Order Confirmed', 'Printing Your Order', 
        'Your Order Has Been Printed', 'Ready for Shipping',
        'Shipped', 'Delivered'
    ];

    return `
        <div class="detail-row">
            <span class="detail-label">Status:</span>
            <span class="detail-value">
                <select class="form-select" 
                        data-field="status" 
                        ${!editMode ? 'disabled' : ''}>
                    ${options.map(option => `
                        <option value="${option}" ${option === currentStatus ? 'selected' : ''}>
                            ${option}
                        </option>
                    `).join('')}
                </select>
            </span>
        </div>
    `;
}

function createDeliverySystemDropdown(currentSystem) {
    return `
        <div class="detail-row">
            <span class="detail-label">Delivery System:</span>
            <span class="detail-value">
                <select class="form-select" 
                        data-field="delivery_system" 
                        ${!editMode ? 'disabled' : ''}>
                    <option value="Sundorbon Delivery" ${currentSystem === 'Sundorbon Delivery' ? 'selected' : ''}>
                        Sundorbon Delivery
                    </option>
                    <option value="Home Delivery" ${currentSystem === 'Home Delivery' ? 'selected' : ''}>
                        Home Delivery
                    </option>
                </select>
            </span>
        </div>
    `;
}

function generateOrderID() {
    return 'ORD' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
}

function clearOrderForm() {
    ['name', 'address', 'phone', 'driveLink', 'totalPrice', 'deliveryCharge'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('deliverySystem').selectedIndex = 0;
    document.getElementById('status').selectedIndex = 0;
}

function getStatusClass(status) {
    const statusMap = {
        'Order Confirmed': 'status-confirmed',
        'Printing Your Order': 'status-printing',
        'Your Order Has Been Printed': 'status-printed',
        'Ready for Shipping': 'status-shipping',
        'Shipped': 'status-shipped',
        'Delivered': 'status-delivered'
    };
    return statusMap[status] || '';
}

// UI Functions
function filterOrders() {
    const searchTerm = searchInput.value.toLowerCase();
    const filtered = window.ordersData.filter(order => 
        order.name.toLowerCase().includes(searchTerm) ||
        order.phone.includes(searchTerm) ||
        order.order_id.toLowerCase().includes(searchTerm)
    );
    displayOrders(filtered);
}

function updateStats() {
    if (!window.ordersData) return;

    const totalEl = document.querySelector('.stats-grid .card:nth-child(1) div:nth-child(2)');
    const pendingEl = document.querySelector('.stats-grid .card:nth-child(2) div:nth-child(2)');
    const completedEl = document.querySelector('.stats-grid .card:nth-child(3) div:nth-child(2)');
    const revenueEl = document.querySelector('.stats-grid .card:nth-child(4) div:nth-child(2)');

    const total = window.ordersData.length;
    const pending = window.ordersData.filter(o => o.status !== 'Delivered').length;
    const completed = window.ordersData.filter(o => o.status === 'Delivered').length;
    const revenue = window.ordersData.reduce((sum, o) => sum + o.total_price + o.delivery_charge, 0);

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (completedEl) completedEl.textContent = completed;
    if (revenueEl) revenueEl.textContent = `৳${revenue}`;
}

// Tab Navigation
function showDashboard() {
    toggleSection('dashboardSection');
    updateActiveNav('dashboardTab');
}

function showAddOrder() {
    toggleSection('addOrderSection');
    updateActiveNav('addNewOrderTab');
    clearOrderForm();
    editMode = false;
    currentEditId = null;
}

function showAllOrders() {
    toggleSection('orderListSection');
    updateActiveNav('allOrdersTab');
    loadOrders();
}

function toggleSection(sectionId) {
    ['dashboardSection', 'addOrderSection', 'orderListSection'].forEach(id => {
        document.getElementById(id).classList.toggle('hidden', id !== sectionId);
    });
}

function updateActiveNav(activeId) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.id === activeId) item.classList.add('active');
    });
}
