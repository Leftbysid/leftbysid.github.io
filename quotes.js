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
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* =====================
   STATE
===================== */
let quotes = [];
let editingId = null;
let deleteId = null;
let currentUser = null;

let sortMode = "recent";

/* =====================
   ELEMENTS
===================== */
const quoteText = document.getElementById("quoteText");
const authorInput = document.getElementById("author");
const dateInput = document.getElementById("date");
const quoteList = document.getElementById("quoteList");
const searchInput = document.getElementById("search");
const quoteForm = document.getElementById("quoteForm");

const recentBtn = document.getElementById("recentBtn");

const editOverlay = document.getElementById("editOverlay");
const editQuote = document.getElementById("editQuote");
const editAuthor = document.getElementById("editAuthor");
const editDate = document.getElementById("editDate");

/* =====================
   UI
===================== */
document.getElementById("toggleForm").onclick =
  () => quoteForm.classList.toggle("hidden");

/* =====================
   AUTH
===================== */
onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadQuotes();
});

/* =====================
   ADD QUOTE
===================== */
window.addQuote = async () => {
  const rawText = quoteText.value.trim();
  if (!rawText) return;

  const newText = rawText.toLowerCase();

  // DUPLICATE CHECK
  const exists = quotes.some(q =>
    q.text.trim().toLowerCase() === newText
  );

  if (exists) {
    alert("This quote already exists.");
    return;
  }

  await addDoc(collection(db, "quotes"), {
    uid: currentUser.uid,
    text: rawText,
    author: authorInput.value.trim() || "",
    date: dateInput.value || "",
    createdAt: Date.now() // 🔥 for recent sorting
  });

  quoteForm.classList.add("hidden");
  quoteText.value = "";
  authorInput.value = "";
  dateInput.value = "";
};

/* =====================
   LOAD QUOTES
===================== */
function loadQuotes() {
  const q = query(collection(db, "quotes"), where("uid", "==", currentUser.uid));
  onSnapshot(q, snap => {
    quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyView();
  });
}

/* =====================
   VIEW (RECENT)
===================== */
function applyView() {
  let list = [...quotes];

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  renderQuotes(list);
}

/* =====================
   CONTROLS
===================== */
if (recentBtn) {
  recentBtn.onclick = () => {
    sortMode = "recent";
    applyView();
  };
}

/* =====================
   SEARCH
===================== */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  renderQuotes(
    quotes.filter(x =>
      x.text.toLowerCase().includes(q) ||
      (x.author && x.author.toLowerCase().includes(q))
    )
  );
};

/* =====================
   RENDER
===================== */
function renderQuotes(list) {
  quoteList.innerHTML = "";

  list.forEach(q => {
    quoteList.innerHTML += `
      <div class="quote-row">
        <div class="quote-actions">
          <button onclick="editQuoteFn('${q.id}')">✏️</button>
          <button onclick="askDelete('${q.id}')">🗑️</button>
        </div>

        <p class="quote-text">“${q.text}”</p>
        ${q.author ? `<p class="quote-author">— ${q.author}</p>` : ""}
        ${q.date ? `<p class="quote-date">${q.date}</p>` : ""}
      </div>
    `;
  });
}

/* =====================
   EDIT
===================== */
window.editQuoteFn = id => {
  const q = quotes.find(x => x.id === id);
  editingId = id;
  editQuote.value = q.text;
  editAuthor.value = q.author || "";
  editDate.value = q.date || "";
  editOverlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  await updateDoc(doc(db, "quotes", editingId), {
    text: editQuote.value.trim(),
    author: editAuthor.value.trim() || "",
    date: editDate.value || ""
  });
  editOverlay.classList.add("hidden");
};

window.closeEdit = () =>
  editOverlay.classList.add("hidden");

/* =====================
   DELETE
===================== */
window.askDelete = id => {
  deleteId = id;
  document.getElementById("confirmBox").classList.remove("hidden");
};

window.confirmDelete = async () => {
  await deleteDoc(doc(db, "quotes", deleteId));
  closeConfirm();
};

window.closeConfirm = () =>
  document.getElementById("confirmBox").classList.add("hidden");
