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
let deleteId = null;
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {

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

  document.getElementById("confirmBox").style.display = "none";
  bookForm.style.display = "none";

  // Toggle add form
  document.getElementById("toggleForm").onclick = () => {
    bookForm.style.display =
      bookForm.style.display === "none" ? "block" : "none";
  };

  // Auth
  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    currentUser = user;
    loadBooks();
  });

  // Add / Update
  window.addBook = async () => {
    if (!titleInput.value || !authorInput.value) return;

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

    bookForm.style.display = "none";
    titleInput.value = "";
    authorInput.value = "";
    categoryInput.value = "";
    dateInput.value = "";
  };

  // Load books
  function loadBooks() {
    const q = query(collection(db, "books"), where("uid", "==", currentUser.uid));
    onSnapshot(q, snap => {
      books = [];
      snap.forEach(d => books.push({ id: d.id, ...d.data() }));
      renderBooks(books);
    });
  }

  // ✅ UPDATED RENDER
  function renderBooks(list) {
    bookList.innerHTML = "";

    list.forEach(b => {
      bookList.innerHTML += `
        <div class="book-card">
          <div class="book-top">
            <div>
              <div class="book-title">${b.title}</div>
              <div class="book-author">by ${b.author}</div>
            </div>

            <div class="book-actions">
              <button onclick="editBook('${b.id}')">✏️</button>
              <button onclick="askDelete('${b.id}')">🗑️</button>
            </div>
          </div>

          <div class="book-meta">
            📁 ${b.category} &nbsp; | &nbsp; 📅 ${b.date}
          </div>
        </div>
      `;
    });
  }

  // Search
  searchInput.oninput = () => {
    const q = searchInput.value.toLowerCase();
    renderBooks(books.filter(b => b.title.toLowerCase().includes(q)));
  };

  // Sort
  window.sortByName = () =>
    renderBooks([...books].sort((a, b) => a.title.localeCompare(b.title)));

  window.sortByDate = () =>
    renderBooks([...books].sort((a, b) => new Date(a.date) - new Date(b.date)));

  // Edit popup
  window.editBook = (id) => {
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
    editingId = null;
    editOverlay.classList.add("hidden");
  };

  window.closeEdit = () => {
    editOverlay.classList.add("hidden");
  };

  // Delete
  window.askDelete = id => {
    deleteId = id;
    document.getElementById("confirmBox").style.display = "flex";
  };

  window.confirmDelete = async () => {
    await deleteDoc(doc(db, "books", deleteId));
    closeConfirm();
  };

  window.closeConfirm = () => {
    deleteId = null;
    document.getElementById("confirmBox").style.display = "none";
  };
});
