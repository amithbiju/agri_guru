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
  apiKey: "AIzaSyBZTOvnRnfFsg2sqbYwfRQ7sWBbU7riAb8",
  authDomain: "agriguru-e6a0d.firebaseapp.com",
  projectId: "agriguru-e6a0d",
  storageBucket: "agriguru-e6a0d.firebasestorage.app",
  messagingSenderId: "118425962463",
  appId: "1:118425962463:web:49101b5da5921ba492e66a",
  measurementId: "G-KYXPDNS28X",
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
