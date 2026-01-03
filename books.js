import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let books = [];
let editingId = null;
let deleteId = null;
let currentUser = null;

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const bookList = document.getElementById("bookList");
const searchInput = document.getElementById("search");
const bookForm = document.getElementById("bookForm");

const editOverlay = document.getElementById("editOverlay");
const editTitle = document.getElementById("editTitle");
const editAuthor = document.getElementById("editAuthor");
const editCategory = document.getElementById("editCategory");
const editDate = document.getElementById("editDate");

document.getElementById("toggleForm").onclick = () =>
  bookForm.classList.toggle("hidden");

onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadBooks();
});

window.addBook = async () => {
  if (!titleInput.value || !authorInput.value) return;

  const exists = books.some(b =>
    b.title.toLowerCase() === titleInput.value.toLowerCase() &&
    b.author.toLowerCase() === authorInput.value.toLowerCase()
  );

  if (exists && !editingId) {
    alert("This book already exists.");
    return;
  }

  await addDoc(collection(db, "books"), {
    uid: currentUser.uid,
    title: titleInput.value,
    author: authorInput.value,
    category: categoryInput.value,
    date: dateInput.value,
    read: false
  });

  bookForm.classList.add("hidden");
  titleInput.value = authorInput.value = categoryInput.value = dateInput.value = "";
};

function loadBooks() {
  const q = query(collection(db, "books"), where("uid", "==", currentUser.uid));
  onSnapshot(q, snap => {
    books = [];
    snap.forEach(d => books.push({ id: d.id, ...d.data() }));
    renderBooks(books);
  });
}

function renderBooks(list) {
  bookList.innerHTML = "";
  list.forEach(b => {
    bookList.innerHTML += `
      <div class="book-row ${b.read ? "read" : ""}">
        <div class="book-main">
          <span class="book-title">${b.title}</span>
          <span class="book-author">— ${b.author}</span>
        </div>

        <div class="book-meta">
          <span>${b.category}</span>
          <span>${b.date}</span>
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
}

searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  renderBooks(books.filter(b => b.title.toLowerCase().includes(q)));
};

window.sortByName = () =>
  renderBooks([...books].sort((a, b) => a.title.localeCompare(b.title)));

window.sortByDate = () =>
  renderBooks([...books].sort((a, b) => new Date(b.date) - new Date(a.date)));

window.toggleRead = async (id, current) => {
  await updateDoc(doc(db, "books", id), { read: !current });
};

window.editBook = id => {
  const b = books.find(x => x.id === id);
  editTitle.value = b.title;
  editAuthor.value = b.author;
  editCategory.value = b.category;
  editDate.value = b.date;
  editingId = id;
  editOverlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  await updateDoc(doc(db, "books", editingId), {
    title: editTitle.value,
    author: editAuthor.value,
    category: editCategory.value,
    date: editDate.value
  });
  editOverlay.classList.add("hidden");
};

window.closeEdit = () => editOverlay.classList.add("hidden");

window.askDelete = id => {
  deleteId = id;
  document.getElementById("confirmBox").classList.remove("hidden");
};

window.confirmDelete = async () => {
  await deleteDoc(doc(db, "books", deleteId));
  closeConfirm();
};

window.closeConfirm = () =>
  document.getElementById("confirmBox").classList.add("hidden");
// Close add form after auth load (safety)
window.addEventListener("DOMContentLoaded", () => {
  bookForm.classList.add("hidden");
});
