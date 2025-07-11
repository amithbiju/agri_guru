//KOOYA – Keeping Older Ones Young and Active
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6GmGV4zi6YRZveSQyS3bLrQi1c0XGYwU",
  authDomain: "kooya-935f3.firebaseapp.com",
  projectId: "kooya-935f3",
  storageBucket: "kooya-935f3.firebasestorage.app",
  messagingSenderId: "1073154997391",
  appId: "1:1073154997391:web:3f5a739dd7e203f7a384fa",
  measurementId: "G-BHP4V7N97S",
};
// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
