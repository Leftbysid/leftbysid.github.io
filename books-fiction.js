/* ===============================
   IMPORTS
================================ */
import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { requireAuth } from "./auth-guard.js";

requireAuth();

/* ===============================
   HELPERS
================================ */
function formatDateInput(value) {
  value = value.trim();
  if (!value) return "";
  if (/^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value;
}

/* ===============================
   🔥 CLOUDINARY UPLOAD
================================ */
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "books_upload");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dmkcoulcx/image/upload",
    {
      method: "POST",
      body: formData
    }
  );

  const data = await res.json();

  if (!data.secure_url) {
    console.error(data);
    throw new Error("Upload failed");
  }

  return data.secure_url;
}

/* ===============================
   CONFIG
================================ */
const COLLECTION_NAME = "books_fiction";

/* ===============================
   STATE
================================ */
let books = [];
let currentUser = null;
let editingId = null;
let deleteId = null;

let currentFilter = "all";
let sortMode = "recent";

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
const sortSelect = document.getElementById("sortSelect");

const totalCount = document.getElementById("totalCount");
const readCount = document.getElementById("readCount");
const unreadCount = document.getElementById("unreadCount");

const resultCount = document.getElementById("resultCount");

/* ===============================
   UI
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
   ADD BOOK (UPDATED)
================================ */
window.addBook = async () => {
  if (!titleInput.value || !authorInput.value) return;

  const file = document.getElementById("imageInput")?.files[0];

  let imageUrl = "";

  if (file) {
    try {
      imageUrl = await uploadImage(file);
    } catch (err) {
      alert("Image upload failed");
      return;
    }
  }

  await addDoc(collection(db, COLLECTION_NAME), {
    uid: currentUser.uid,
    title: titleInput.value.trim(),
    author: authorInput.value.trim(),
    category: categoryInput.value,
    date: formatDateInput(dateInput.value),
    image: imageUrl, // 🔥 NEW
    read: false,
    owned: false,
    createdAt: Date.now()
  });

  await loadBooks();

  bookForm.classList.add("hidden");

  titleInput.value = "";
  authorInput.value = "";
  categoryInput.value = "";
  dateInput.value = "";
  if (document.getElementById("imageInput"))
    document.getElementById("imageInput").value = "";
};

/* ===============================
   LOAD BOOKS
================================ */
async function loadBooks() {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);
  books = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  visibleCount = PAGE_SIZE;
  applyView();
}

/* ===============================
   VIEW LOGIC
================================ */
function applyView() {
  let list = [...books];

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

  switch (currentFilter) {
    case "owned": list = list.filter(b => b.owned); break;
    case "not-owned": list = list.filter(b => !b.owned); break;
    case "read": list = list.filter(b => b.read); break;
    case "not-read": list = list.filter(b => !b.read); break;
  }

  switch (sortMode) {
    case "recent":
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      break;
    case "title":
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;
    case "author":
      list.sort((a, b) => (a.author || "").localeCompare(b.author || ""));
      break;
    case "category":
      list.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      break;
    case "year":
      list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      break;
  }

  renderBooks(list.slice(0, visibleCount));
}

/* ===============================
   RENDER (UPDATED WITH IMAGE)
================================ */
function renderBooks(list) {
  let html = "";

  list.forEach(b => {
    const sortedCategory = (b.category || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");

    html += `
  <div class="book-row-wrapper">

    <!-- 🔥 OWNED ICON FIRST -->
    <span class="owned-icon ${b.owned ? "owned" : ""}">📘</span>

    <!-- COVER -->
    <div class="book-cover">
      ${
        b.image
          ? `<img src="${b.image}">`
          : `<div class="no-cover">🖕</div>`
      }
    </div>

    <!-- MAIN ROW -->
    <div class="book-row">
      <div class="book-main">
        <span class="book-title">${b.title}</span>
      </div>

      <div class="book-meta">
        <span class="book-author">${b.author}</span>
        <span class="book-genre">${sortedCategory}</span>
        <span class="book-year">${b.date || ""}</span>
      </div>

      <span class="status-badge ${b.read ? "read" : "unread"}">
        ${b.read ? "READ" : "UNREAD"}
      </span>
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

  bookList.innerHTML = html;

  totalCount.textContent = books.length;
  readCount.textContent = books.filter(b => b.read).length;
  unreadCount.textContent = books.filter(b => !b.read).length;
}

/* ===============================
   TOGGLES / EDIT / DELETE (FIXED)
================================ */

window.toggleRead = async (id, current) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    read: !current
  });

  // 🔥 update locally (no reload lag)
  const book = books.find(b => b.id === id);
  if (book) book.read = !current;

  applyView();
};

window.toggleOwned = async (id, value) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    owned: value
  });

  // 🔥 instant UI update
  const book = books.find(b => b.id === id);
  if (book) book.owned = value;

  applyView();
};

window.editBook = id => {
  const b = books.find(x => x.id === id);
  editingId = id;

  editTitle.value = b.title;
  editAuthor.value = b.author;
  editCategory.value = b.category || "";
  editDate.value = b.date || "";

  // 🔥 reset image input safely
  const imgInput = document.getElementById("editImage");
  if (imgInput) imgInput.value = "";

  editOverlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  const file = document.getElementById("editImage")?.files[0];

  let imageUrl = null;

  // 🔥 upload new image if selected
  if (file) {
    try {
      imageUrl = await uploadImage(file);
    } catch (err) {
      alert("Image upload failed");
      return;
    }
  }

  const updateData = {
    title: editTitle.value,
    author: editAuthor.value,
    category: editCategory.value,
    date: formatDateInput(editDate.value)
  };

  // 🔥 only update image if new one selected
  if (imageUrl) {
    updateData.image = imageUrl;
  }

  await updateDoc(doc(db, COLLECTION_NAME, editingId), updateData);

  editOverlay.classList.add("hidden");
  await loadBooks();
};

window.closeEdit = () => {
  editOverlay.classList.add("hidden");
};

window.askDelete = id => {
  deleteId = id;
  document.getElementById("confirmBox").classList.remove("hidden");
};

window.confirmDelete = async () => {
  await deleteDoc(doc(db, COLLECTION_NAME, deleteId));
  document.getElementById("confirmBox").classList.add("hidden");
  await loadBooks();
};

window.closeConfirm = () => {
  deleteId = null;
  document.getElementById("confirmBox").classList.add("hidden");
};

/* ===============================
   INFINITE SCROLL
================================ */
let isLoadingMore = false;

window.addEventListener("scroll", () => {
  if (isLoadingMore) return;

  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.body.offsetHeight - 200;

  if (scrollPosition >= threshold) {
    if (visibleCount < books.length) {
      isLoadingMore = true;

      visibleCount += PAGE_SIZE;
      applyView();

      setTimeout(() => {
        isLoadingMore = false;
      }, 200);
    }
  }
});
