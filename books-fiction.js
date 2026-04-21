/* ===============================
   IMPORTS
================================ */
import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

import { requireAuth } from "./auth-guard.js";

requireAuth();

/* ===============================
   HELPERS
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
    {
      method: "POST",
      body: formData
    }
  );

  const data = await res.json();

  if (!data.secure_url) {
    console.error(data);
    throw new Error("Upload failed");
  }

  return data.secure_url;
}

/* ===============================
   CONFIG
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

/* ===============================
   UI
================================ */
document.getElementById("toggleForm").onclick =
  () => bookForm.classList.toggle("hidden");

/* ===============================
   ✅ RESTORED SEARCH / FILTER / SORT
================================ */
let searchTimeout;

searchInput.addEventListener("input", e => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    searchQuery = e.target.value.toLowerCase();
    visibleCount = PAGE_SIZE;
    applyView();
  }, 300);
});

filterSelect.addEventListener("change", e => {
  currentFilter = e.target.value;
  visibleCount = PAGE_SIZE;
  applyView();
});

sortSelect.addEventListener("change", e => {
  sortMode = e.target.value;
  applyView();
});

recentBtn?.addEventListener("click", () => {
  sortMode = "recent";
  applyView();
});

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

  const file = document.getElementById("imageInput")?.files[0];

  let imageUrl = "";

  if (file) {
    try {
      imageUrl = await uploadImage(file);
    } catch (err) {
      alert("Image upload failed");
      return;
    }
  }

// ===== GENERATE CODE =====
const prefix = "F";

// extract numbers
let numbers = books
  .map(b => {
    if (!b.code) return null;
    return parseInt(b.code.replace(prefix, ""));
  })
  .filter(n => !isNaN(n));

// sort numbers
numbers.sort((a, b) => a - b);

let max = numbers.length ? numbers[numbers.length - 1] : 0;

// check if there is any gap
const hasGap = numbers.some((num, i) => num !== i + 1);

let nextNumber;

// edge case: no books
if (max === 0) {
  nextNumber = 1;
}
else if (hasGap) {
  nextNumber = max + 1;   // gap → continue forward
} else {
  nextNumber = max;       // no gap → reuse last
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

  await loadBooks();

  bookForm.classList.add("hidden");

  titleInput.value = "";
  authorInput.value = "";
  categoryInput.value = "";
  dateInput.value = "";
  if (document.getElementById("imageInput"))
    document.getElementById("imageInput").value = "";
};

/* ===============================
   LOAD BOOKS
================================ */
async function loadBooks() {
  const q = query(
    collection(db, COLLECTION_NAME),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);
  books = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  visibleCount = PAGE_SIZE;
  applyView();
}

/* ===============================
   VIEW LOGIC
================================ */
function applyView() {
  let list = [...books];

  if (searchQuery) {
  const term = searchQuery.toLowerCase();

  // 🔥 detect code pattern (F12 / NF12)
  const isCodeSearch = /^[a-z]+[0-9]+$/i.test(term);

  if (isCodeSearch) {
    list = list.filter(b =>
      (b.code || "").toLowerCase() === term
    );
  } else {
    const isAuthorOnly = term.startsWith("@");
    const cleanTerm = isAuthorOnly ? term.slice(1) : term;

    list = list.filter(b => {
      const title = (b.title || "").toLowerCase();
      const author = (b.author || "").toLowerCase();

      return isAuthorOnly
        ? author.includes(cleanTerm)
        : title.includes(cleanTerm) || author.includes(cleanTerm);
    });
  }
}
  switch (currentFilter) {
    case "owned": list = list.filter(b => b.owned); break;
    case "not-owned": list = list.filter(b => !b.owned); break;
    case "read": list = list.filter(b => b.read); break;
    case "not-read": list = list.filter(b => !b.read); break;
  }

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

  renderBooks(list.slice(0, visibleCount));
}

/* ===============================
   RENDER
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

    <span class="book-code-left">${b.code || ""}</span>
    <span class="owned-icon ${b.owned ? "owned" : ""}">📘</span>

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

window.reapplyCodes = async () => {
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
    const code = "F" + counter;

    console.log("Reset:", b.title, "→", code);

    await updateDoc(doc(db, COLLECTION_NAME, b.id), {
      code: code
    });

    counter++;
  }

  console.log("Reapply complete");
};
