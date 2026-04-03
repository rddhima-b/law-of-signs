// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC2m5Ppa95kNJCnY7olo6OlsssM5iDZY20",
  authDomain: "law-of-signs.firebaseapp.com",
  projectId: "law-of-signs",
  storageBucket: "law-of-signs.firebasestorage.app",
  messagingSenderId: "438012155641",
  appId: "1:438012155641:web:e8ed7ed633e44a3cb33428",
  measurementId: "G-W2S1707D81"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);