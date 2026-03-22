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
  onSnapshot,
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
   FIRESTORE COLLECTIONS
================================ */
const COLLECTION_NAME = "books_nonfiction";
const SHARE_COLLECTION = "books_nonfiction_pages_public";

/* ===============================
   STATE
================================ */
let books = [];
let currentUser = null;
let editingId = null;
let deleteId = null;

let currentFilter = "all";
let sortMode = "recent";

let activeShareId = null;

/* ✅ PAGINATION + SEARCH */
const PAGE_SIZE = 20;
let visibleCount = PAGE_SIZE;
let searchQuery = "";

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

/* ✅ LOAD MORE BUTTON */
const loadMoreBtn = document.getElementById("loadMoreBooks");

if (loadMoreBtn) {
  loadMoreBtn.onclick = () => {
    visibleCount += PAGE_SIZE;
    applyView();
  };
}

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
    category: categoryInput.value
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(", "),
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

    visibleCount = PAGE_SIZE; // reset pagination

    applyView();
  });
}

/* ===============================
   VIEW LOGIC (FINAL)
================================ */
function applyView() {
  let list = [...books];

  switch (currentFilter) {
    case "owned": list = list.filter(b => b.owned); break;
    case "not-owned": list = list.filter(b => !b.owned); break;
    case "read": list = list.filter(b => b.read); break;
    case "not-read": list = list.filter(b => !b.read); break;
  }

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  /* 🔍 EXACT QUOTES SEARCH */
  if (searchQuery) {
    const isAuthorOnly = searchQuery.startsWith("@");
    const term = isAuthorOnly ? searchQuery.slice(1) : searchQuery;

    list = list.filter(b => {
      const title = (b.title || "").toLowerCase();
      const author = (b.author || "").toLowerCase();

      return isAuthorOnly
        ? author.includes(term)
        : title.includes(term) || author.includes(term);
    });
  }

  const visible = searchQuery
    ? list
    : list.slice(0, visibleCount);

  renderBooks(visible);

  if (loadMoreBtn) {
    loadMoreBtn.classList.toggle(
      "hidden",
      !!searchQuery || list.length <= visibleCount
    );
  }
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

searchInput.oninput = () => {
  searchQuery = searchInput.value.trim().toLowerCase();
  visibleCount = PAGE_SIZE;
  applyView();
};

/* ===============================
   RENDER
================================ */
function renderBooks(list) {
  bookList.innerHTML = "";

  list.forEach(b => {
    const sortedCategory = (b.category || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");

    bookList.innerHTML += `
      <div class="book-row-wrapper">

        <span class="owned-icon ${b.owned ? "owned" : ""}">📕</span>

        <div class="book-row ${b.read ? "read" : ""}">
          <div>
            <span class="book-title">${b.title}</span>
            <span class="book-author">— ${b.author}</span>
            <span class="status-badge ${b.read ? "read" : "unread"}">
              ${b.read ? "READ" : "UNREAD"}
            </span>
          </div>
          <div>
            <span>${sortedCategory}</span><br>
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

  totalCount.textContent = books.length;
  readCount.textContent = books.filter(b => b.read).length;
  unreadCount.textContent = books.filter(b => !b.read).length;
}

/* ===============================
   TOGGLES / EDIT / DELETE / EXPORT / SHARE (UNCHANGED)
================================ */
