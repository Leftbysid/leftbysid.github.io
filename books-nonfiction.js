/* ===============================
   IMPORTS (MUST BE FIRST)
================================ */
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

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { requireAuth } from "./auth-guard.js";

requireAuth();

/* ===============================
   DATE HELPER
================================ */
function formatDateInput(value) {
  value = value.trim();
  if (!value) return "";
  if (/^\d{4}$/.test(value)) return value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return value;
}

/* ===============================
   🔥 CLOUDINARY UPLOAD
================================ */
async function uploadImage(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "books_upload");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dmkcoulcx/image/upload",
    { method: "POST", body: formData }
  );

  const data = await res.json();

  if (!data.secure_url) throw new Error("Upload failed");
  return data.secure_url;
}

/* ===============================
   CONFIG
================================ */
const COLLECTION_NAME = "books_nonfiction";

/* ===============================
   STATE
================================ */
let books = [];
let currentUser = null;
let editingId = null;
let deleteId = null;

let currentFilter = "all";
let sortMode = "recent";

const PAGE_SIZE = 20;
let visibleCount = PAGE_SIZE;
let searchQuery = "";

let removeImage = false;

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
const sortSelect = document.getElementById("sortSelect");

const totalCount = document.getElementById("totalCount");
const readCount = document.getElementById("readCount");
const unreadCount = document.getElementById("unreadCount");

const resultCount = document.getElementById("resultCount");

const editOverlay = document.getElementById("editOverlay");
const editTitle = document.getElementById("editTitle");
const editAuthor = document.getElementById("editAuthor");
const editCategory = document.getElementById("editCategory");
const editDate = document.getElementById("editDate");

/* ===============================
   UI
================================ */
document.getElementById("toggleForm").onclick =
  () => bookForm.classList.toggle("hidden");

/* ===============================
   CONTROLS (RESTORED)
================================ */

// RECENT BUTTON
recentBtn.onclick = () => {
  sortMode = "recent";
  currentFilter = "all";
  filterSelect.value = "all";
  applyView();
};

// FILTER
filterSelect.onchange = () => {
  currentFilter = filterSelect.value;
  visibleCount = PAGE_SIZE;
  applyView();
};

// SORT
if (sortSelect) {
  sortSelect.onchange = () => {
    sortMode = sortSelect.value;
    applyView();
  };
}

// SEARCH (DEBOUNCED)
let searchTimer = null;

searchInput.oninput = () => {
  clearTimeout(searchTimer);

  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim().toLowerCase();
    visibleCount = PAGE_SIZE;
    window.scrollTo(0, 0);
    applyView();
  }, 250);
};

/* ===============================
   AUTH
================================ */
onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUser = user;
  loadBooks();
});

/* ===============================
   ADD BOOK (WITH IMAGE)
================================ */
window.addBook = async () => {
  if (!titleInput.value || !authorInput.value) return;

  const newTitle = titleInput.value.trim().toLowerCase();
  const newAuthor = authorInput.value.trim().toLowerCase();

  const exists = books.some(b =>
    b.title.toLowerCase() === newTitle &&
    b.author.toLowerCase() === newAuthor
  );

  if (exists) return alert("This book already exists.");

  const file = document.getElementById("imageInput")?.files[0];
  let imageUrl = "";

  if (file) {
    try {
      imageUrl = await uploadImage(file);
    } catch {
      return alert("Image upload failed");
    }
  }

// ===== GENERATE CODE =====
const prefix = "NF";

let numbers = books
  .map(b => {
    if (!b.code) return null;
    return parseInt(b.code.replace(prefix, ""));
  })
  .filter(n => !isNaN(n));

// sort
numbers.sort((a, b) => a - b);

let max = numbers.length ? numbers[numbers.length - 1] : 0;

// check if last number is missing
const lastExists = numbers.includes(max);

// check for gaps
const hasGap = numbers.some((num, i) => num !== i + 1);

let nextNumber;

if (max === 0) {
  nextNumber = 1;
}
else if (!lastExists) {
  nextNumber = max; // reuse last if deleted
}
else if (hasGap) {
  nextNumber = max + 1; // gap exists → skip forward
}
else {
  nextNumber = max + 1; // normal case
}

const bookCode = prefix + nextNumber;
   
// ===== SAVE BOOK =====
await addDoc(collection(db, COLLECTION_NAME), {
  uid: currentUser.uid,
  title: titleInput.value.trim(),
  author: authorInput.value.trim(),
  category: categoryInput.value,
  date: formatDateInput(dateInput.value),
  image: imageUrl,
  read: false,
  owned: false,
  createdAt: Date.now(),

  code: bookCode // 🔥 THIS WAS MISSING
});

  bookForm.classList.add("hidden");
};

/* ===============================
   LOAD BOOKS (UNCHANGED)
================================ */
function loadBooks() {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("uid", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {
    books = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    visibleCount = PAGE_SIZE;
    applyView();
  });
}

/* ===============================
   VIEW (UNCHANGED)
================================ */
function applyView() {
  let list = [...books];

  /* SEARCH */
  if (searchQuery) {
    const isAuthorOnly = searchQuery.startsWith("@");
    const term = isAuthorOnly ? searchQuery.slice(1) : searchQuery;

    list = list.filter(b => {
      const title = (b.title || "").toLowerCase();
      const author = (b.author || "").toLowerCase();

      return isAuthorOnly
        ? author.includes(term)
        : title.includes(term) || author.includes(term);
    });
  }

  /* FILTER */
  switch (currentFilter) {
    case "owned": list = list.filter(b => b.owned); break;
    case "not-owned": list = list.filter(b => !b.owned); break;
    case "read": list = list.filter(b => b.read); break;
    case "not-read": list = list.filter(b => !b.read); break;
  }

  /* SORT */
  switch (sortMode) {
    case "recent":
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      break;

    case "title":
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
      break;

    case "author":
      list.sort((a, b) => (a.author || "").localeCompare(b.author || ""));
      break;

    case "category":
      list.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
      break;

    case "year":
      list.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      break;
  }

  const visible = list.slice(0, visibleCount);
  renderBooks(visible);

  if (resultCount) {
    resultCount.innerText = searchQuery
      ? `Showing ${visible.length} of ${list.length} results`
      : "";
  }
}
/* ===============================
   RENDER (SAME UI AS FICTION)
================================ */
function renderBooks(list) {
  let html = "";

  list.forEach(b => {
    const sortedCategory = (b.category || "")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b))
      .join(", ");

html += `
  <div class="book-row-wrapper">

    <span class="owned-icon ${b.owned ? "owned" : ""}">📕</span>

    <div class="book-cover">
      ${
        b.image
          ? `<img src="${b.image}" loading="lazy">`
          : `<div class="no-cover">💀</div>`
      }
    </div>

    <div class="book-row">

      <div class="book-main">
        <div class="book-title">${b.title}</div>
        <div class="book-author">${b.author}</div>
      </div>

      <div class="book-meta">
        <div class="meta-grid">
          <span class="book-genre">${sortedCategory}</span>

          <div class="meta-right">
            <span class="book-year">${b.date || ""}</span>
            <span class="book-code">${b.code || ""}</span>
          </div>
        </div>
      </div>

      <span class="status-badge ${b.read ? "read" : "unread"}">
        ${b.read ? "READ" : "UNREAD"}
      </span>

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

  bookList.innerHTML = html;
  totalCount.textContent = books.length;
  readCount.textContent = books.filter(b => b.read).length;
  unreadCount.textContent = books.filter(b => !b.read).length; 
}

/* ===============================
   TOGGLES / EDIT / DELETE
================================ */

window.toggleRead = async (id, current) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    read: !current
  });

  const book = books.find(b => b.id === id);
  if (book) book.read = !current;

  applyView();
};

window.toggleOwned = async (id, value) => {
  await updateDoc(doc(db, COLLECTION_NAME, id), {
    owned: value
  });

  const book = books.find(b => b.id === id);
  if (book) book.owned = value;

  applyView();
};

window.editBook = id => {
  const b = books.find(x => x.id === id);
  editingId = id;

  removeImage = false;

  editTitle.value = b.title;
  editAuthor.value = b.author;
  editCategory.value = b.category || "";
  editDate.value = b.date || "";

  const imgInput = document.getElementById("editImage");
  if (imgInput) imgInput.value = "";

  editOverlay.classList.remove("hidden");
};

window.removeEditImage = () => {
  removeImage = true;
  const imgInput = document.getElementById("editImage");
  if (imgInput) imgInput.value = "";
};

window.saveEdit = async () => {
  const file = document.getElementById("editImage")?.files[0];

  let imageUrl = null;

  if (file) {
    try {
      imageUrl = await uploadImage(file);
    } catch (err) {
      alert("Image upload failed");
      return;
    }
  }

  const updateData = {
    title: editTitle.value,
    author: editAuthor.value,
    category: editCategory.value,
    date: formatDateInput(editDate.value)
  };

  if (removeImage) {
    updateData.image = "";
  } else if (imageUrl) {
    updateData.image = imageUrl;
  }

  await updateDoc(doc(db, COLLECTION_NAME, editingId), updateData);

  editOverlay.classList.add("hidden");
  await loadBooks();
};

window.closeEdit = () => {
  editOverlay.classList.add("hidden");
};

window.askDelete = id => {
  deleteId = id;
  document.getElementById("confirmBox").classList.remove("hidden");
};

window.confirmDelete = async () => {
  await deleteDoc(doc(db, COLLECTION_NAME, deleteId));
  document.getElementById("confirmBox").classList.add("hidden");
  await loadBooks();
};

window.closeConfirm = () => {
  deleteId = null;
  document.getElementById("confirmBox").classList.add("hidden");
};


/* ===============================
   INFINITE SCROLL
================================ */
let isLoadingMore = false;

window.addEventListener("scroll", () => {
  if (isLoadingMore) return;

  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.body.offsetHeight - 200;

  if (scrollPosition >= threshold) {
    if (visibleCount < books.length) {
      isLoadingMore = true;

      visibleCount += PAGE_SIZE;
      applyView();

      setTimeout(() => {
        isLoadingMore = false;
      }, 200);
    }
  }
});

window.backfillCodes = async () => {
  if (!currentUser) {
    console.log("No user");
    return;
  }

  const q = query(
    collection(db, COLLECTION_NAME),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);

  let docs = snap.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  // sort by createdAt (oldest first)
  docs.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  let counter = 1;

  for (const b of docs) {
    // skip if already has code
    if (b.code) continue;

    const code = "NF" + counter;

    console.log("Assigning:", b.title, "→", code);

    await updateDoc(doc(db, COLLECTION_NAME, b.id), {
      code: code
    });

    counter++;
  }

  console.log("Backfill complete");
};
