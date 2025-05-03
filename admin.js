import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
    getFirestore, collection, doc, setDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { 
    getAuth, signInWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import Chart from 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/+esm';

// Firebase Configuration
const firebaseConfig = {
apiKey: "AIzaSyD2oTeRHgWwA2RvBVQZWcBhi3UNw9l3w2Y",
    authDomain: "e-printing-3ca34.firebaseapp.com",
    projectId: "e-printing-3ca34",
    messagingSenderId: "51071340726",
    appId: "1:51071340726:web:aa1a604db26a3c9d9a1617",
    measurementId: "G-G0LSVYTBHJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Global Variables
let currentUser = null;
let orders = [];
let costs = [];
let settings = {};
let revenueChart = null;

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    setupEventListeners();
});

// Authentication Functions
function initAuth() {
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadAllData();
            showAdminPanel();
        } else {
            showLoginForm();
        }
    });
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminEmail').value;
    const password = document.getElementById('adminPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        showError(`Login failed: ${error.message}`);
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
    } catch (error) {
        showError(`Logout failed: ${error.message}`);
    }
}

// Data Loading Functions
async function loadAllData() {
    try {
        await Promise.all([
            loadOrders(),
            loadCosts(),
            loadSettings()
        ]);
        updateDashboard();
        initCharts();
    } catch (error) {
        showError(`Data loading failed: ${error.message}`);
    }
}

async function loadOrders() {
    const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderOrderList();
}

async function loadCosts() {
    const q = query(collection(db, "costs"), orderBy("date", "desc"));
    const snapshot = await getDocs(q);
    costs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function loadSettings() {
    const docRef = doc(db, "settings", "company");
    const docSnap = await getDoc(docRef);
    settings = docSnap.exists() ? docSnap.data() : {};
    renderSettingsForm();
}

// Dashboard Functions
function updateDashboard() {
    // Calculate metrics
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status !== 'Delivered').length;
    const completedOrders = orders.filter(o => o.status === 'Delivered').length;
    const revenue = orders.reduce((sum, o) => sum + o.totalPrice + o.deliveryCharge, 0);
    const totalCosts = costs.reduce((sum, c) => sum + c.amount, 0);
    const netProfit = revenue - totalCosts;

    // Update DOM
    setDashboardValue('totalOrdersValue', totalOrders);
    setDashboardValue('pendingOrdersValue', pendingOrders);
    setDashboardValue('completedOrdersValue', completedOrders);
    setDashboardValue('totalRevenueValue', revenue);
    setDashboardValue('totalCostsValue', totalCosts);
    setDashboardValue('netProfitValue', netProfit);
}

// Order Management Functions
async function handleAddOrder() {
    const orderData = {
        customerName: document.getElementById('customerName').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        driveLink: document.getElementById('driveLink').value,
        totalPrice: Number(document.getElementById('totalPrice').value),
        deliveryCharge: Number(document.getElementById('deliveryCharge').value),
        deliverySystem: document.getElementById('deliverySystem').value,
        status: 'Pending',
        createdAt: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        loadOrders();
        showSection('ordersSection');
    } catch (error) {
        showError(`Failed to add order: ${error.message}`);
    }
}

async function handleEditOrder(orderId) {
    const order = orders.find(o => o.id === orderId);
    const form = document.getElementById('editOrderForm');
    
    // Populate form
    form.elements['customerName'].value = order.customerName;
    form.elements['status'].value = order.status;
    
    // Show modal
    document.getElementById('editOrderModal').classList.add('show');
    
    // Handle form submission
    form.onsubmit = async (e) => {
        e.preventDefault();
        try {
            await updateDoc(doc(db, "orders", orderId), {
                status: form.elements['status'].value,
                customerName: form.elements['customerName'].value
            });
            loadOrders();
            closeModal();
        } catch (error) {
            showError(`Update failed: ${error.message}`);
        }
    };
}

async function handleDeleteOrder(orderId) {
    if (confirm('Are you sure you want to delete this order?')) {
        try {
            await deleteDoc(doc(db, "orders", orderId));
            loadOrders();
        } catch (error) {
            showError(`Delete failed: ${error.message}`);
        }
    }
}

// Analytics Functions
function initCharts() {
    if (revenueChart) revenueChart.destroy();
    
    const ctx = document.getElementById('revenueChart').getContext('2d');
    const data = prepareChartData();
    
    revenueChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.labels,
            datasets: [{
                label: 'Revenue',
                data: data.revenue,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Monthly Revenue Analysis'
                }
            }
        }
    });
}

function prepareChartData() {
    // Group orders by month
    const monthlyData = {};
    orders.forEach(order => {
        const month = new Date(order.createdAt?.toDate()).toLocaleString('default', { month: 'short' });
        if (!monthlyData[month]) monthlyData[month] = 0;
        monthlyData[month] += order.totalPrice + order.deliveryCharge;
    });
    
    return {
        labels: Object.keys(monthlyData),
        revenue: Object.values(monthlyData)
    };
}

// Settings Functions
async function saveSettings() {
    const settingsData = {
        companyName: document.getElementById('companyName').value,
        companyAddress: document.getElementById('companyAddress').value,
        companyPhone: document.getElementById('companyPhone').value,
        updatedAt: serverTimestamp()
    };

    try {
        await setDoc(doc(db, "settings", "company"), settingsData);
        showSuccess('Settings saved successfully');
        loadSettings();
    } catch (error) {
        showError(`Error saving settings: ${error.message}`);
    }
}

// Print Functions
function printShippingLabel(order) {
    const content = `
        <div class="shipping-label">
            <h2>Shipping Label</h2>
            <div class="from-address">
                <h3>From:</h3>
                <p>${settings.companyName || 'Your Company'}</p>
                <p>${settings.companyAddress || '123 Business Street'}</p>
                <p>${settings.companyPhone || '01XXX-XXXXXX'}</p>
            </div>
            <div class="to-address">
                <h3>To:</h3>
                <p>${order.customerName}</p>
                <p>${order.address}</p>
                <p>${order.phone}</p>
            </div>
            <div class="delivery-method">
                <strong>Delivery Method:</strong> ${order.deliverySystem}
            </div>
        </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(content);
    printWindow.print();
}

// UI Functions
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    // Show requested section
    document.getElementById(sectionId).classList.remove('hidden');
}

function renderOrderList() {
    const container = document.getElementById('orderList');
    container.innerHTML = orders.map(order => `
        <div class="order-card" data-id="${order.id}">
            <div class="order-header">
                <h4>${order.customerName}</h4>
                <span class="status ${order.status.toLowerCase()}">${order.status}</span>
            </div>
            <div class="order-details">
                <p>Total: ৳${order.totalPrice + order.deliveryCharge}</p>
                <p>Delivery: ${order.deliverySystem}</p>
                <p>Phone: ${order.phone}</p>
            </div>
            <div class="order-actions">
                <button class="btn edit-btn"><i class="fas fa-edit"></i></button>
                <button class="btn print-btn"><i class="fas fa-print"></i></button>
                <button class="btn delete-btn"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function showAdminPanel() {
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('adminPanel').classList.remove('hidden');
}

function showLoginForm() {
    document.getElementById('adminPanel').classList.add('hidden');
    document.getElementById('loginForm').classList.remove('hidden');
}

// Event Listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('dashboardTab').addEventListener('click', () => showSection('dashboardSection'));
    document.getElementById('ordersTab').addEventListener('click', () => showSection('ordersSection'));
    document.getElementById('analyticsTab').addEventListener('click', () => showSection('analyticsSection'));
    document.getElementById('settingsTab').addEventListener('click', () => showSection('settingsSection'));
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Order Actions
    document.addEventListener('click', (e) => {
        if (e.target.closest('.edit-btn')) {
            const orderId = e.target.closest('.order-card').dataset.id;
            handleEditOrder(orderId);
        }
        if (e.target.closest('.delete-btn')) {
            const orderId = e.target.closest('.order-card').dataset.id;
            handleDeleteOrder(orderId);
        }
        if (e.target.closest('.print-btn')) {
            const orderId = e.target.closest('.order-card').dataset.id;
            const order = orders.find(o => o.id === orderId);
            printShippingLabel(order);
        }
    });

    // Forms
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('addOrderForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleAddOrder();
    });
    document.getElementById('settingsForm').addEventListener('submit', (e) => {
        e.preventDefault();
        saveSettings();
    });
}

// Utility Functions
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

function showSuccess(message) {
    const successDiv = document.getElementById('successMessage');
    successDiv.textContent = message;
    successDiv.classList.remove('hidden');
    setTimeout(() => successDiv.classList.add('hidden'), 3000);
}

function setDashboardValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = typeof value === 'number' ? `৳${value.toLocaleString()}` : value;
    }
}

function closeModal() {
    document.getElementById('editOrderModal').classList.remove('show');
}

// Initialize
document.getElementById('editOrderModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('editOrderModal')) {
        closeModal();
    }
});
