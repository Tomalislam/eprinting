// admin.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyD2oTeRHgWwA2RvBVQZWcBhi3UNw9l3w2Y",
    authDomain: "e-printing-3ca34.firebaseapp.com",
    projectId: "e-printing-3ca34",
    storageBucket: "e-printing-3ca34.appspot.com",  // ✅ Corrected!
    messagingSenderId: "51071340726",
    appId: "1:51071340726:web:aa1a604db26a3c9d9a1617",
    measurementId: "G-G0LSVYTBHJ"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const orderForm = document.getElementById('orderForm');
const orderList = document.getElementById('orderList');

orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newOrder = {
        order_id: orderForm.order_id.value,
        name: orderForm.name.value,
        phone: orderForm.phone.value,
        address: orderForm.address.value,
        drive_link: orderForm.drive_link.value,
        delivery_system: orderForm.delivery_system.value,
        total_price: parseFloat(orderForm.total_price.value),
        delivery_charge: parseFloat(orderForm.delivery_charge.value),
        status: orderForm.status.value
    };

    try {
        await addDoc(collection(db, "orders"), newOrder);
        orderForm.reset();
        fetchOrders();
    } catch (error) {
        console.error("Error adding order: ", error);
    }
});

async function fetchOrders() {
    const querySnapshot = await getDocs(collection(db, "orders"));
    const orders = [];
    querySnapshot.forEach((doc) => {
        orders.push({ id: doc.id, ...doc.data() });
    });
    displayOrders(orders);
}

function displayOrders(orders) {
    orderList.innerHTML = "";
    orders.forEach(order => {
        const li = document.createElement('li');
        const trackingLink = `https://yourwebsite.com/track.html?id=${order.id}`;

        li.innerHTML = `
            <strong>Order ID:</strong> ${order.order_id}<br>
            <strong>Name:</strong> ${order.name}<br>
            <strong>Phone:</strong> ${order.phone}<br>
            <strong>Address:</strong> ${order.address}<br>
            <strong>Drive Link:</strong> <a href="${order.drive_link}" target="_blank">Open Link</a><br>
            <strong>Delivery System:</strong> ${order.delivery_system}<br>
            <strong>Total Price:</strong> ${order.total_price}৳<br>
            <strong>Delivery Charge:</strong> ${order.delivery_charge}৳<br>
            <strong>Status:</strong> ${order.status}<br>
            <button class="edit-button" onclick="editOrder('${order.id}')">Edit</button>
            <button class="share-button" onclick="shareTrackingLink('${trackingLink}')">📤 Share</button>
        `;
        orderList.appendChild(li);
    });
}

function shareTrackingLink(link) {
    if (navigator.share) {
        navigator.share({
            title: 'Track Your Order',
            text: 'Track your order using this link:',
            url: link
        }).catch((error) => console.log('Sharing failed', error));
    } else {
        navigator.clipboard.writeText(link).then(() => {
            alert('Tracking link copied to clipboard!');
        }, (err) => {
            alert('Could not copy link: ', err);
        });
    }
}

async function editOrder(id) {
    const newStatus = prompt("Enter new status:");
    if (newStatus) {
        const orderRef = doc(db, "orders", id);
        await updateDoc(orderRef, { status: newStatus });
        fetchOrders();
    }
}

fetchOrders();
