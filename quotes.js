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

let quotes = [];
let editingId = null;
let deleteId = null;
let currentUser = null;

const quoteText = document.getElementById("quoteText");
const authorInput = document.getElementById("author");
const dateInput = document.getElementById("date");
const quoteList = document.getElementById("quoteList");
const searchInput = document.getElementById("search");
const quoteForm = document.getElementById("quoteForm");

const editOverlay = document.getElementById("editOverlay");
const editQuote = document.getElementById("editQuote");
const editAuthor = document.getElementById("editAuthor");
const editDate = document.getElementById("editDate");

document.getElementById("toggleForm").onclick =
  () => quoteForm.classList.toggle("hidden");

onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadQuotes();
});

window.addQuote = async () => {
  if (!quoteText.value || !authorInput.value) return;

  await addDoc(collection(db, "quotes"), {
    uid: currentUser.uid,
    text: quoteText.value,
    author: authorInput.value,
    date: dateInput.value
  });

  quoteForm.classList.add("hidden");
  quoteText.value = authorInput.value = dateInput.value = "";
};

function loadQuotes() {
  const q = query(collection(db, "quotes"), where("uid", "==", currentUser.uid));
  onSnapshot(q, snap => {
    quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderQuotes(quotes);
  });
}

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
        <p class="quote-author">— ${q.author}</p>
        ${q.date ? `<p class="quote-date">${q.date}</p>` : ""}
      </div>
    `;
  });
}

searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  renderQuotes(
    quotes.filter(x =>
      x.text.toLowerCase().includes(q) ||
      x.author.toLowerCase().includes(q)
    )
  );
};

window.sortByAuthor = () =>
  renderQuotes([...quotes].sort((a, b) =>
    a.author.localeCompare(b.author)
  ));

window.sortByDate = () =>
  renderQuotes([...quotes].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  ));

window.editQuoteFn = id => {
  const q = quotes.find(x => x.id === id);
  editingId = id;
  editQuote.value = q.text;
  editAuthor.value = q.author;
  editDate.value = q.date;
  editOverlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  await updateDoc(doc(db, "quotes", editingId), {
    text: editQuote.value,
    author: editAuthor.value,
    date: editDate.value
  });
  editOverlay.classList.add("hidden");
};

window.closeEdit = () => editOverlay.classList.add("hidden");

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
