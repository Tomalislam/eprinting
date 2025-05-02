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

// DOM Elements
let orderList, recentOrders, costsList, searchOrders;

// Global State
let currentUser = null;
let orders = [];
let costs = [];

document.addEventListener('DOMContentLoaded', () => {
    // Initialize DOM elements
    orderList = document.getElementById('orderList');
    recentOrders = document.getElementById('recentOrders');
    costsList = document.getElementById('costsList');
    searchOrders = document.getElementById('searchOrders');

    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            loadAllData();
        } else {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('adminPanel').classList.add('hidden');
        }
    });

    // Event Delegation
    document.addEventListener('click', handleButtonClicks);
    document.addEventListener('change', handleStatusChanges);
    searchOrders?.addEventListener('input', filterOrders);
});

async function loadAllData() {
    try {
        await Promise.all([loadOrders(), loadCosts()]);
        updateDashboard();
        displayRecentOrders();
    } catch (error) {
        console.error("Initialization error:", error);
    }
}

// Order Management
async function loadOrders() {
    try {
        const snapshot = await getDocs(query(collection(db, "orders"), orderBy("created_at", "desc"));
        orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (orderList) orderList.innerHTML = orders.map(createOrderCard).join('');
    } catch (error) {
        handleError("Failed to load orders", error);
    }
}

function createOrderCard(order) {
    return `
        <div class="order-card" data-id="${order.id}">
            <div class="order-header">
                <div class="order-id">${order.order_id}</div>
                <select class="status-select">
                    ${Object.keys(statusClasses)
                        .map(status => `<option ${order.status === status ? 'selected' : ''}>${status}</option>`)
                        .join('')}
                </select>
            </div>
            <div class="order-details">
                ${createOrderDetail('Customer', order.name)}
                ${createOrderDetail('Phone', formatPhone(order.phone))}
                ${createOrderDetail('Documents', `<a href="${order.drive_link}" target="_blank">View Files</a>`)}
                ${createOrderDetail('Total', `৳${order.total_price + order.delivery_charge}`)}
                ${order.due_amount > 0 ? createOrderDetail('Due', `৳${order.due_amount}`, 'warning') : ''}
            </div>
            <div class="order-actions">
                <button class="btn btn-danger delete-btn">Delete</button>
            </div>
        </div>
    `;
}

// Cost Management
async function loadCosts() {
    try {
        const snapshot = await getDocs(query(collection(db, "costs"), orderBy("date", "desc"));
        costs = snapshot.docs.map(doc => doc.data());
        updateDashboard();
    } catch (error) {
        handleError("Failed to load costs", error);
    }
}

// Event Handlers
function handleButtonClicks(e) {
    const card = e.target.closest('.order-card');
    if (!card) return;

    const orderId = card.dataset.id;
    
    if (e.target.classList.contains('delete-btn')) {
        deleteOrder(orderId);
    }
}

async function handleStatusChanges(e) {
    if (e.target.classList.contains('status-select')) {
        const orderId = e.target.closest('.order-card').dataset.id;
        const newStatus = e.target.value;
        
        try {
            await updateDoc(doc(db, "orders", orderId), { status: newStatus });
            loadOrders();
        } catch (error) {
            handleError("Status update failed", error);
        }
    }
}

// Helper Functions
function formatPhone(phone) {
    return phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
}

function handleError(message, error) {
    console.error(message, error);
    alert(`${message}: ${error.message}`);
}

// Initialize all remaining functions (updateDashboard, filterOrders, etc.)

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
