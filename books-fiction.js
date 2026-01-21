/* ===============================
   IMPORTS (MUST BE FIRST)
================================ */
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

let currentFilter = "all";
let sortMode = "recent";
let searchQuery = "";

let activeShareId = null;

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

const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

/* SHARE UI */
const shareBtn = document.getElementById("sharePageBtn");
const shareOverlay = document.getElementById("shareOverlay");
const closeShareBtn = document.getElementById("closeShare");
const shareResult = document.getElementById("shareResult");
const shareLinkInput = document.getElementById("shareLink");
const copyShareBtn = document.getElementById("copyShareLink");
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
  loadBooks(); // 🔥 one-time read
});

/* ===============================
   ADD BOOK
================================ */
window.addBook = async () => {
  if (!titleInput.value || !authorInput.value) return;

  const newTitle = titleInput.value.trim().toLowerCase();
  const newAuthor = authorInput.value.trim().toLowerCase();

  const exists = books.some(b =>
    b.title.toLowerCase() === newTitle &&
    b.author.toLowerCase() === newAuthor
  );

  if (exists) {
    alert("This book already exists.");
    return;
  }

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

  await loadBooks(); // 🔥 manual refresh
  bookForm.classList.add("hidden");
  titleInput.value = "";
  authorInput.value = "";
  categoryInput.value = "";
  dateInput.value = "";
};

/* ===============================
   LOAD BOOKS (READ SAFE)
================================ */
async function loadBooks() {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);
  books = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  applyView();
}

/* ===============================
   VIEW LOGIC
================================ */
function applyView() {
  let list = [...books];

  /* 🔍 SEARCH */
  if (searchQuery) {
    if (searchQuery.startsWith("@")) {
      const authorOnly = searchQuery.slice(1);
      list = list.filter(b =>
        b.author.toLowerCase().includes(authorOnly)
      );
    } else {
      list = list.filter(b =>
        b.title.toLowerCase().includes(searchQuery) ||
        b.author.toLowerCase().includes(searchQuery) ||
        (b.category || "").toLowerCase().includes(searchQuery)
      );
    }
  }

  /* FILTERS */
  switch (currentFilter) {
    case "owned": list = list.filter(b => b.owned); break;
    case "not-owned": list = list.filter(b => !b.owned); break;
    case "read": list = list.filter(b => b.read); break;
    case "not-read": list = list.filter(b => !b.read); break;
  }

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  renderBooks(list);
}

/* ===============================
   CONTROLS
================================ */
recentBtn.onclick = () => {
  sortMode = "recent";
  currentFilter = "all";
  filterSelect.value = "all";
  applyView();
};

filterSelect.onchange = () => {
  currentFilter = filterSelect.value;
  sortMode = "none";
  applyView();
};

/* ===============================
   SEARCH (DEBOUNCED + @AUTHOR)
================================ */
let searchTimer = null;
searchInput.oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim().toLowerCase();
    applyView();
  }, 300);
};

/* ===============================
   RENDER (UNCHANGED)
================================ */
function renderBooks(list) {
  bookList.innerHTML = "";

  list.forEach(b => {
    bookList.innerHTML += `
      <div class="book-row-wrapper">
        <span class="owned-icon ${b.owned ? "owned" : ""}">📘</span>

        <div class="book-row ${b.read ? "read" : ""}">
          <div>
            <span class="book-title">${b.title}</span>
            <span class="book-author">— ${b.author}</span>
            <span class="status-badge ${b.read ? "read" : "unread"}">
              ${b.read ? "READ" : "UNREAD"}
            </span>
          </div>
          <div>
            <span>${b.category || ""}</span><br>
            <span>${b.date || ""}</span>
          </div>
        </div>

        <div class="book-actions">
          <input type="checkbox"
            ${b.owned ? "checked" : ""}
            onchange="toggleOwned('${b.id}', this.checked)">
          <button onclick="toggleRead('${b.id}', ${b.read})">
            ${b.read ? "✅" : "⬜"}
          </button>
          <button onclick="editBook('${b.id}')">✏️</button>
          <button onclick="askDelete('${b.id}')">🗑️</button>
        </div>
      </div>
    `;
  });

  totalCount.textContent = list.length;
  readCount.textContent = list.filter(b => b.read).length;
  unreadCount.textContent = list.filter(b => !b.read).length;
}

/* ===============================
   TOGGLES
================================ */
window.toggleRead = async (id, current) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), { read: !current });
  await loadBooks();
};

window.toggleOwned = async (id, value) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), { owned: value });
  await loadBooks();
};

/* ===============================
   EDIT
================================ */
window.editBook = id => {
  const b = books.find(x => x.id === id);
  editingId = id;
  editTitle.value = b.title;
  editAuthor.value = b.author;
  editCategory.value = b.category || "";
  editDate.value = b.date || "";
  editOverlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  await updateDoc(doc(db, COLLECTION_NAME, editingId), {
    title: editTitle.value,
    author: editAuthor.value,
    category: editCategory.value,
    date: editDate.value
  });
  editOverlay.classList.add("hidden");
  await loadBooks();
};

window.closeEdit = () =>
  editOverlay.classList.add("hidden");

/* ===============================
   DELETE
================================ */
window.askDelete = id => {
  deleteId = id;
  document.getElementById("confirmBox").classList.remove("hidden");
};

window.confirmDelete = async () => {
  await deleteDoc(doc(db, COLLECTION_NAME, deleteId));
  document.getElementById("confirmBox").classList.add("hidden");
  await loadBooks();
};

/* ===============================
   SHARE LOGIC (UNCHANGED)
================================ */
shareBtn.onclick = () => {
  shareOverlay.classList.remove("hidden");
  shareResult.classList.add("hidden");
};

closeShareBtn.onclick = () =>
  shareOverlay.classList.add("hidden");

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

    await setDoc(
      doc(db, SHARE_COLLECTION, pageId),
      {
        ownerUid: currentUser.uid,
        expiresAt,
        revoked: false,
        createdAt: serverTimestamp()
      }
    );

    const link =
      `${location.origin}/viewonly/fiction-view.html?page=${pageId}`;

    shareLinkInput.value = link;
    shareResult.classList.remove("hidden");
  };
});

copyShareBtn.onclick = () => {
  navigator.clipboard.writeText(shareLinkInput.value);
  copyShareBtn.textContent = "Copied!";
  setTimeout(() => (copyShareBtn.textContent = "Copy"), 1200);
};
