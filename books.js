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

let currentUser = null;
let books = [];
let editingId = null;

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");
const bookList = document.getElementById("bookList");
const form = document.getElementById("bookForm");

// Toggle form
document.getElementById("toggleForm").onclick = () => {
  form.classList.toggle("hidden");
};

// Auth check
onAuthStateChanged(auth, user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }
  currentUser = user;
  loadBooks();
});

// ADD or UPDATE book
window.addBook = async () => {
  if (!titleInput.value || !authorInput.value || !categoryInput.value || !dateInput.value) {
    alert("Fill all fields");
    return;
  }

  if (editingId) {
    // UPDATE
    await updateDoc(doc(db, "books", editingId), {
      title: titleInput.value,
      author: authorInput.value,
      category: categoryInput.value,
      date: dateInput.value
    });

    editingId = null;
  } else {
    // ADD NEW
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
  const q = query(
    collection(db, "books"),
    where("uid", "==", currentUser.uid)
  );

  onSnapshot(q, snapshot => {
    books = [];
    snapshot.forEach(docu => {
      books.push({ id: docu.id, ...docu.data() });
    });
    renderBooks(books);
  });
}

// RENDER BOOKS
function renderBooks(data) {
  bookList.innerHTML = "";

  data.forEach(b => {
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

// EDIT
window.editBook = (id) => {
  const book = books.find(b => b.id === id);

  titleInput.value = book.title;
  authorInput.value = book.author;
  categoryInput.value = book.category;
  dateInput.value = book.date;

  editingId = id;
  form.classList.remove("hidden");
};

// DELETE
window.deleteBook = async (id) => {
  if (confirm("Delete this book?")) {
    await deleteDoc(doc(db, "books", id));
  }
};
