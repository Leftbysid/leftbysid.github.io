// firebase.js is OUTSIDE viewonly
import { db } from "../firebase.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* =========================
   READ-ONLY SHARED PAGE
========================= */

const params = new URLSearchParams(window.location.search);
const pageId = params.get("page");

const list = document.getElementById("quoteList");
const search = document.getElementById("search");

if (!pageId) {
  list.textContent = "Invalid link";
  throw new Error("Missing page id");
}

/* Validate shared page */
const pageSnap = await getDoc(
  doc(db, "quotes_pages_public", pageId)
);

if (!pageSnap.exists()) {
  list.textContent = "Link expired or revoked";
  throw new Error("Invalid or expired link");
}

const { ownerUid } = pageSnap.data();

/* Load ALL quotes for owner */
const snap = await getDocs(
  query(
    collection(db, "quotes"),
    where("uid", "==", ownerUid)
  )
);

let quotes = snap.docs.map(d => d.data());

function render(arr) {
  list.innerHTML = "";

  arr.forEach(q => {
    const div = document.createElement("div");
    div.className = "quote-card";

    div.innerHTML = `
      <p>${q.text}</p>
      ${q.author ? `<span>— ${q.author}</span>` : ""}
    `;

    list.appendChild(div);
  });
}

render(quotes);

/* Normal search */
search.oninput = () => {
  const v = search.value.toLowerCase();
  render(
    quotes.filter(q =>
      q.text.toLowerCase().includes(v) ||
      (q.author || "").toLowerCase().includes(v)
    )
  );
};
