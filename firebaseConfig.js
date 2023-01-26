import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAuth } from "firebase/auth"


const firebaseConfig = {
    apiKey: "AIzaSyBKP8mEj1UHijTvkZ00TWqkRdIsKF3qpzk",
    authDomain: "pocket-class-bf921.firebaseapp.com",
    projectId: "pocket-class-bf921",
    storageBucket: "pocket-class-bf921.appspot.com",
    messagingSenderId: "270140022594",
    appId: "1:270140022594:web:d25d81f3a3b7070df332db"
};


const app = initializeApp(firebaseConfig)
const db = getFirestore(app)
const storage = getStorage(app)
const auth = getAuth(app)
export { db, storage, auth }