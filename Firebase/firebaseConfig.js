const firebaseConfig = {
  apiKey: "AIzaSyAzbczUONarHvtmw1EvpKrggTF5eviQVh0",
  authDomain: "foodsystem-c094c.firebaseapp.com",
  projectId: "foodsystem-c094c",
  storageBucket: "foodsystem-c094c.firebasestorage.app",
  messagingSenderId: "1045882688418",
  appId: "1:1045882688418:web:cc84efc4d55cac6effd8fb",
  measurementId: "G-L6JHJ0P9HH"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();