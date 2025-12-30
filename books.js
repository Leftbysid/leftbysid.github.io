import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const booksRef = collection(db, "books");

window.addBook = async () => {
  const title = titleInput.value.trim();
  const author = authorInput.value.trim();
  const cover = cover.value.trim();
  const date = date.value;

  if (!title || !author || !date) {
    alert("Fill all fields");
    return;
  }

  await addDoc(booksRef, {
    uid: auth.currentUser.uid,
    title,
    author,
    cover,
    date
  });

  titleInput.value = "";
  authorInput.value = "";
  cover.value = "";
  date.value = "";
};

const titleInput = document.getElementById("title");
const authorInput = document.getElementById("author");

const loadBooks = () => {
  const q = query(booksRef, where("uid", "==", auth.currentUser.uid));

  onSnapshot(q, snapshot => {
    bookList.innerHTML = "";

    snapshot.forEach(doc => {
      const b = doc.data();

      bookList.innerHTML += `
        <div class="book">
          <img src="${b.cover || 'https://via.placeholder.com/80x110'}">
          <div class="book-info">
            <h3>${b.title}</h3>
            <p>✍ ${b.author}</p>
            <p>📅 ${b.date}</p>
          </div>
        </div>
      `;
    });
  });
};

loadBooks();
