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

// ======================
// DOM Element References
// ======================
let orderList, recentOrders, searchInput, costsList;
const statusClasses = {
    'Order Confirmed': 'status-confirmed',
    'Printing Your Order': 'status-printing',
    'Printed - Awaiting Payment': 'status-printed',
    'Your Order Has Been Printed': 'status-printed',
    'Ready for Shipping': 'status-shipping',
    'Shipped': 'status-shipped',
    'Delivered': 'status-delivered'
};

// ======================
// Initialization
// ======================
document.addEventListener('DOMContentLoaded', () => {
    initializeDOMElements();
    setupEventListeners();
    auth.onAuthStateChanged(handleAuthState);
});

function initializeDOMElements() {
    orderList = document.getElementById('orderList');
    recentOrders = document.getElementById('recentOrders');
    searchInput = document.getElementById('searchOrders');
    costsList = document.getElementById('costsList');
}

function setupEventListeners() {
    document.addEventListener('click', handleButtonClicks);
    document.addEventListener('change', handleStatusChange);
    searchInput?.addEventListener('input', filterOrders);
    document.getElementById('loginFormElement')?.addEventListener('submit', handleLogin);
    document.getElementById('addOrderBtn')?.addEventListener('click', handleAddOrder);
    document.getElementById('addCostBtn')?.addEventListener('click', handleAddCost);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
}

// ======================
// Authentication
// ======================
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showError(`Login failed: ${error.message}`);
        document.getElementById('adminPassword').value = '';
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        showError(`Logout failed: ${error.message}`);
    }
}

function handleAuthState(user) {
    if (user) {
        showAdminPanel();
        loadInitialData();
    } else {
        showLoginForm();
    }
}

// ======================
// Order Management
// ======================
let orders = [];

async function loadOrders() {
    try {
        const ordersRef = collection(db, "orders");
        const q = query(ordersRef, orderBy("created_at", "desc"));
        const snapshot = await getDocs(q);
        
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        refreshOrderDisplays();
    } catch (error) {
        showError(`Failed to load orders: ${error.message}`);
    }
}

function refreshOrderDisplays() {
    if (orderList) orderList.innerHTML = orders.map(createOrderCard).join('');
    if (recentOrders) {
        const pending = orders.filter(o => o.status !== 'Delivered').slice(0, 5);
        recentOrders.innerHTML = pending.map(createOrderCard).join('');
    }
    updateDashboard();
}

function createOrderCard(order) {
    return `
        <div class="order-card" data-id="${order.id}">
            <div class="order-header">
                <div class="order-id">${order.order_id}</div>
                <select class="status-select ${statusClasses[order.status]}">
                    ${Object.keys(statusClasses)
                        .map(status => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`)
                        .join('')}
                </select>
            </div>
            <div class="order-details">
                <div class="detail-row">
                    <span class="detail-label">Customer:</span>
                    <span class="detail-value">${order.name}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span class="detail-value">${formatPhone(order.phone)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Documents:</span>
                    <span class="detail-value">
                        <a href="${order.drive_link}" target="_blank" class="drive-link">
                            <i class="fas fa-external-link-alt"></i> View Files
                        </a>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Total:</span>
                    <span class="detail-value">৳${order.total_price + order.delivery_charge}</span>
                </div>
                ${order.due_amount > 0 ? `
                    <div class="detail-row warning">
                        <span class="detail-label">Due Amount:</span>
                        <span class="detail-value">৳${order.due_amount}</span>
                    </div>
                ` : ''}
            </div>
            <div class="order-actions">
                <button class="btn btn-danger delete-btn">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        </div>
    `;
}

// ======================
// Cost Management
// ======================
let costs = [];

async function loadCosts() {
    try {
        const costsRef = collection(db, "costs");
        const q = query(costsRef, orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        
        costs = snapshot.docs.map(doc => doc.data());
        refreshCostsDisplay();
        updateDashboard();
    } catch (error) {
        showError(`Failed to load costs: ${error.message}`);
    }
}

function refreshCostsDisplay() {
    if (!costsList) return;
    
    costsList.innerHTML = costs.map(cost => `
        <div class="cost-item">
            <div class="cost-header">
                <span>৳${cost.amount}</span>
                <span>${new Date(cost.date).toLocaleDateString()}</span>
            </div>
            <div class="cost-details">
                <div><strong>${cost.category}</strong></div>
                <div>${cost.description || ''}</div>
            </div>
        </div>
    `).join('');
}

// ======================
// Event Handlers
// ======================
async function handleButtonClicks(e) {
    const card = e.target.closest('.order-card');
    if (!card) return;

    const orderId = card.dataset.id;
    
    if (e.target.classList.contains('delete-btn')) {
        if (confirm("Are you sure you want to delete this order?")) {
            try {
                await deleteDoc(doc(db, "orders", orderId));
                orders = orders.filter(o => o.id !== orderId);
                refreshOrderDisplays();
            } catch (error) {
                showError(`Delete failed: ${error.message}`);
            }
        }
    }
}

async function handleStatusChange(e) {
    if (e.target.classList.contains('status-select')) {
        const card = e.target.closest('.order-card');
        const orderId = card.dataset.id;
        const newStatus = e.target.value;
        
        try {
            await updateDoc(doc(db, "orders", orderId), { status: newStatus });
            orders = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
            refreshOrderDisplays();
        } catch (error) {
            showError(`Status update failed: ${error.message}`);
        }
    }
}

async function handleAddOrder() {
    const orderData = {
        name: getValue('name'),
        address: getValue('address'),
        phone: getValue('phone').replace(/\D/g, ''),
        drive_link: getValue('driveLink'),
        total_price: Number(getValue('totalPrice')) || 0,
        delivery_system: getValue('deliverySystem'),
        delivery_charge: Number(getValue('deliveryCharge')) || 0,
        due_amount: Number(getValue('dueAmount')) || 0,
        status: 'Order Confirmed',
        order_id: generateOrderID(),
        created_at: new Date().toISOString()
    };

    if (!validateOrder(orderData)) return;

    try {
        await addDoc(collection(db, "orders"), orderData);
        clearOrderForm();
        loadOrders();
    } catch (error) {
        showError(`Failed to add order: ${error.message}`);
    }
}

async function handleAddCost() {
    const costData = {
        amount: Number(getValue('costAmount')) || 0,
        category: getValue('costCategory'),
        description: getValue('costDescription'),
        date: new Date().toISOString()
    };

    if (!costData.amount || !costData.category) {
        showError("Please fill required cost fields");
        return;
    }

    try {
        await addDoc(collection(db, "costs"), costData);
        loadCosts();
    } catch (error) {
        showError(`Failed to add cost: ${error.message}`);
    }
}

// ======================
// Helper Functions
// ======================
function updateDashboard() {
    const revenue = orders.reduce((sum, o) => sum + o.total_price, 0);
    const deliveryCosts = orders.reduce((sum, o) => sum + o.delivery_charge, 0);
    const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);
    const netProfit = revenue - totalCosts - deliveryCosts;

    setDashboardValue('netProfitValue', netProfit);
    setDashboardValue('revenueValue', revenue);
    setDashboardValue('totalCostsValue', totalCosts);
    setDashboardValue('deliveryCostsValue', deliveryCosts);
}

function filterOrders() {
    const term = searchInput.value.toLowerCase();
    const filtered = orders.filter(order => 
        order.name.toLowerCase().includes(term) ||
        order.phone.includes(term) ||
        order.order_id.toLowerCase().includes(term)
    );
    orderList.innerHTML = filtered.map(createOrderCard).join('');
}

function generateOrderID() {
    return 'ORD' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);
}

function formatPhone(phone) {
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
}

function validateOrder(order) {
    const required = ['name', 'address', 'phone', 'drive_link'];
    return required.every(field => {
        if (!order[field]) {
            showError(`Missing required field: ${field.replace('_', ' ')}`);
            return false;
        }
        return true;
    });
}

// ======================
// UI Utilities
// ======================
function showAdminPanel() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('adminPanel').classList.add('hidden');
}

function clearOrderForm() {
    ['name', 'address', 'phone', 'driveLink', 'totalPrice', 'deliveryCharge', 'dueAmount']
        .forEach(id => document.getElementById(id).value = '');
}

function getValue(id) {
    return document.getElementById(id)?.value.trim() || '';
}

function setDashboardValue(id, amount) {
    const element = document.getElementById(id);
    if (element) element.textContent = `৳${amount}`;
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(() => errorDiv.classList.add('hidden'), 5000);
    }
}

// ======================
// Initial Data Loading
// ======================
async function loadInitialData() {
    try {
        await Promise.all([loadOrders(), loadCosts()]);
    } catch (error) {
        showError(`Initialization error: ${error.message}`);
    }
}
