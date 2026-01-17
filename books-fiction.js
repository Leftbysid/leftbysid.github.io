/* ===============================
   IMPORTS
================================ */
import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { requireAuth } from "./auth-guard.js";

const { jsPDF } = window.jspdf;

requireAuth();

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

/* ===============================
   ELEMENTS
================================ */
const bookList = document.getElementById("bookList");
const searchInput = document.getElementById("search");
const bookForm = document.getElementById("bookForm");

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

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

const confirmBox = document.getElementById("confirmBox");

const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

/* ===============================
   AUTH
================================ */
onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUser = user;
  loadBooks();
});

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

  if (currentFilter === "owned") list = list.filter(b => b.owned);
  if (currentFilter === "not-owned") list = list.filter(b => !b.owned);
  if (currentFilter === "read") list = list.filter(b => b.read);
  if (currentFilter === "not-read") list = list.filter(b => !b.read);

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  renderBooks(list);
}

/* ===============================
   RENDER
================================ */
function renderBooks(list) {
  bookList.innerHTML = "";

  list.forEach(b => {
    bookList.insertAdjacentHTML("beforeend", `
      <div class="book-row-wrapper" data-id="${b.id}">
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
          <input type="checkbox" class="owned-toggle" ${b.owned ? "checked" : ""}>
          <button class="read-toggle">${b.read ? "✅" : "⬜"}</button>
          <button class="edit-btn">✏️</button>
          <button class="delete-btn">🗑️</button>
        </div>
      </div>
    `);
  });

  totalCount.textContent = list.length;
  readCount.textContent = list.filter(b => b.read).length;
  unreadCount.textContent = list.filter(b => !b.read).length;
}

/* ===============================
   EVENTS (SAFE)
================================ */
bookList.addEventListener("click", async e => {
  const wrapper = e.target.closest(".book-row-wrapper");
  if (!wrapper) return;

  const id = wrapper.dataset.id;
  const book = books.find(b => b.id === id);
  if (!book) return;

  if (e.target.classList.contains("read-toggle")) {
    await updateDoc(doc(db, COLLECTION_NAME, id), { read: !book.read });
  }

  if (e.target.classList.contains("edit-btn")) {
    editingId = id;
    editTitle.value = book.title;
    editAuthor.value = book.author;
    editCategory.value = book.category || "";
    editDate.value = book.date || "";
    editOverlay.classList.remove("hidden");
  }

  if (e.target.classList.contains("delete-btn")) {
    deleteId = id;
    confirmBox.classList.remove("hidden");
  }
});

bookList.addEventListener("change", async e => {
  if (!e.target.classList.contains("owned-toggle")) return;

  const wrapper = e.target.closest(".book-row-wrapper");
  if (!wrapper) return;

  await updateDoc(
    doc(db, COLLECTION_NAME, wrapper.dataset.id),
    { owned: e.target.checked }
  );
});

/* ===============================
   EDIT
================================ */
window.saveEdit = async () => {
  if (!editingId) return;

  await updateDoc(doc(db, COLLECTION_NAME, editingId), {
    title: editTitle.value.trim(),
    author: editAuthor.value.trim(),
    category: editCategory.value.trim(),
    date: editDate.value
  });

  editOverlay.classList.add("hidden");
  editingId = null;
};

window.closeEdit = () => {
  editOverlay.classList.add("hidden");
  editingId = null;
};

/* ===============================
   DELETE
================================ */
window.confirmDelete = async () => {
  if (!deleteId) return;

  await deleteDoc(doc(db, COLLECTION_NAME, deleteId));
  confirmBox.classList.add("hidden");
  deleteId = null;
};

window.closeConfirm = () => {
  confirmBox.classList.add("hidden");
  deleteId = null;
};

/* ===============================
   EXPORTS
================================ */
exportJsonBtn.onclick = () => {
  const data = {
    exportedAt: new Date().toISOString(),
    fiction: books.map(b => ({
      title: b.title,
      author: b.author,
      category: b.category || "",
      date: b.date || "",
      read: b.read,
      owned: b.owned
    }))
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fiction-books.json";
  a.click();
};

exportPdfBtn.onclick = () => {
  const pdf = new jsPDF();
  let y = 10;
  pdf.text("Fiction Library", 10, y);
  y += 10;

  books.forEach(b => {
    if (y > 280) { pdf.addPage(); y = 10; }
    pdf.text(`• ${b.title} — ${b.author}`, 10, y);
    y += 6;
  });

  pdf.save("fiction-books.pdf");
};
