import { db, auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { collection, addDoc, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value.trim();

    if (!email || !password) {
        alert("Please enter email and password!");
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('adminPanel').classList.remove('hidden');
        loadOrders();
    } catch (error) {
        alert("Login Failed: " + error.message);
    }
});

document.getElementById('addOrderBtn').addEventListener('click', async () => {
    const orderData = {
        name: document.getElementById('name').value.trim(),
        address: document.getElementById('address').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        drive_link: document.getElementById('driveLink').value.trim(),
        total_price: parseInt(document.getElementById('totalPrice').value),
        delivery_system: document.getElementById('deliverySystem').value,
        delivery_charge: parseInt(document.getElementById('deliveryCharge').value),
        status: document.getElementById('status').value
    };

    try {
        await addDoc(collection(db, "orders"), orderData);
        alert("Order added successfully!");
        loadOrders();
    } catch (error) {
        alert("Failed to add order: " + error.message);
    }
});

async function loadOrders() {
    const ordersRef = collection(db, "orders");
    const querySnapshot = await getDocs(ordersRef);
    const orderList = document.getElementById('orderList');
    orderList.innerHTML = "";

    querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const li = document.createElement('li');
        li.innerHTML = `
            ${data.name} - ${data.phone} - ${data.status}
            <button onclick="updateStatus('${docSnap.id}')">Change Status</button>
        `;
        orderList.appendChild(li);
    });
}

window.updateStatus = async function(docId) {
    const newStatus = prompt("Enter new status:");
    if (newStatus) {
        const orderRef = doc(db, "orders", docId);
        await updateDoc(orderRef, { status: newStatus });
        alert("Status updated!");
        loadOrders();
    }
}
