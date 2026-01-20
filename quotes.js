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
let searchQuery = "";

/* LOAD MORE (DOM LEVEL) */
const PAGE_SIZE = 20;
let visibleCount = PAGE_SIZE;

/* =====================
   ELEMENTS
===================== */
const quoteText = document.getElementById("quoteText");
const authorInput = document.getElementById("author");
const quoteList = document.getElementById("quoteList");
const searchInput = document.getElementById("search");
const quoteForm = document.getElementById("quoteForm");
const recentBtn = document.getElementById("recentBtn");
const totalQuotesEl = document.getElementById("totalQuotes");
const loadMoreBtn = document.getElementById("loadMoreQuotes");

const exportJsonBtn = document.getElementById("exportJsonBtn");
const exportPdfBtn = document.getElementById("exportPdfBtn");

const editOverlay = document.getElementById("editOverlay");
const editQuote = document.getElementById("editQuote");
const editAuthor = document.getElementById("editAuthor");

/* =====================
   UI
===================== */
document.getElementById("toggleForm").onclick =
  () => quoteForm.classList.toggle("hidden");

if (loadMoreBtn) {
  loadMoreBtn.onclick = () => {
    visibleCount += PAGE_SIZE;
    applyView();
  };
}

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

  const normalized = rawText.toLowerCase();

  const exists = quotes.some(q =>
    q.text.trim().toLowerCase() === normalized
  );

  if (exists) {
    alert("This quote already exists.");
    return;
  }

  await addDoc(collection(db, "quotes"), {
    uid: currentUser.uid,
    text: rawText,
    author: authorInput.value.trim() || "",
    createdAt: Date.now()
  });

  quoteForm.classList.add("hidden");
  quoteText.value = "";
  authorInput.value = "";
};

/* =====================
   LOAD QUOTES (INCREMENTAL SNAPSHOT)
===================== */
function loadQuotes() {
  const q = query(
    collection(db, "quotes"),
    where("uid", "==", currentUser.uid)
  );

  onSnapshot(q, snap => {
    snap.docChanges().forEach(change => {
      const data = { id: change.doc.id, ...change.doc.data() };

      if (change.type === "added") quotes.push(data);

      if (change.type === "modified") {
        const i = quotes.findIndex(q => q.id === data.id);
        if (i !== -1) quotes[i] = data;
      }

      if (change.type === "removed") {
        quotes = quotes.filter(q => q.id !== data.id);
      }
    });

    if (totalQuotesEl) {
      totalQuotesEl.textContent = quotes.length;
    }

    applyView();
  });
}

/* =====================
   VIEW (SEARCH + SORT + PAGINATION)
===================== */
function applyView() {
  let list = [...quotes];

  if (searchQuery) {
    list = list.filter(q =>
      q.text.toLowerCase().includes(searchQuery) ||
      (q.author && q.author.toLowerCase().includes(searchQuery))
    );
  }

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  const isSearching = !!searchQuery;
  const visibleList = isSearching
    ? list
    : list.slice(0, visibleCount);

  renderQuotes(visibleList);

  if (loadMoreBtn) {
    loadMoreBtn.classList.toggle(
      "hidden",
      isSearching || list.length <= visibleCount
    );
  }
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
   SEARCH (DEBOUNCED)
===================== */
let searchTimer = null;
searchInput.oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchQuery = searchInput.value.trim().toLowerCase();
    visibleCount = PAGE_SIZE;
    applyView();
  }, 250);
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
  editOverlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  await updateDoc(doc(db, "quotes", editingId), {
    text: editQuote.value.trim(),
    author: editAuthor.value.trim() || ""
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

/* =====================
   EXPORT JSON (IMPROVED STRUCTURE)
===================== */
if (exportJsonBtn) {
  exportJsonBtn.onclick = () => {
    const data = {
      type: "quotes",
      version: 1,
      exportedAt: new Date().toISOString(),
      count: quotes.length,
      quotes: quotes.map(q => ({
        id: q.id,
        text: q.text,
        author: (q.author || "").trim(),
        createdAt: q.createdAt
          ? new Date(q.createdAt).toISOString()
          : null
      }))
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quotes-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };
}

/* =====================
   EXPORT PDF (PRINT)
===================== */
if (exportPdfBtn) {
  exportPdfBtn.onclick = () => {
    const win = window.open("", "_blank");
    win.document.write("<pre>");
    quotes.forEach(q => {
      win.document.write(`“${q.text}”\n`);
      if (q.author) win.document.write(`— ${q.author}\n`);
      win.document.write("\n\n");
    });
    win.document.write("</pre>");
    win.document.close();
    win.print();
  };
}

/* =====================
   SHARE MODAL LOGIC
===================== */
import {
  setDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const shareBtn = document.getElementById("sharePageBtn");
const overlay = document.getElementById("shareOverlay");
const closeBtn = document.getElementById("closeShare");
const resultBox = document.getElementById("shareResult");
const linkInput = document.getElementById("shareLink");
const copyBtn = document.getElementById("copyShareLink");

let activeSharePageId = null;

document.querySelectorAll(".share-actions button").forEach(btn => {
  btn.onclick = async () => {
    const mode = btn.dataset.mode;

    if (mode === "revoke") {
      if (!activeSharePageId) {
        alert("No active share link");
        return;
      }

      await updateDoc(
        doc(db, "quotes_pages_public", activeSharePageId),
        { revoked: true }
      );

      resultBox.classList.add("hidden");
      alert("Link revoked");
      return;
    }

    const pageId = crypto.randomUUID();
    activeSharePageId = pageId;

    const expiresAt =
      mode === "24h"
        ? Timestamp.fromMillis(Date.now() + 86400000)
        : null;

    await setDoc(
      doc(db, "quotes_pages_public", pageId),
      {
        ownerUid: currentUser.uid,
        expiresAt,
        revoked: false,
        createdAt: serverTimestamp()
      }
    );

    const link =
      `${location.origin}/viewonly/quotes-view.html?page=${pageId}`;

    linkInput.value = link;
    resultBox.classList.remove("hidden");
  };
});

copyBtn.onclick = () => {
  navigator.clipboard.writeText(linkInput.value);
  copyBtn.textContent = "Copied!";
  setTimeout(() => (copyBtn.textContent = "Copy"), 1000);
};

/* =====================
   SHARE MODAL INIT (SAFE)
===================== */
document.addEventListener("DOMContentLoaded", () => {
  const shareBtn = document.getElementById("sharePageBtn");
  const overlay = document.getElementById("shareOverlay");
  const closeBtn = document.getElementById("closeShare");

  // 🔒 FORCE HIDE ON LOAD (important)
  overlay.classList.add("hidden");

  shareBtn.onclick = () => {
    overlay.classList.remove("hidden");
  };

  closeBtn.onclick = () => {
    overlay.classList.add("hidden");
  };
});
