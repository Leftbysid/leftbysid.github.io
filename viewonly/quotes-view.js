// firebase.js is OUTSIDE viewonly
import { db } from "../firebase.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter
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

/* =========================
   VALIDATE SHARE PAGE
========================= */
const pageSnap = await getDoc(
  doc(db, "quotes_pages_public", pageId)
);

if (!pageSnap.exists()) {
  list.textContent = "Link expired or revoked";
  throw new Error("Invalid or expired link");
}

const { ownerUid } = pageSnap.data();

/* =========================
   PAGINATION STATE
========================= */
const PAGE_SIZE = 30;
let lastDoc = null;
let allQuotes = [];
let loading = false;
let fullyLoaded = false;

/* =========================
   LOAD MORE BUTTON (JS)
========================= */
const loadMoreBtn = document.createElement("button");
loadMoreBtn.textContent = "Load more";
loadMoreBtn.style.margin = "20px auto";
loadMoreBtn.style.display = "none";
loadMoreBtn.onclick = loadNextPage;

list.after(loadMoreBtn);

/* =========================
   FIRST LOAD
========================= */
await loadNextPage();

/* =========================
   LOAD NEXT PAGE
========================= */
async function loadNextPage() {
  if (loading || fullyLoaded) return;
  loading = true;

  let q = query(
    collection(db, "quotes"),
    where("uid", "==", ownerUid),
    orderBy("createdAt", "desc"),
    limit(PAGE_SIZE)
  );

  if (lastDoc) {
    q = query(
      collection(db, "quotes"),
      where("uid", "==", ownerUid),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);

  if (snap.empty) {
    fullyLoaded = true;
    loadMoreBtn.style.display = "none";
    return;
  }

  lastDoc = snap.docs[snap.docs.length - 1];

  const newQuotes = snap.docs.map(d => d.data());
  allQuotes.push(...newQuotes);

  render(newQuotes, true);

  loadMoreBtn.style.display = "block";
  loading = false;
}

/* =========================
   RENDER
========================= */
function render(arr, append = false) {
  if (!append) list.innerHTML = "";

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

/* =========================
   SEARCH (CLIENT SIDE)
========================= */
search.oninput = () => {
  const v = search.value.toLowerCase().trim();

  if (!v) {
    list.innerHTML = "";
    render(allQuotes);
    loadMoreBtn.style.display = fullyLoaded ? "none" : "block";
    return;
  }

  const filtered = allQuotes.filter(q =>
    q.text.toLowerCase().includes(v) ||
    (q.author || "").toLowerCase().includes(v)
  );

  loadMoreBtn.style.display = "none";
  render(filtered);
};
