import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBG6bvAozvCYHxjibEIuJk_CrvqIiylEwg",
  authDomain: "ai-assessmentmaker.firebaseapp.com",
  projectId: "ai-assessmentmaker",
  storageBucket: "ai-assessmentmaker.firebasestorage.app",
  messagingSenderId: "819249174548",
  appId: "1:819249174548:web:d532daa0ef7ba20bcbaf01",
  measurementId: "G-KS4C9P79MN"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };