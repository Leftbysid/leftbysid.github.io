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

const editOverlay = document.getElementById("editOverlay");
const editTitle = document.getElementById("editTitle");
const editAuthor = document.getElementById("editAuthor");
const editCategory = document.getElementById("editCategory");
const editDate = document.getElementById("editDate");

/* EXPORT BUTTONS */
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

  const exists = books.some(b =>
    (b.title || "").toLowerCase() === newTitle &&
    (b.author || "").toLowerCase() === newAuthor
  );

  if (exists) {
    alert("This book already exists in your library.");
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
  titleInput.value = "";
  authorInput.value = "";
  categoryInput.value = "";
  dateInput.value = "";
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
   VIEW LOGIC
================================ */
function applyView() {
  let list = [...books];

  switch (currentFilter) {
    case "owned": list = list.filter(b => b.owned); break;
    case "not-owned": list = list.filter(b => !b.owned); break;
    case "read": list = list.filter(b => b.read); break;
    case "not-read": list = list.filter(b => !b.read); break;
  }

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  renderBooks(list);
}

/* ===============================
   CONTROLS
================================ */
recentBtn.onclick = () => {
  sortMode = "recent";
  currentFilter = "all";
  filterSelect.value = "all";
  applyView();
};

filterSelect.onchange = () => {
  currentFilter = filterSelect.value;
  sortMode = "none";
  applyView();
};

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
    bookList.innerHTML += `
      <div class="book-row-wrapper">
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
          <input type="checkbox"
            ${b.owned ? "checked" : ""}
            onchange="toggleOwned('${b.id}', this.checked)">
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
   TOGGLES
================================ */
window.toggleRead = async (id, current) =>
  updateDoc(doc(db, COLLECTION_NAME, id), { read: !current });

window.toggleOwned = async (id, value) =>
  updateDoc(doc(db, COLLECTION_NAME, id), { owned: value });

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

/* ===============================
   EXPORT JSON
================================ */
exportJsonBtn.onclick = () => {
  const data = {
    exportedAt: new Date().toISOString(),
    fiction: books.map(({ id, uid, ...rest }) => rest)
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fiction-books.json";
  a.click();
};

/* ===============================
   EXPORT PDF
================================ */
exportPdfBtn.onclick = () => {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  let y = 12;

  pdf.text("FICTION BOOKS", 10, y);
  y += 10;

  books.forEach((b, i) => {
    const line = `${i + 1}. ${b.title} — ${b.author}`;
    pdf.text(line, 10, y);
    y += 8;
    if (y > 280) {
      pdf.addPage();
      y = 12;
    }
  });

  pdf.save("fiction-books.pdf");
};

/* =====================
   SHARE FICTION PAGE
===================== */
import {
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const shareBtn = document.getElementById("sharePageBtn");
const overlay = document.getElementById("shareOverlay");
const closeBtn = document.getElementById("closeShare");
const shareResult = document.getElementById("shareResult");
const shareLinkInput = document.getElementById("shareLink");
const copyBtn = document.getElementById("copyShareLink");

const shareButtons = document.querySelectorAll(".share-actions button");

let activeShareId = null;

/* open / close */
shareBtn.onclick = () => {
  overlay.classList.remove("hidden");
  shareResult.classList.add("hidden");
};

closeBtn.onclick = () => {
  overlay.classList.add("hidden");
};

/* actions */
shareButtons.forEach(btn => {
  btn.onclick = async () => {
    const mode = btn.dataset.mode;

    // revoke
    if (mode === "revoke") {
      if (!activeShareId) {
        alert("No active link");
        return;
      }

      await updateDoc(
        doc(db, "books_fiction_pages_public", activeShareId),
        { revoked: true }
      );

      shareResult.classList.add("hidden");
      activeShareId = null;
      alert("Link revoked");
      return;
    }

    // create
    const pageId = crypto.randomUUID();
    activeShareId = pageId;

    const expiresAt =
      mode === "24h"
        ? Timestamp.fromMillis(Date.now() + 24 * 60 * 60 * 1000)
        : null;

    await setDoc(
      doc(db, "books_fiction_pages_public", pageId),
      {
        ownerUid: currentUser.uid,
        expiresAt,
        revoked: false,
        createdAt: serverTimestamp()
      }
    );

    const link =
      `${location.origin}/viewonly/fiction-view.html?page=${pageId}`;

    // 🔥 THIS WAS MISSING
    shareLinkInput.value = link;
    shareResult.classList.remove("hidden");
  };
});

/* copy */
copyBtn.onclick = () => {
  navigator.clipboard.writeText(shareLinkInput.value);
  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
};


