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

/* LOAD MORE */
const PAGE_SIZE = 20;
let visibleCount = PAGE_SIZE;

/* =====================
   ELEMENTS (SAFE INIT)
===================== */
let quoteText,
  authorInput,
  quoteList,
  searchInput,
  quoteForm,
  recentBtn,
  totalQuotesEl,
  loadMoreBtn,
  exportJsonBtn,
  exportPdfBtn,
  editOverlay,
  editQuote,
  editAuthor;

/* SHARE UI */
let shareBtn,
  shareOverlay,
  closeShareBtn,
  shareResult,
  shareLinkInput,
  copyShareBtn,
  shareButtons;

let activeSharePageId = null;

/* =====================
   INIT AFTER DOM LOADED ✅ (FIX)
===================== */
document.addEventListener("DOMContentLoaded", () => {
  /* NORMAL UI ELEMENTS */
  quoteText = document.getElementById("quoteText");
  authorInput = document.getElementById("author");
  quoteList = document.getElementById("quoteList");
  searchInput = document.getElementById("search");
  quoteForm = document.getElementById("quoteForm");
  recentBtn = document.getElementById("recentBtn");
  totalQuotesEl = document.getElementById("totalQuotes");
  loadMoreBtn = document.getElementById("loadMoreQuotes");

  exportJsonBtn = document.getElementById("exportJsonBtn");
  exportPdfBtn = document.getElementById("exportPdfBtn");

  editOverlay = document.getElementById("editOverlay");
  editQuote = document.getElementById("editQuote");
  editAuthor = document.getElementById("editAuthor");

  /* SHARE UI ELEMENTS ✅ */
  shareBtn = document.getElementById("sharePageBtn");
  shareOverlay = document.getElementById("shareOverlay");
  closeShareBtn = document.getElementById("closeShare");
  shareResult = document.getElementById("shareResult");
  shareLinkInput = document.getElementById("shareLink");
  copyShareBtn = document.getElementById("copyShareLink");
  shareButtons = document.querySelectorAll(".share-actions button");

  /* =====================
     UI EVENTS
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
     SEARCH (DEBOUNCED ✅)
  ===================== */
  let searchTimer = null;
  searchInput.oninput = () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = searchInput.value.trim().toLowerCase();
      visibleCount = PAGE_SIZE;
      applyView();
    }, 300); // ✅ fast + smooth
  };

  /* =====================
     EXPORTS ✅
  ===================== */
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

  /* =====================
     SHARE OVERLAY ✅ (FIXED)
  ===================== */
  if (shareOverlay) {
    shareOverlay.classList.add("hidden");
  }
  if (shareResult) {
    shareResult.classList.add("hidden");
  }

  if (shareBtn) {
    shareBtn.onclick = () => {
      if (!currentUser) {
        alert("Not authenticated");
        return;
      }
      shareResult.classList.add("hidden");
      shareOverlay.classList.remove("hidden");
    };
  }

  if (closeShareBtn) {
    closeShareBtn.onclick = () => {
      shareOverlay.classList.add("hidden");
    };
  }

  if (shareButtons && shareButtons.length) {
    shareButtons.forEach(btn => {
      btn.onclick = async () => {
        try {
          const mode = btn.dataset.mode;

          // REVOKE
          if (mode === "revoke") {
            if (!activeSharePageId) {
              alert("No active link");
              return;
            }

            await updateDoc(
              doc(db, "quotes_pages_public", activeSharePageId),
              { revoked: true }
            );

            activeSharePageId = null;
            shareResult.classList.add("hidden");
            alert("Link revoked ✅");
            return;
          }

          // CREATE
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

          shareLinkInput.value = link;
          shareResult.classList.remove("hidden");
        } catch (err) {
          console.error("Share failed:", err);
          alert("Share failed: " + err.message);
        }
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
   ADD QUOTE
===================== */
window.addQuote = async () => {
  const rawText = quoteText.value.trim();
  if (!rawText) return;

  const exists = quotes.some(q =>
    q.text.toLowerCase() === rawText.toLowerCase()
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

  loadQuotes();
};

/* =====================
   LOAD QUOTES (READ-SAFE ✅)
===================== */
async function loadQuotes() {
  const q = query(
    collection(db, "quotes"),
    where("uid", "==", currentUser.uid)
  );

  const snap = await getDocs(q);
  quotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (totalQuotesEl) {
    totalQuotesEl.textContent = quotes.length;
  }

  applyView();
}

/* =====================
   VIEW
===================== */
function applyView() {
  if (!quoteList) return;

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

  const visible = searchQuery
    ? list
    : list.slice(0, visibleCount);

  renderQuotes(visible);

  if (loadMoreBtn) {
    loadMoreBtn.classList.toggle(
      "hidden",
      !!searchQuery || list.length <= visibleCount
    );
  }
}

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
