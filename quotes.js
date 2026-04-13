/* =====================
   IMPORTS
===================== */
import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  setDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  Timestamp
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

const PAGE_SIZE = 20;
let visibleCount = PAGE_SIZE;

/* =====================
   ELEMENTS
===================== */
let quoteText,
  authorInput,
  quoteList,
  searchInput,
  quoteForm,
  recentBtn,
  totalQuotesEl,
  resultCount,
  exportJsonBtn,
  exportPdfBtn,
  editOverlay,
  editQuote,
  editAuthor;

/* SHARE */
let shareBtn,
  shareOverlay,
  closeShareBtn,
  shareResult,
  shareLinkInput,
  copyShareBtn,
  shareButtons;

let activeSharePageId = null;

/* =====================
   INIT
===================== */
document.addEventListener("DOMContentLoaded", () => {
  quoteText = document.getElementById("quoteText");
  authorInput = document.getElementById("author");
  quoteList = document.getElementById("quoteList");
  searchInput = document.getElementById("search");
  quoteForm = document.getElementById("quoteForm");
  recentBtn = document.getElementById("recentBtn");
  totalQuotesEl = document.getElementById("totalQuotes");
  resultCount = document.getElementById("resultCount");

  exportJsonBtn = document.getElementById("exportJsonBtn");
  exportPdfBtn = document.getElementById("exportPdfBtn");

  editOverlay = document.getElementById("editOverlay");
  editQuote = document.getElementById("editQuote");
  editAuthor = document.getElementById("editAuthor");

  shareBtn = document.getElementById("sharePageBtn");
  shareOverlay = document.getElementById("shareOverlay");
  closeShareBtn = document.getElementById("closeShare");
  shareResult = document.getElementById("shareResult");
  shareLinkInput = document.getElementById("shareLink");
  copyShareBtn = document.getElementById("copyShareLink");
  shareButtons = document.querySelectorAll(".share-actions button");

  document.getElementById("toggleForm").onclick =
    () => quoteForm.classList.toggle("hidden");

  /* 🔥 DEBOUNCED SEARCH */
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

  /* EXPORT (unchanged) */
  exportJsonBtn.onclick = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      count: quotes.length,
      quotes
    };

    const blob = new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    );

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "quotes.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

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

  /* SHARE (unchanged) */
  if (shareOverlay) shareOverlay.classList.add("hidden");
  if (shareResult) shareResult.classList.add("hidden");

  if (shareBtn) {
    shareBtn.onclick = () => {
      if (!currentUser) return alert("Not authenticated");
      shareResult.classList.add("hidden");
      shareOverlay.classList.remove("hidden");
    };
  }

  if (closeShareBtn) {
    closeShareBtn.onclick = () =>
      shareOverlay.classList.add("hidden");
  }

  if (shareButtons) {
    shareButtons.forEach(btn => {
      btn.onclick = async () => {
        const mode = btn.dataset.mode;

        if (mode === "revoke") {
          if (!activeSharePageId) return alert("No active link");

          await updateDoc(
            doc(db, "quotes_pages_public", activeSharePageId),
            { revoked: true }
          );

          activeSharePageId = null;
          shareResult.classList.add("hidden");
          alert("Link revoked ✅");
          return;
        }

        const pageId = crypto.randomUUID();
        activeSharePageId = pageId;

        const expiresAt =
          mode === "24h"
            ? Timestamp.fromMillis(Date.now() + 86400000)
            : null;

        await setDoc(doc(db, "quotes_pages_public", pageId), {
          ownerUid: currentUser.uid,
          expiresAt,
          revoked: false,
          createdAt: serverTimestamp()
        });

        const link =
          `${location.origin}/viewonly/quotes-view.html?page=${pageId}`;

        shareLinkInput.value = link;
        shareResult.classList.remove("hidden");
      };
    });
  }

  if (copyShareBtn) {
    copyShareBtn.onclick = async () => {
      await navigator.clipboard.writeText(shareLinkInput.value);
      copyShareBtn.textContent = "Copied!";
      setTimeout(() => (copyShareBtn.textContent = "Copy"), 1000);
    };
  }
});

/* =====================
   AUTH
===================== */
onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  currentUser = user;
  loadQuotes();
});

/* =====================
   ADD
===================== */
window.addQuote = async () => {
  const rawText = quoteText.value.trim();
  if (!rawText) return;

  const exists = quotes.some(q =>
    q.text.toLowerCase() === rawText.toLowerCase()
  );

  if (exists) return alert("This quote already exists.");

  await addDoc(collection(db, "quotes"), {
    uid: currentUser.uid,
    text: rawText,
    author: authorInput.value.trim() || "",
    createdAt: Date.now()
  });

  quoteForm.classList.add("hidden");
  quoteText.value = "";
  authorInput.value = "";

  loadQuotes();
};

/* =====================
   LOAD
===================== */
async function loadQuotes() {
  const q = query(
    collection(db, "quotes"),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);
  quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (totalQuotesEl) totalQuotesEl.textContent = quotes.length;

  visibleCount = PAGE_SIZE;
  applyView();
}

/* =====================
   VIEW
===================== */
function applyView() {
  let list = [...quotes];

  if (searchQuery) {
    const isAuthorOnly = searchQuery.startsWith("@");
    const term = isAuthorOnly
      ? searchQuery.slice(1)
      : searchQuery;

    list = list.filter(q => {
      const text = (q.text || "").toLowerCase();
      const author = (q.author || "").toLowerCase();

      return isAuthorOnly
        ? author.includes(term)
        : text.includes(term) || author.includes(term);
    });
  }

  if (sortMode === "recent") {
    list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  /* 🔥 ALWAYS LIMIT */
  const visible = list.slice(0, visibleCount);

  renderQuotes(visible);

  /* 🔥 RESULT COUNT */
  if (resultCount) {
    resultCount.innerText = searchQuery
      ? `Showing ${visible.length} of ${list.length} results`
      : "";
  }
}

/* =====================
   RENDER
===================== */
function renderQuotes(list) {
  let html = "";

  list.forEach(q => {
    html += `
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

  quoteList.innerHTML = html;
}

/* =====================
   EDIT / DELETE
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
  loadQuotes();
};

window.askDelete = id => {
  deleteId = id;
  document.getElementById("confirmBox").classList.remove("hidden");
};

window.confirmDelete = async () => {
  await deleteDoc(doc(db, "quotes", deleteId));
  document.getElementById("confirmBox").classList.add("hidden");
  loadQuotes();
};

window.closeConfirm = () => {
  deleteId = null;
  document.getElementById("confirmBox").classList.add("hidden");
};

/* =====================
   INFINITE SCROLL
===================== */
let isLoadingMore = false;

window.addEventListener("scroll", () => {
  if (isLoadingMore) return;

  const scrollPosition = window.innerHeight + window.scrollY;
  const threshold = document.body.offsetHeight - 200;

  if (scrollPosition >= threshold) {
    if (visibleCount < quotes.length) {
      isLoadingMore = true;

      visibleCount += PAGE_SIZE;
      applyView();

      setTimeout(() => {
        isLoadingMore = false;
      }, 200);
    }
  }
});
