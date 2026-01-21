/* ===============================
   IMPORTS (MUST BE FIRST)
================================ */
import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { requireAuth } from "./auth-guard.js";

/* ===============================
   ROUTE GUARD
================================ */
requireAuth();

/* ===============================
   FIRESTORE COLLECTION
================================ */
const COLLECTION_NAME = "books_fiction";
const SHARE_COLLECTION = "books_fiction_pages_public";

/* ===============================
   STATE
================================ */
let books = [];
let currentUser = null;
let editingId = null;
let deleteId = null;
let activeShareId = null;

let currentFilter = "all";
let sortMode = "recent";

/* ===============================
   ELEMENTS
================================ */
const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const bookList = document.getElementById("bookList");
const searchInput = document.getElementById("search");
const bookForm = document.getElementById("bookForm");

const recentBtn = document.getElementById("recentBtn");
const filterSelect = document.getElementById("filterSelect");

const totalCount = document.getElementById("totalCount");
const readCount = document.getElementById("readCount");
const unreadCount = document.getElementById("unreadCount");

const editOverlay = document.getElementById("editOverlay");
const editTitle = document.getElementById("editTitle");
const editAuthor = document.getElementById("editAuthor");
const editCategory = document.getElementById("editCategory");
const editDate = document.getElementById("editDate");

/* EXPORT */
const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

/* SHARE */
const shareBtn = document.getElementById("sharePageBtn");
const overlay = document.getElementById("shareOverlay");
const closeBtn = document.getElementById("closeShare");
const shareResult = document.getElementById("shareResult");
const shareLinkInput = document.getElementById("shareLink");
const copyBtn = document.getElementById("copyShareLink");
const shareButtons = document.querySelectorAll(".share-actions button");

/* ===============================
   UI INIT
================================ */
document.getElementById("toggleForm").onclick =
  () => bookForm.classList.toggle("hidden");

/* ===============================
   AUTH
================================ */
onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUser = user;
  loadBooks();
});

/* ===============================
   ADD BOOK
================================ */
window.addBook = async () => {
  if (!titleInput.value || !authorInput.value) return;

  await addDoc(collection(db, COLLECTION_NAME), {
    uid: currentUser.uid,
    title: titleInput.value.trim(),
    author: authorInput.value.trim(),
    category: categoryInput.value.trim(),
    date: dateInput.value,
    read: false,
    owned: false,
    createdAt: Date.now()
  });

  bookForm.classList.add("hidden");
  titleInput.value = "";
  authorInput.value = "";
  categoryInput.value = "";
  dateInput.value = "";
};

/* ===============================
   LOAD BOOKS
================================ */
function loadBooks() {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("uid", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {
    books = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyView();
  });
}

/* ===============================
   VIEW
================================ */
function applyView() {
  let list = [...books];

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  renderBooks(list);
}

function renderBooks(list) {
  bookList.innerHTML = "";

  list.forEach(b => {
    bookList.innerHTML += `
      <div class="book-row">
        <span>${b.title}</span> — ${b.author}
      </div>
    `;
  });

  totalCount.textContent = list.length;
  readCount.textContent = list.filter(b => b.read).length;
  unreadCount.textContent = list.filter(b => !b.read).length;
}

/* ===============================
   SHARE LOGIC (WORKING)
================================ */
shareBtn.onclick = () => {
  overlay.classList.remove("hidden");
  shareResult.classList.add("hidden");
};

closeBtn.onclick = () => {
  overlay.classList.add("hidden");
};

shareButtons.forEach(btn => {
  btn.onclick = async () => {
    const mode = btn.dataset.mode;

    if (mode === "revoke") {
      if (!activeShareId) return alert("No active link");

      await updateDoc(
        doc(db, SHARE_COLLECTION, activeShareId),
        { revoked: true }
      );

      shareResult.classList.add("hidden");
      activeShareId = null;
      return alert("Link revoked");
    }

    const pageId = crypto.randomUUID();
    activeShareId = pageId;

    const expiresAt =
      mode === "24h"
        ? Timestamp.fromMillis(Date.now() + 86400000)
        : null;

    await setDoc(doc(db, SHARE_COLLECTION, pageId), {
      ownerUid: currentUser.uid,
      expiresAt,
      revoked: false,
      createdAt: serverTimestamp()
    });

    shareLinkInput.value =
      `${location.origin}/viewonly/fiction-view.html?page=${pageId}`;

    shareResult.classList.remove("hidden");
  };
});

copyBtn.onclick = () => {
  navigator.clipboard.writeText(shareLinkInput.value);
  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1000);
};
