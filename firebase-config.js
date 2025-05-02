// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD2oTeRHgWwA2RvBVQZWcBhi3UNw9l3w2Y",
    authDomain: "e-printing-3ca34.firebaseapp.com",
    projectId: "e-printing-3ca34",
    storageBucket: "e-printing-3ca34.appspot.com",  // ✅ Corrected!
    messagingSenderId: "51071340726",
    appId: "1:51071340726:web:aa1a604db26a3c9d9a1617",
    measurementId: "G-G0LSVYTBHJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
