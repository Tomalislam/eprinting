// track.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.11.1/firebase-firestore.js";

const firebaseConfig = {
    // YOUR firebase config
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');

window.trackOrder = async function () {
    const phoneInput = document.getElementById('phoneInput').value.trim();
    if (!id || !phoneInput) {
        alert("Please enter your phone number.");
        return;
    }

    const orderRef = doc(db, "orders", id);
    const orderSnap = await getDoc(orderRef);

    if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        if (orderData.phone === phoneInput) {
            document.getElementById('result').innerHTML = `
                <h3>Order Details</h3>
                <strong>Status:</strong> ${orderData.status}<br>
                <strong>Name:</strong> ${orderData.name}<br>
                <strong>Phone:</strong> ${orderData.phone}<br>
                <strong>Address:</strong> ${orderData.address}<br>
                <strong>Total Price:</strong> ${orderData.total_price}৳<br>
            `;
        } else {
            alert("Phone number does not match!");
        }
    } else {
        alert("Order not found!");
    }
}
