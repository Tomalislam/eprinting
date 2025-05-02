import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const loginBtn = document.getElementById('loginBtn');
const addOrderBtn = document.getElementById('addOrderBtn');
const loginForm = document.getElementById('loginForm');
const adminPanel = document.getElementById('adminPanel');
const orderList = document.getElementById('orderList');
const addOrderSection = document.getElementById('addOrderSection');
const orderListSection = document.getElementById('orderListSection');
const showAddOrder = document.getElementById('showAddOrder');
const showAllOrders = document.getElementById('showAllOrders');
const mainHeading = document.getElementById('mainHeading');

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
    mainHeading.classList.add('hidden');
  } catch (error) {
    alert("Login Failed: " + error.message);
  }
});

// Switching sections
showAddOrder.addEventListener('click', () => {
  addOrderSection.classList.remove('hidden');
  orderListSection.classList.add('hidden');
  clearOrderForm();
});

showAllOrders.addEventListener('click', () => {
  addOrderSection.classList.add('hidden');
  orderListSection.classList.remove('hidden');
  loadOrders();
});

// Generate Unique ID
function generateOrderID() {
  return 'ORD-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Add New Order
addOrderBtn.addEventListener('click', async () => {
  const orderId = generateOrderID();
  const orderData = {
    order_id: orderId,
    name: document.getElementById('name').value.trim(),
    address: document.getElementById('address').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    drive_link: document.getElementById('driveLink').value.trim(),
    total_price: parseInt(document.getElementById('totalPrice').value),
    delivery_system: document.getElementById('deliverySystem').value,
    delivery_charge: parseInt(document.getElementById('deliveryCharge').value),
    status: document.getElementById('status').value
  };

  if (!orderData.name || !orderData.address || !orderData.phone || !orderData.drive_link || isNaN(orderData.total_price) || isNaN(orderData.delivery_charge) || !orderData.status) {
    alert("Please fill in all fields correctly!");
    return;
  }

  try {
    await addDoc(collection(db, "orders"), orderData);
    alert("Order added successfully!");
    clearOrderForm();
  } catch (error) {
    alert("Failed to add order: " + error.message);
  }
});

function clearOrderForm() {
  document.getElementById('name').value = '';
  document.getElementById('address').value = '';
  document.getElementById('phone').value = '';
  document.getElementById('driveLink').value = '';
  document.getElementById('totalPrice').value = '';
  document.getElementById('deliverySystem').value = '';
  document.getElementById('deliveryCharge').value = '';
  document.getElementById('status').value = '';
}

// Load All Orders
async function loadOrders() {
  const ordersRef = collection(db, "orders");
  const querySnapshot = await getDocs(ordersRef);
  orderList.innerHTML = "";

  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const li = document.createElement('li');
    li.innerHTML = `
      <input type="text" value="${data.name}" onchange="updateField('${docSnap.id}', 'name', this.value)">
      <br>Phone: <input type="text" value="${data.phone}" onchange="updateField('${docSnap.id}', 'phone', this.value)">
      <br>Order ID: ${data.order_id}
      <br>Status:
      <select onchange="updateStatus('${docSnap.id}', this.value)">
        <option value="Order Confirmed" ${data.status === 'Order Confirmed' ? 'selected' : ''}>Order Confirmed</option>
        <option value="Printing Your Order" ${data.status === 'Printing Your Order' ? 'selected' : ''}>Printing Your Order</option>
        <option value="Your Order Has Been Printed" ${data.status === 'Your Order Has Been Printed' ? 'selected' : ''}>Your Order Has Been Printed</option>
        <option value="Ready for Shipping" ${data.status === 'Ready for Shipping' ? 'selected' : ''}>Ready for Shipping</option>
        <option value="Shipped" ${data.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
        <option value="Delivered" ${data.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
      </select>
    `;
    orderList.appendChild(li);
  });
}

// Update Specific Field
window.updateField = async (docId, fieldName, value) => {
  const orderRef = doc(db, "orders", docId);
  await updateDoc(orderRef, { [fieldName]: value });
  alert(fieldName + " updated!");
};

// Update Status
window.updateStatus = async (docId, newStatus) => {
  const orderRef = doc(db, "orders", docId);
  await updateDoc(orderRef, { status: newStatus });
  alert("Status updated!");
};

