import { db, auth } from './firebase-config.js';
import { 
    signInWithEmailAndPassword, 
    signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    doc, 
    query, 
    orderBy, 
    deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Global Variables
let editMode = false;
let currentEditId = null;
let totalCosts = 0;
let window.ordersData = [];

// DOM Elements
const loginFormElement = document.getElementById('loginFormElement');
const addOrderBtn = document.getElementById('addOrderBtn');
const orderList = document.getElementById('orderList');
const searchInput = document.getElementById('searchInput');
const logoutBtn = document.getElementById('logoutBtn');

// Status Configuration
const statusClasses = {
    'Order Confirmed': 'status-confirmed',
    'Printing Your Order': 'status-printing',
    'Printed - Awaiting Payment': 'status-printed',
    'Your Order Has Been Printed': 'status-printed',
    'Ready for Shipping': 'status-shipping',
    'Shipped': 'status-shipped',
    'Delivered': 'status-delivered'
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            showAdminPanel();
            loadInitialData();
        } else {
            showLoginForm();
        }
    });

    // Event Listeners
    loginFormElement?.addEventListener('submit', handleLogin);
    addOrderBtn?.addEventListener('click', handleAddOrder);
    logoutBtn?.addEventListener('click', handleLogout);
    document.getElementById('viewAllOrders')?.addEventListener('click', () => showSection('allOrdersTab'));
    document.getElementById('costsTab')?.addEventListener('click', () => showSection('costsTab'));
    document.addEventListener('change', handleStatusChange);
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

// Order Management
async function handleAddOrder() {
    const orderData = {
        name: document.getElementById('name').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        drive_link: document.getElementById('driveLink').value.trim(),
        total_price: Number(document.getElementById('totalPrice').value) || 0,
        delivery_system: document.getElementById('deliverySystem').value,
        delivery_charge: Number(document.getElementById('deliveryCharge').value) || 0,
        due_amount: Number(document.getElementById('dueAmount').value) || 0,
        status: 'Order Confirmed',
        order_id: generateOrderID(),
        created_at: new Date().toISOString()
    };

    if (!validateOrder(orderData)) return;

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("Order added!");
        clearOrderForm();
        loadOrders();
    } catch (error) {
        alert("Error adding order: " + error.message);
    }
}

async function deleteOrder(orderId) {
    if (!confirm("Delete this order?")) return;
    
    try {
        await deleteDoc(doc(db, "orders", orderId));
        loadOrders();
    } catch (error) {
        alert("Delete failed: " + error.message);
    }
}

async function loadOrders() {
    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);

        window.ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        displayOrders();
        updateDashboard();
    } catch (error) {
        alert("Error loading orders: " + error.message);
    }
}

// Costs Management
async function addCost() {
    const costData = {
        amount: Number(document.getElementById('costAmount').value),
        category: document.getElementById('costCategory').value.trim(),
        description: document.getElementById('costDescription').value.trim(),
        date: new Date().toISOString()
    };

    try {
        await addDoc(collection(db, "costs"), costData);
        loadCosts();
    } catch (error) {
        alert("Error adding cost: " + error.message);
    }
}

async function loadCosts() {
    try {
        const costsRef = collection(db, "costs");
        const q = query(costsRef, orderBy("date", "desc"));
        const snapshot = await getDocs(q);

        totalCosts = snapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
        updateDashboard();
    } catch (error) {
        alert("Error loading costs: " + error.message);
    }
}

// Status Handling
async function handleStatusChange(event) {
    const select = event.target;
    if (!select.classList.contains('status-select')) return;

    const orderId = select.closest('.order-card').dataset.id;
    const newStatus = select.value;

    try {
        await updateDoc(doc(db, "orders", orderId), { status: newStatus });
        loadOrders();
    } catch (error) {
        alert("Status update failed: " + error.message);
    }
}

// Dashboard Functions
function updateDashboard() {
    const revenue = window.ordersData.reduce((sum, o) => sum + o.total_price, 0);
    const deliveryCosts = window.ordersData.reduce((sum, o) => sum + o.delivery_charge, 0);
    const netProfit = revenue - totalCosts - deliveryCosts;

    document.getElementById('netProfitValue').textContent = `৳${netProfit}`;
    document.getElementById('revenueValue').textContent = `৳${revenue}`;
    document.getElementById('totalCostsValue').textContent = `৳${totalCosts}`;
    document.getElementById('deliveryCostsValue').textContent = `৳${deliveryCosts}`;
}

function displayOrders() {
    orderList.innerHTML = window.ordersData.map(order => `
        <div class="order-card" data-id="${order.id}">
            <div class="order-header">
                <div class="order-id">${order.order_id}</div>
                <select class="status-select" data-orderid="${order.id}">
                    ${Object.keys(statusClasses).map(status => `
                        <option value="${status}" ${status === order.status ? 'selected' : ''}>
                            ${status}
                        </option>
                    `).join('')}
                </select>
            </div>
            <div class="order-details">
                <div class="detail-row">
                    <span>Customer:</span>
                    <span>${order.name}</span>
                </div>
                <div class="detail-row">
                    <span>Phone:</span>
                    <span>${order.phone}</span>
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
            <div class="order-actions">
                <button class="btn btn-danger" onclick="deleteOrder('${order.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `).join('');
}

// Helper Functions
function generateOrderID() {
    return 'ORD' + Date.now().toString().slice(-6);
}

function clearOrderForm() {
    ['name', 'address', 'phone', 'driveLink', 'totalPrice', 'deliveryCharge', 'dueAmount']
        .forEach(id => document.getElementById(id).value = '');
}

function validateOrder(order) {
    const required = ['name', 'address', 'phone', 'drive_link'];
    return required.every(field => !!order[field]);
}

function filterOrders() {
    const term = searchInput.value.toLowerCase();
    const filtered = window.ordersData.filter(order => 
        order.name.toLowerCase().includes(term) ||
        order.phone.includes(term) ||
        order.order_id.toLowerCase().includes(term)
    );
    displayOrders(filtered);
}

// UI Functions
function showAdminPanel() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
}

function showSection(sectionId) {
    ['dashboardSection', 'addOrderSection', 'orderListSection', 'costsSection']
        .forEach(id => document.getElementById(id).classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
}
