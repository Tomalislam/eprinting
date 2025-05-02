import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.getElementById('trackBtn').addEventListener('click', async () => {
    const phone = document.getElementById('phoneInput').value;
    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, where("phone", "==", phone));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        alert("Order not found.");
        return;
    }

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        document.getElementById('orderDetails').style.display = "block";
        document.getElementById('name').textContent = "Name: " + data.name;
        document.getElementById('address').textContent = "Address: " + data.address;
        document.getElementById('driveLink').innerHTML = `Drive Link: <a href="${data.drive_link}" target="_blank">Open Link</a>`;
        document.getElementById('deliverySystem').textContent = "Delivery System: " + data.delivery_system;
        document.getElementById('totalPrice').textContent = "Total Price: " + data.total_price + "৳";
        document.getElementById('status').textContent = "Order Status: " + data.status;
    });
});
