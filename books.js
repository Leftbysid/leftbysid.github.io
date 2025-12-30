import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");
const dateInput = document.getElementById("date");
const bookList = document.getElementById("bookList");
const form = document.getElementById("bookForm");
const toggleBtn = document.getElementById("toggleForm");

let currentUser = null;

// Toggle form
toggleBtn.onclick = () => {
  form.classList.toggle("hidden");
};

// Auth check
onAuthStateChanged(auth, user => {
  if (!user) {
    location.href = "index.html";
    return;
  }
  currentUser = user;
  loadBooks();
});

// Add book
window.addBook = async () => {
  const title = titleInput.value.trim();
  const author = authorInput.value.trim();
  const date = dateInput.value;

  if (!title || !author || !date) {
    alert("Fill all fields");
    return;
  }

  await addDoc(collection(db, "books"), {
    uid: currentUser.uid,
    title,
    author,
    date
  });

  titleInput.value = "";
  authorInput.value = "";
  dateInput.value = "";
};

// Load books
function loadBooks() {
  const q = query(
    collection(db, "books"),
    where("uid", "==", currentUser.uid)
  );

  onSnapshot(q, snapshot => {
    bookList.innerHTML = "";

    snapshot.forEach(doc => {
      const b = doc.data();

      bookList.innerHTML += `
        <div class="book">
          <h3>${b.title}</h3>
          <p>✍ ${b.author}</p>
          <p>📅 ${b.date}</p>
        </div>
      `;
    });
  });
}
