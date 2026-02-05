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
   SETUP
========================= */
const params = new URLSearchParams(location.search);
const pageId = params.get("page");

const quoteList = document.getElementById("quoteList");
const searchInput = document.getElementById("search");
const totalQuotesEl = document.getElementById("totalQuotes");

if (!pageId) {
  quoteList.textContent = "Invalid link";
  throw new Error("Missing page id");
}

/* =========================
   STATE (SAME AS PRIVATE)
========================= */
let quotes = [];
const PAGE_SIZE = 20;
let visibleCount = PAGE_SIZE;

/* =========================
   CREATE LOAD MORE BUTTON FIRST ✅
========================= */
const loadMoreBtn = document.createElement("button");
loadMoreBtn.textContent = "Load more";
loadMoreBtn.style.display = "block";
loadMoreBtn.style.margin = "30px auto";
loadMoreBtn.style.padding = "10px 24px";
loadMoreBtn.style.background = "black";
loadMoreBtn.style.border = "2px solid #00ff9c";
loadMoreBtn.style.color = "#00ff9c";
loadMoreBtn.style.cursor = "pointer";

quoteList.after(loadMoreBtn);

/* =========================
   VALIDATE SHARE PAGE
========================= */
const pageSnap = await getDoc(
  doc(db, "quotes_pages_public", pageId)
);

if (!pageSnap.exists()) {
  quoteList.textContent = "Link expired or revoked";
  throw new Error("Invalid link");
}

const { ownerUid, revoked, expiresAt } = pageSnap.data();

if (revoked) {
  quoteList.textContent = "This link has been revoked.";
  throw new Error("Revoked");
}

if (expiresAt && Date.now() > expiresAt.toMillis()) {
  quoteList.textContent = "This link has expired.";
  throw new Error("Expired");
}

/* =========================
   LOAD ALL QUOTES (LIKE PRIVATE PAGE)
========================= */
const q = query(
  collection(db, "quotes"),
  where("uid", "==", ownerUid)
);

const snap = await getDocs(q);
quotes = snap.docs.map(d => d.data());

totalQuotesEl.textContent = quotes.length;

/* =========================
   RENDER
========================= */
function render(list) {
  quoteList.innerHTML = "";

  list.forEach(q => {
    quoteList.innerHTML += `
      <div class="quote-row">
        <p class="quote-text">“${q.text}”</p>
        ${q.author ? `<p class="quote-author">— ${q.author}</p>` : ""}
      </div>
    `;
  });

  // Hide Load More if everything is visible
  loadMoreBtn.style.display =
    list.length < visibleCount ? "none" : "block";
}

/* =========================
   APPLY VIEW (SEARCH + PAGINATION)
========================= */
function applyView() {
  const term = searchInput.value.trim().toLowerCase();

  let list = quotes;

  if (term) {
    list = quotes.filter(q =>
      q.text.toLowerCase().includes(term) ||
      (q.author || "").toLowerCase().includes(term)
    );
  }

  render(list.slice(0, visibleCount));
}

/* =========================
   EVENTS
========================= */

// Load More
loadMoreBtn.onclick = () => {
  visibleCount += PAGE_SIZE;
  applyView();
};

// Search (debounced)
let searchTimer = null;
searchInput.oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    visibleCount = PAGE_SIZE;
    applyView();
  }, 300);
};

/* =========================
   INITIAL VIEW
========================= */
applyView();
