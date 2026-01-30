import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* =========================
   ELEMENTS
========================= */
const noteTitle = document.getElementById("noteTitle");
const noteBody = document.getElementById("noteBody");
const addNoteBtn = document.getElementById("addNoteBtn");
const notesGrid = document.getElementById("notesGrid");
const statusText = document.getElementById("statusText");

/* OVERLAY */
const noteOverlay = document.getElementById("noteOverlay");
const closeOverlay = document.getElementById("closeOverlay");
const editTitle = document.getElementById("editTitle");
const editBody = document.getElementById("editBody");
const saveEditBtn = document.getElementById("saveEditBtn");
const deleteBtn = document.getElementById("deleteBtn");
const overlayMeta = document.getElementById("overlayMeta");

/* CURRENT */
let currentUser = null;
let currentNoteId = null;

/* =========================
   HELPERS
========================= */
function safeText(s) {
  return (s ?? "").toString();
}

function shortPreview(text, max = 120) {
  const t = safeText(text).trim();
  if (!t) return "(empty note)";
  return t.length > max ? t.slice(0, max) + "..." : t;
}

function openOverlay(noteDoc) {
  const data = noteDoc.data();
  currentNoteId = noteDoc.id;

  editTitle.value = safeText(data.title);
  editBody.value = safeText(data.body);

  overlayMeta.textContent = "Opened note";
  noteOverlay.classList.remove("hidden");
}

function closeOverlayUI() {
  noteOverlay.classList.add("hidden");
  currentNoteId = null;
}

function setStatus(msg) {
  statusText.textContent = msg;
}

/* =========================
   LOAD + LIVE NOTES
========================= */
onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUser = user;

  const q = query(
    collection(db, "notes"),
    where("uid", "==", user.uid),
    orderBy("createdAt", "desc")
  );

  onSnapshot(q, snap => {
    if (snap.empty) {
      notesGrid.innerHTML = `<p class="muted">No notes yet.</p>`;
      return;
    }

    notesGrid.innerHTML = "";
    snap.forEach(noteDoc => {
      const d = noteDoc.data();

      const card = document.createElement("div");
      card.className = "note-card";
      card.innerHTML = `
        <h3 class="note-title">${safeText(d.title) || "UNTITLED"}</h3>
        <p class="note-preview">${shortPreview(d.body)}</p>
      `;

      card.onclick = () => openOverlay(noteDoc);

      notesGrid.appendChild(card);
    });
  });
});

/* =========================
   CREATE NOTE
========================= */
addNoteBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const title = safeText(noteTitle.value).trim();
  const body = safeText(noteBody.value).trim();

  if (!title && !body) {
    setStatus("Write something first.");
    return;
  }

  addNoteBtn.disabled = true;
  setStatus("Saving...");

  try {
    await addDoc(collection(db, "notes"), {
      uid: currentUser.uid,
      title,
      body,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    noteTitle.value = "";
    noteBody.value = "";
    setStatus("Saved ✅");

  } catch (err) {
    console.error("Add note error:", err);
    setStatus("Failed to save ❌");
  }

  addNoteBtn.disabled = false;
});

/* =========================
   EDIT NOTE
========================= */
saveEditBtn.addEventListener("click", async () => {
  if (!currentUser || !currentNoteId) return;

  const title = safeText(editTitle.value).trim();
  const body = safeText(editBody.value).trim();

  saveEditBtn.disabled = true;

  try {
    await updateDoc(doc(db, "notes", currentNoteId), {
      title,
      body,
      updatedAt: serverTimestamp()
    });

    overlayMeta.textContent = "Saved changes ✅";
  } catch (err) {
    console.error("Update note error:", err);
    overlayMeta.textContent = "Save failed ❌";
  }

  saveEditBtn.disabled = false;
});

/* =========================
   DELETE NOTE
========================= */
deleteBtn.addEventListener("click", async () => {
  if (!currentUser || !currentNoteId) return;

  const ok = confirm("Delete this note?");
  if (!ok) return;

  deleteBtn.disabled = true;

  try {
    await deleteDoc(doc(db, "notes", currentNoteId));
    closeOverlayUI();
  } catch (err) {
    console.error("Delete note error:", err);
    overlayMeta.textContent = "Delete failed ❌";
  }

  deleteBtn.disabled = false;
});

/* =========================
   OVERLAY EVENTS
========================= */
closeOverlay.addEventListener("click", closeOverlayUI);

noteOverlay.addEventListener("click", (e) => {
  if (e.target === noteOverlay) closeOverlayUI();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeOverlayUI();
});
