import { db } from "../firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* =====================
   GET PAGE ID
===================== */
const params = new URLSearchParams(location.search);
const pageId = params.get("page");

if (!pageId) {
  document.body.innerHTML = "<h2>Invalid link</h2>";
  throw new Error("Missing page id");
}

/* =====================
   ELEMENTS
===================== */
const bookList = document.getElementById("bookList");
const searchInput = document.getElementById("search");

let books = [];

/* =====================
   VALIDATE SHARE PAGE
===================== */
const pageRef = doc(db, "books_fiction_pages_public", pageId);
const pageSnap = await getDoc(pageRef);

if (!pageSnap.exists()) {
  document.body.innerHTML = "<h2>Link not found</h2>";
  throw new Error("Invalid page");
}

const pageData = pageSnap.data();

if (pageData.revoked) {
  document.body.innerHTML = "<h2>Link revoked</h2>";
  throw new Error("Revoked");
}

/* =====================
   LOAD FICTION BOOKS
===================== */
const q = query(
  collection(db, "books_fiction"),
  where("uid", "==", pageData.ownerUid)
);

const snap = await getDocs(q);
books = snap.docs.map(d => d.data());

render(books);

/* =====================
   SEARCH
===================== */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  render(
    books.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.author.toLowerCase().includes(q) ||
      (b.category || "").toLowerCase().includes(q)
    )
  );
};

/* =====================
   RENDER (READ-ONLY)
===================== */
function render(list) {
  bookList.innerHTML = "";

  list.forEach(b => {
    bookList.innerHTML += `
      <div class="book-row-wrapper">
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
      </div>
    `;
  });
}
