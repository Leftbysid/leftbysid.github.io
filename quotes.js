import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* =====================
   STATE
===================== */
let quotes = [];
let editingId = null;
let deleteId = null;
let currentUser = null;

let sortMode = "recent";
let searchQuery = "";

/* LOAD MORE */
const PAGE_SIZE = 20;
let visibleCount = PAGE_SIZE;

/* =====================
   ELEMENTS
===================== */
const quoteText = document.getElementById("quoteText");
const authorInput = document.getElementById("author");
const quoteList = document.getElementById("quoteList");
const searchInput = document.getElementById("search");
const quoteForm = document.getElementById("quoteForm");
const recentBtn = document.getElementById("recentBtn");
const totalQuotesEl = document.getElementById("totalQuotes");
const loadMoreBtn = document.getElementById("loadMoreQuotes");

const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

const editOverlay = document.getElementById("editOverlay");
const editQuote = document.getElementById("editQuote");
const editAuthor = document.getElementById("editAuthor");

/* SHARE UI */
const shareBtn = document.getElementById("sharePageBtn");
const shareOverlay = document.getElementById("shareOverlay");
const closeShareBtn = document.getElementById("closeShare");
const shareResult = document.getElementById("shareResult");
const shareLinkInput = document.getElementById("shareLink");
const copyShareBtn = document.getElementById("copyShareLink");
const shareButtons = document.querySelectorAll(".share-actions button");

let activeSharePageId = null;

/* =====================
   UI
===================== */
document.getElementById("toggleForm").onclick =
  () => quoteForm.classList.toggle("hidden");

if (loadMoreBtn) {
  loadMoreBtn.onclick = () => {
    visibleCount += PAGE_SIZE;
    applyView();
  };
}

/* =====================
   AUTH
===================== */
onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadQuotes();
});

/* =====================
   ADD QUOTE
===================== */
window.addQuote = async () => {
  const rawText = quoteText.value.trim();
  if (!rawText) return;

  const exists = quotes.some(q =>
    q.text.toLowerCase() === rawText.toLowerCase()
  );

  if (exists) {
    alert("This quote already exists.");
    return;
  }

  await addDoc(collection(db, "quotes"), {
    uid: currentUser.uid,
    text: rawText,
    author: authorInput.value.trim() || "",
    createdAt: Date.now()
  });

  quoteForm.classList.add("hidden");
  quoteText.value = "";
  authorInput.value = "";

  loadQuotes(); // refresh once
};

/* =====================
   LOAD QUOTES (NO SNAPSHOT)
===================== */
async function loadQuotes() {
  const q = query(
    collection(db, "quotes"),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);
  quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  totalQuotesEl.textContent = quotes.length;
  applyView();
}

/* =====================
   VIEW
===================== */
function applyView() {
  let list = [...quotes];

  if (searchQuery) {
    list = list.filter(q =>
      q.text.toLowerCase().includes(searchQuery) ||
      (q.author && q.author.toLowerCase().includes(searchQuery))
    );
  }

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  const visible = searchQuery
    ? list
    : list.slice(0, visibleCount);

  renderQuotes(visible);

  if (loadMoreBtn) {
    loadMoreBtn.classList.toggle(
      "hidden",
      searchQuery || list.length <= visibleCount
    );
  }
}

/* =====================
   SEARCH (DEBOUNCED)
===================== */
let searchTimer = null;
searchInput.oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim().toLowerCase();
    visibleCount = PAGE_SIZE;
    applyView();
  }, 300);
};

/* =====================
   RENDER
===================== */
function renderQuotes(list) {
  quoteList.innerHTML = "";

  list.forEach(q => {
    quoteList.innerHTML += `
      <div class="quote-row">
        <div class="quote-actions">
          <button onclick="editQuoteFn('${q.id}')">✏️</button>
          <button onclick="askDelete('${q.id}')">🗑️</button>
        </div>
        <p class="quote-text">“${q.text}”</p>
        ${q.author ? `<p class="quote-author">— ${q.author}</p>` : ""}
      </div>
    `;
  });
}

/* =====================
   EDIT / DELETE
===================== */
window.editQuoteFn = id => {
  const q = quotes.find(x => x.id === id);
  editingId = id;
  editQuote.value = q.text;
  editAuthor.value = q.author || "";
  editOverlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  await updateDoc(doc(db, "quotes", editingId), {
    text: editQuote.value.trim(),
    author: editAuthor.value.trim() || ""
  });
  editOverlay.classList.add("hidden");
  loadQuotes();
};

window.askDelete = id => {
  deleteId = id;
  document.getElementById("confirmBox").classList.remove("hidden");
};

window.confirmDelete = async () => {
  await deleteDoc(doc(db, "quotes", deleteId));
  document.getElementById("confirmBox").classList.add("hidden");
  loadQuotes();
};

/* =====================
   SHARE OVERLAY (FIXED)
===================== */
shareOverlay.classList.add("hidden");
shareResult.classList.add("hidden");

shareBtn.onclick = () => {
  shareResult.classList.add("hidden");
  shareOverlay.classList.remove("hidden");
};

closeShareBtn.onclick = () =>
  shareOverlay.classList.add("hidden");

shareButtons.forEach(btn => {
  btn.onclick = async () => {
    const mode = btn.dataset.mode;

    if (mode === "revoke") {
      if (!activeSharePageId) return alert("No active link");
      await updateDoc(
        doc(db, "quotes_pages_public", activeSharePageId),
        { revoked: true }
      );
      activeSharePageId = null;
      shareResult.classList.add("hidden");
      return alert("Link revoked");
    }

    const pageId = crypto.randomUUID();
    activeSharePageId = pageId;

    const expiresAt =
      mode === "24h"
        ? Timestamp.fromMillis(Date.now() + 86400000)
        : null;

    await setDoc(
      doc(db, "quotes_pages_public", pageId),
      {
        ownerUid: currentUser.uid,
        expiresAt,
        revoked: false,
        createdAt: serverTimestamp()
      }
    );

    shareLinkInput.value =
      `${location.origin}/viewonly/quotes-view.html?page=${pageId}`;

    shareResult.classList.remove("hidden");
  };
});

copyShareBtn.onclick = () => {
  navigator.clipboard.writeText(shareLinkInput.value);
  copyShareBtn.textContent = "Copied!";
  setTimeout(() => (copyShareBtn.textContent = "Copy"), 1000);
};
