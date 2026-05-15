import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCXuDKDxjsco0lvlU4elUBrcPBn60b-Lyg",
  authDomain: "internlink-8c4d2.firebaseapp.com",
  projectId: "internlink-8c4d2",
  storageBucket: "internlink-8c4d2.firebasestorage.app",
  messagingSenderId: "295543535856",
  appId: "1:295543535856:web:7a89c3a9bd725a2e00aa35",
  measurementId: "G-NSX57QZGJR",
};

const firebaseApp = initializeApp(firebaseConfig);

export const firebaseAuth = getAuth(firebaseApp);
