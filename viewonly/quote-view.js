import { db } from "./firebase.js";
import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const params = new URLSearchParams(location.search);
const id = params.get("id");

const container = document.getElementById("quote");

if (!id) {
  container.textContent = "Invalid link";
} else {
  const snap = await getDoc(doc(db, "quotes_public", id));

  if (!snap.exists()) {
    container.textContent = "Quote not found";
  } else {
    const q = snap.data();
    container.innerHTML = `
      <p>${q.text}</p>
      ${q.author ? `<span>— ${q.author}</span>` : ""}
    `;
  }
}
