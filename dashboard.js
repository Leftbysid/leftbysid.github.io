import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/* =====================
   ELEMENTS
===================== */
const quoteEl = document.getElementById("dashboardQuote");
const authorEl = document.getElementById("dashboardAuthor");

/* =====================
   LOAD RANDOM QUOTE
===================== */
onAuthStateChanged(auth, async user => {
  if (!user) return;

  try {
    const q = query(
      collection(db, "quotes"),
      where("uid", "==", user.uid)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      quoteEl.textContent = "No quotes yet.";
      authorEl.textContent = "";
      return;
    }

    const docs = snap.docs;
    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    const data = randomDoc.data();

    quoteEl.textContent = `“${data.text}”`;
    authorEl.textContent = data.author ? `— ${data.author}` : "";

  } catch (err) {
    console.error("Dashboard quote error:", err);
    quoteEl.textContent = "Failed to load quote.";
    authorEl.textContent = "";
  }
});
