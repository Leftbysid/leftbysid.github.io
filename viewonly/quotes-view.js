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

const params = new URLSearchParams(location.search);
const pageId = params.get("page");

const list = document.getElementById("quoteList");
const search = document.getElementById("search");

if (!pageId) {
  list.textContent = "Invalid link";
  throw new Error("Missing page id");
}

/* =========================
   PAGINATION STATE
========================= */
const PAGE_SIZE = 30;
let lastDoc = null;
let allLoaded = false;
let quotes = [];

/* =========================
   VALIDATE SHARE LINK
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
   LOAD MORE BUTTON (DYNAMIC)
========================= */
const loadMoreBtn = document.createElement("button");
loadMoreBtn.textContent = "Load more";
loadMoreBtn.style.margin = "20px auto";
loadMoreBtn.style.display = "block";
loadMoreBtn.onclick = loadNextPage;
list.after(loadMoreBtn);

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
    loadMoreBtn.remove();
    return;
  }

  lastDoc = snap.docs[snap.docs.length - 1];
  quotes.push(...snap.docs.map(d => d.data()));
  render(quotes);
}

/* =========================
   RENDER
========================= */
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

/* =========================
   SEARCH (LOCAL + FAST)
========================= */
let searchTimer = null;
search.oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const v = search.value.toLowerCase();

    render(
      quotes.filter(q =>
        q.text.toLowerCase().includes(v) ||
        (q.author || "").toLowerCase().includes(v)
      )
    );
  }, 300);
};

/* =========================
   INITIAL LOAD
========================= */
loadNextPage();
