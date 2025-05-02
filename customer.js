import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    initializeTracking();
});

function initializeTracking() {
    document.getElementById('trackBtn').addEventListener('click', handleTrack);
    document.getElementById('searchType').addEventListener('change', updateSearchPlaceholder);
}

async function handleTrack() {
    try {
        const type = document.getElementById('searchType').value;
        const value = document.getElementById('searchInput').value.trim();
        const orders = await fetchOrders(type, value);
        displayOrders(orders);
    } catch (error) {
        showError(error.message);
    }
}

async function fetchOrders(type, value) {
    const validValue = validateInput(type, value);
    const field = type === 'phone' ? 'phone' : 'order_id';
    
    const snapshot = await getDocs(query(
        collection(db, "orders"), 
        where(field, "==", validValue)
    ));
    
    if (snapshot.empty) throw new Error("No orders found");
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

function displayOrders(orders) {
    const container = document.getElementById('ordersContainer');
    if (!container) return;

    container.innerHTML = orders.map(order => `
        <div class="order-card">
            <!-- Similar structure to admin order cards -->
            <!-- Include status and due amount -->
        </div>
    `).join('');
}

// Validation and error handling
function validateInput(type, value) {
    if (type === 'phone') {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length !== 11 || !cleaned.startsWith('01')) {
            throw new Error("Invalid phone number");
        }
        return cleaned;
    }
    
    if (!/^ORD\d+$/i.test(value)) throw new Error("Invalid Order ID");
    return value.toUpperCase();
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}
