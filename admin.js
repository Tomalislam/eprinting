import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const loginBtn = document.getElementById('loginBtn');
const addOrderBtn = document.getElementById('addOrderBtn');
const loginForm = document.getElementById('loginForm');
const adminPanel = document.getElementById('adminPanel');
const orderList = document.getElementById('orderList');
const addNewOrderTab = document.getElementById('addNewOrderTab');
const allOrdersTab = document.getElementById('allOrdersTab');
const sectionTitle = document.getElementById('sectionTitle');
const addOrderSection = document.getElementById('addOrderSection');
const orderListSection = document.getElementById('orderListSection');
const searchInput = document.getElementById('searchInput');

loginBtn.addEventListener('click', async () => {
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
        sectionTitle.innerText = 'Admin Panel';
        showAddOrder();
        loadOrders();
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
});

addOrderBtn.addEventListener('click', async () => {
    const orderData = {
        name: document.getElementById('name').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        drive_link: document.getElementById('driveLink').value.trim(),
        total_price: parseInt(document.getElementById('totalPrice').value),
        delivery_system: document.getElementById('deliverySystem').value,
        delivery_charge: parseInt(document.getElementById('deliveryCharge').value),
        status: document.getElementById('status').value,
        order_id: generateOrderID()
    };

    if (!orderData.name || !orderData.address || !orderData.phone || !orderData.drive_link || isNaN(orderData.total_price) || isNaN(orderData.delivery_charge) || !orderData.status) {
        alert("Please fill in all fields correctly!");
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
});

function generateOrderID() {
    const timestamp = Date.now().toString().slice(-5);
    const randomPart = Math.floor(1000 + Math.random() * 9000);
    return ORD${timestamp}${randomPart};
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

addNewOrderTab.addEventListener('click', showAddOrder);
allOrdersTab.addEventListener('click', showAllOrders);

function showAddOrder() {
    sectionTitle.innerText = 'Add New Order';
    addOrderSection.classList.remove('hidden');
    orderListSection.classList.add('hidden');
}

function showAllOrders() {
    sectionTitle.innerText = 'All Orders';
    addOrderSection.classList.add('hidden');
    orderListSection.classList.remove('hidden');
    loadOrders();
}

async function loadOrders() {
    const ordersRef = collection(db, "orders");
    const querySnapshot = await getDocs(ordersRef);
    window.ordersData = [];

    querySnapshot.forEach((docSnap) => {
        window.ordersData.push({ id: docSnap.id, ...docSnap.data() });
    });

    displayOrders(window.ordersData);
}

function displayOrders(orders) {
    orderList.innerHTML = "";
    orders.forEach(order => {
        const li = document.createElement('li');
        li.innerHTML = 
            <strong>Order ID:</strong> ${order.order_id}<br>
            <strong>Name:</strong> <span class="name">${order.name}</span><br>
            <strong>Phone:</strong> <span class="phone">${order.phone}</span><br>
            <strong>Address:</strong> <span class="address">${order.address}</span><br>
            <strong>Drive Link:</strong> <span class="drive_link">${order.drive_link}</span><br>
            <strong>Total Price:</strong> <span class="total_price">${order.total_price}</span><br>
            <strong>Delivery System:</strong> <span class="delivery_system">${order.delivery_system}</span><br>
            <strong>Delivery Charge:</strong> <span class="delivery_charge">${order.delivery_charge}</span><br>
            <strong>Status:</strong> 
            <select class="status">
                <option ${order.status === "Order Confirmed" ? "selected" : ""}>Order Confirmed</option>
                <option ${order.status === "Printing Your Order" ? "selected" : ""}>Printing Your Order</option>
                <option ${order.status === "Your Order Has Been Printed" ? "selected" : ""}>Your Order Has Been Printed</option>
                <option ${order.status === "Ready for Shipping" ? "selected" : ""}>Ready for Shipping</option>
                <option ${order.status === "Shipped" ? "selected" : ""}>Shipped</option>
                <option ${order.status === "Delivered" ? "selected" : ""}>Delivered</option>
            </select><br>

            <button class="edit-button" onclick="enableEditing('${order.id}', this)">Edit</button>
        ;
        orderList.appendChild(li);
    });
}

window.enableEditing = function (docId, button) {
    const li = button.parentElement;
    const spans = li.querySelectorAll('span');
    spans.forEach(span => {
        const input = document.createElement('input');
        input.value = span.textContent;
        span.replaceWith(input);
    });

    const statusSelect = li.querySelector('.status');
    statusSelect.disabled = false;

    button.textContent = 'Save';
    button.classList.remove('edit-button');
    button.classList.add('save-button');
    button.onclick = () => saveChanges(docId, li);
};

async function saveChanges(docId, li) {
    const inputs = li.querySelectorAll('input');
    const status = li.querySelector('.status').value;

    const updatedData = {
        name: inputs[0].value,
        phone: inputs[1].value,
        address: inputs[2].value,
        drive_link: inputs[3].value,
        total_price: parseInt(inputs[4].value),
        delivery_system: inputs[5].value,
        delivery_charge: parseInt(inputs[6].value),
        status: status
    };

    const orderRef = doc(db, "orders", docId);
    await updateDoc(orderRef, updatedData);
    alert('Order Updated!');
    loadOrders();
}

searchInput.addEventListener('input', () => {
    const keyword = searchInput.value.toLowerCase();
    const filtered = window.ordersData.filter(order =>
        order.name.toLowerCase().includes(keyword) ||
        order.phone.toLowerCase().includes(keyword)
    );
    displayOrders(filtered);
});
