// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Add these under imports if using other services
import { getStorage } from "firebase/storage";
// Then initialize:
const storage = getStorage(app);
// And export if needed

const firebaseConfig = {
    apiKey: "AIzaSyD2oTeRHgWwA2RvBVQZWcBhi3UNw9l3w2Y",
    authDomain: "e-printing-3ca34.firebaseapp.com",
    projectId: "e-printing-3ca34",
    storageBucket: "e-printing-3ca34.appspot.com",
    messagingSenderId: "51071340726",
    appId: "1:51071340726:web:aa1a604db26a3c9d9a1617",
    measurementId: "G-G0LSVYTBHJ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth };
