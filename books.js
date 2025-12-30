import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let books = [];
let currentUser = null;

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const bookList = document.getElementById("bookList");
const searchInput = document.getElementById("search");

document.getElementById("toggleForm").onclick = () => {
  document.getElementById("bookForm").classList.toggle("hidden");
};

onAuthStateChanged(auth, user => {
  if (!user) return location.href = "index.html";
  currentUser = user;
  loadBooks();
});

async function loadBooks() {
  const q = query(collection(db, "books"), where("uid", "==", currentUser.uid));
  onSnapshot(q, snap => {
    books = [];
    snap.forEach(d => books.push({ id: d.id, ...d.data() }));
    renderBooks(books);
  });
}

window.addBook = async () => {
  if (!titleInput.value || !authorInput.value || !categoryInput.value || !dateInput.value)
    return alert("Fill all fields");

  await addDoc(collection(db, "books"), {
    uid: currentUser.uid,
    title: titleInput.value,
    author: authorInput.value,
    category: categoryInput.value,
    date: dateInput.value
  });

  titleInput.value = "";
  authorInput.value = "";
  categoryInput.value = "";
  dateInput.value = "";
};

function renderBooks(data) {
  bookList.innerHTML = "";
  data.forEach(b => {
    bookList.innerHTML += `
      <div class="book">
        <h3>${b.title}</h3>
        <small>✍ ${b.author} | 📁 ${b.category}</small>
        <p>📅 ${b.date}</p>

        <div class="book-actions">
          <button class="edit" onclick="editBook('${b.id}')">Edit</button>
          <button onclick="deleteBook('${b.id}')">Delete</button>
        </div>
      </div>
    `;
  });
}

window.deleteBook = async (id) => {
  await deleteDoc(doc(db, "books", id));
};

window.editBook = (id) => {
  const book = books.find(b => b.id === id);
  titleInput.value = book.title;
  authorInput.value = book.author;
  categoryInput.value = book.category;
  dateInput.value = book.date;

  deleteBook(id);
};

// SEARCH
searchInput.oninput = () => {
  const value = searchInput.value.toLowerCase();
  renderBooks(books.filter(b => b.title.toLowerCase().includes(value)));
};

// SORT
window.sortByName = () => {
  renderBooks([...books].sort((a, b) => a.title.localeCompare(b.title)));
};

window.sortByDate = () => {
  renderBooks([...books].sort((a, b) => new Date(b.date) - new Date(a.date)));
};
