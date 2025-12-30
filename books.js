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
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let books = [];
let editingId = null;
let currentUser = null;

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const bookList = document.getElementById("bookList");
const searchInput = document.getElementById("search");

const overlay = document.getElementById("editOverlay");
const editTitle = document.getElementById("editTitle");
const editAuthor = document.getElementById("editAuthor");
const editCategory = document.getElementById("editCategory");
const editDate = document.getElementById("editDate");

document.getElementById("toggleForm").onclick = () => {
  document.getElementById("bookForm").classList.toggle("hidden");
};

onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadBooks();
});

// ADD / UPDATE
window.addBook = async () => {
  if (!titleInput.value || !authorInput.value || !categoryInput.value || !dateInput.value)
    return alert("Fill all fields");

  if (editingId) {
    await updateDoc(doc(db, "books", editingId), {
      title: titleInput.value,
      author: authorInput.value,
      category: categoryInput.value,
      date: dateInput.value
    });
    editingId = null;
  } else {
    await addDoc(collection(db, "books"), {
      uid: currentUser.uid,
      title: titleInput.value,
      author: authorInput.value,
      category: categoryInput.value,
      date: dateInput.value
    });
  }

  titleInput.value = "";
  authorInput.value = "";
  categoryInput.value = "";
  dateInput.value = "";
};

// LOAD BOOKS
function loadBooks() {
  const q = query(collection(db, "books"), where("uid", "==", currentUser.uid));

  onSnapshot(q, snap => {
    books = [];
    snap.forEach(d => books.push({ id: d.id, ...d.data() }));
    renderBooks(books);
  });
}

// RENDER
function renderBooks(list) {
  bookList.innerHTML = "";
  list.forEach(b => {
    bookList.innerHTML += `
      <div class="book">
        <h3>${b.title}</h3>
        <p>✍ ${b.author}</p>
        <p>📁 ${b.category}</p>
        <p>📅 ${b.date}</p>
        <div class="book-actions">
          <button class="edit" onclick="editBook('${b.id}')">Edit</button>
          <button onclick="deleteBook('${b.id}')">Delete</button>
        </div>
      </div>
    `;
  });
}

// SEARCH
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  renderBooks(books.filter(b => b.title.toLowerCase().includes(q)));
};

// SORT
window.sortByName = () => {
  renderBooks([...books].sort((a, b) => a.title.localeCompare(b.title)));
};

window.sortByDate = () => {
  renderBooks([...books].sort((a, b) => new Date(b.date) - new Date(a.date)));
};

// EDIT
window.editBook = (id) => {
  const book = books.find(b => b.id === id);

  editTitle.value = book.title;
  editAuthor.value = book.author;
  editCategory.value = book.category;
  editDate.value = book.date;

  editingId = id;
  overlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  await updateDoc(doc(db, "books", editingId), {
    title: editTitle.value,
    author: editAuthor.value,
    category: editCategory.value,
    date: editDate.value
  });

  editingId = null;
  overlay.classList.add("hidden");
};

window.closeEdit = () => {
  overlay.classList.add("hidden");
};

// DELETE
window.deleteBook = async (id) => {
  if (confirm("Delete this book?")) {
    await deleteDoc(doc(db, "books", id));
  }
};
