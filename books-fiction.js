/* ===============================
   IMPORTS (MUST BE FIRST)
================================ */
import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { requireAuth } from "./auth-guard.js";

/* PDF */
const { jsPDF } = window.jspdf;

/* ===============================
   ROUTE GUARD
================================ */
requireAuth();

/* ===============================
   FIRESTORE COLLECTION
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

const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

/* ===============================
   UI INIT
================================ */
document.querySelector(".title").textContent = "📖 FICTION ARCHIVE";
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

  if (books.some(b =>
    b.title.toLowerCase() === newTitle &&
    b.author.toLowerCase() === newAuthor
  )) {
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

  bookForm.classList.add("hidden");
  titleInput.value = authorInput.value =
  categoryInput.value = dateInput.value = "";
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
   SEARCH
================================ */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  renderBooks(
    books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.category || "").toLowerCase().includes(q)
    )
  );
};

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
   EVENT DELEGATION (FIX)
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

  if (e.target.classList.contains("delete-btn")) {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  }
});

bookList.addEventListener("change", async e => {
  if (!e.target.classList.contains("owned-toggle")) return;
  const wrapper = e.target.closest(".book-row-wrapper");
  await updateDoc(
    doc(db, COLLECTION_NAME, wrapper.dataset.id),
    { owned: e.target.checked }
  );
});

/* ===============================
   EXPORTS (UNCHANGED)
================================ */
exportJsonBtn.onclick = () => {
  const data = {
    exportedAt: new Date().toISOString(),
    fiction: books
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
