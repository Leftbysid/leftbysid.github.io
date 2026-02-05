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
   SETUP
========================= */
const params = new URLSearchParams(location.search);
const pageId = params.get("page");

const quoteList = document.getElementById("quoteList");
const searchInput = document.getElementById("search");
const totalQuotesEl = document.getElementById("totalQuotes");
const loadMoreBtn = document.getElementById("loadMoreBtn");

if (!pageId) {
  quoteList.textContent = "Invalid link";
  throw new Error("Missing page id");
}

/* =========================
   STATE
========================= */
const PAGE_SIZE = 30;
let lastDoc = null;
let allLoaded = false;
let quotes = [];

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
   FETCH NEXT PAGE
========================= */
async function loadNextPage() {
  if (allLoaded) return;

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
    allLoaded = true;
    loadMoreBtn.style.display = "none";
    return;
  }

  lastDoc = snap.docs[snap.docs.length - 1];
  quotes.push(...snap.docs.map(d => d.data()));

  totalQuotesEl.textContent = quotes.length;
}

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
}

/* =========================
   HYBRID SEARCH (KEY PART)
========================= */
async function performSearch(term) {
  let filtered = quotes.filter(q =>
    q.text.toLowerCase().includes(term) ||
    (q.author || "").toLowerCase().includes(term)
  );

  while (!filtered.length && !allLoaded) {
    await loadNextPage();
    filtered = quotes.filter(q =>
      q.text.toLowerCase().includes(term) ||
      (q.author || "").toLowerCase().includes(term)
    );
  }

  render(filtered);
}

/* =========================
   EVENTS
========================= */
loadMoreBtn.onclick = async () => {
  await loadNextPage();
  render(quotes);
};

let searchTimer = null;
searchInput.oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    const term = searchInput.value.trim().toLowerCase();
    if (!term) {
      render(quotes);
      return;
    }
    await performSearch(term);
  }, 300);
};

/* =========================
   INITIAL LOAD
========================= */
await loadNextPage();
render(quotes);
