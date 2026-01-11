/* ===============================
   IMPORTS (MUST BE FIRST)
================================ */
import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { requireAuth } from "./auth-guard.js";

/* ===============================
   ROUTE GUARD
================================ */
requireAuth();

/* ===============================
   FIRESTORE COLLECTION
================================ */
const COLLECTION_NAME = "books_nonfiction";

/* ===============================
   STATE
================================ */
let books = [];
let editingId = null;
let deleteId = null;
let currentUser = null;

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

const totalCount = document.getElementById("totalCount");
const readCount = document.getElementById("readCount");
const unreadCount = document.getElementById("unreadCount");

const editOverlay = document.getElementById("editOverlay");
const editTitle = document.getElementById("editTitle");
const editAuthor = document.getElementById("editAuthor");
const editCategory = document.getElementById("editCategory");
const editDate = document.getElementById("editDate");

/* ===============================
   UI INIT
================================ */
document.querySelector(".title").textContent = "📖 NON-FICTION ARCHIVE";

document.getElementById("toggleForm").onclick =
  () => bookForm.classList.toggle("hidden");

/* ===============================
   AUTH
================================ */
onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadBooks();
});

/* ===============================
   ADD BOOK
================================ */
window.addBook = async () => {
  if (!titleInput.value || !authorInput.value) return;

  const exists = books.some(b =>
    b.title.toLowerCase() === titleInput.value.toLowerCase() &&
    b.author.toLowerCase() === authorInput.value.toLowerCase()
  );

  if (exists) {
    alert("This book already exists.");
    return;
  }

  await addDoc(collection(db, COLLECTION_NAME), {
    uid: currentUser.uid,
    title: titleInput.value,
    author: authorInput.value,
    category: categoryInput ? categoryInput.value : "",
    date: dateInput.value,
    read: false
  });

  bookForm.classList.add("hidden");
  titleInput.value = authorInput.value = dateInput.value = "";
  if (categoryInput) categoryInput.value = "";
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
    renderBooks(books);
  });
}

/* ===============================
   RENDER
================================ */
function renderBooks(list) {
  bookList.innerHTML = "";

  list.forEach(b => {
    bookList.innerHTML += `
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
        <div class="book-actions">
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
   SORT
================================ */
window.sortByName = () =>
  renderBooks([...books].sort((a,b)=>a.title.localeCompare(b.title)));

window.sortByDate = () =>
  renderBooks([...books].sort((a,b)=>new Date(b.date)-new Date(a.date)));

/* ===============================
   TOGGLE READ
================================ */
window.toggleRead = async (id, current) =>
  updateDoc(doc(db, COLLECTION_NAME, id), { read: !current });

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
  closeConfirm();
};

window.closeConfirm = () =>
  document.getElementById("confirmBox").classList.add("hidden");

