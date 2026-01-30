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

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* =========================
   ELEMENTS
========================= */
const notesList = document.getElementById("notesList");
const totalNotes = document.getElementById("totalNotes");

const searchInput = document.getElementById("searchInput");
const sortBtn = document.getElementById("sortBtn");

/* ADD OVERLAY */
const addOverlay = document.getElementById("addOverlay");
const openAddOverlay = document.getElementById("openAddOverlay");
const closeAddOverlay = document.getElementById("closeAddOverlay");

const noteTitle = document.getElementById("noteTitle");
const noteDate = document.getElementById("noteDate");
const noteBody = document.getElementById("noteBody");
const addNoteBtn = document.getElementById("addNoteBtn");
const statusText = document.getElementById("statusText");

/* EDIT OVERLAY */
const noteOverlay = document.getElementById("noteOverlay");
const closeOverlay = document.getElementById("closeOverlay");

const editTitle = document.getElementById("editTitle");
const editDate = document.getElementById("editDate");
const editBody = document.getElementById("editBody");
const saveEditBtn = document.getElementById("saveEditBtn");
const deleteBtn = document.getElementById("deleteBtn");
const overlayMeta = document.getElementById("overlayMeta");

/* =========================
   STATE
========================= */
let currentUser = null;
let currentNoteId = null;

let allNotes = []; // local cache for search filter
let sortMode = "recent"; // recent | old

/* =========================
   HELPERS
========================= */
function safeText(v) {
  return (v ?? "").toString();
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  return `📅 ${dateStr}`;
}

function openAdd() {
  statusText.textContent = "";
  noteTitle.value = "";
  noteBody.value = "";
  noteDate.value = "";
  addOverlay.classList.remove("hidden");
}

function closeAdd() {
  addOverlay.classList.add("hidden");
}

function openEdit(noteDoc) {
  const d = noteDoc.data();
  currentNoteId = noteDoc.id;

  editTitle.value = safeText(d.title);
  editBody.value = safeText(d.body);
  editDate.value = safeText(d.noteDate); // optional

  overlayMeta.textContent = "Opened note";
  noteOverlay.classList.remove("hidden");
}

function closeEdit() {
  noteOverlay.classList.add("hidden");
  currentNoteId = null;
}

function renderNotes() {
  const search = safeText(searchInput.value).trim().toLowerCase();

  let filtered = allNotes.filter(n => {
    const title = safeText(n.data.title).toLowerCase();
    const body = safeText(n.data.body).toLowerCase();
    const d = safeText(n.data.noteDate).toLowerCase();
    return title.includes(search) || body.includes(search) || d.includes(search);
  });

  // sort locally
  filtered.sort((a, b) => {
    const ta = a.data.createdAt?.seconds || 0;
    const tb = b.data.createdAt?.seconds || 0;
    return sortMode === "recent" ? (tb - ta) : (ta - tb);
  });

  totalNotes.textContent = `Total: ${filtered.length}`;

  if (filtered.length === 0) {
    notesList.innerHTML = `<p class="muted">No notes found.</p>`;
    return;
  }

  notesList.innerHTML = "";

  filtered.forEach(noteObj => {
    const d = noteObj.data;

    const row = document.createElement("div");
    row.className = "note-row";

    const text = document.createElement("p");
    text.className = "note-text";
    text.textContent = safeText(d.body) || "(empty note)";

    const meta = document.createElement("div");
    meta.className = "note-meta";

    const title = safeText(d.title).trim();
    const dateLine = fmtDate(safeText(d.noteDate));

    meta.textContent = `${title ? "— " + title : ""}${dateLine ? "   " + dateLine : ""}`.trim();

    const actions = document.createElement("div");
    actions.className = "note-actions";

    const editBtn = document.createElement("button");
    editBtn.className = "icon-btn";
    editBtn.title = "Edit";
    editBtn.textContent = "✏️";

    const delBtn = document.createElement("button");
    delBtn.className = "icon-btn";
    delBtn.title = "Delete";
    delBtn.textContent = "🗑️";

    editBtn.onclick = () => openEdit(noteObj.ref);
    delBtn.onclick = async () => {
      const ok = confirm("Delete this note?");
      if (!ok) return;
      await deleteDoc(doc(db, "notes", noteObj.id));
    };

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(text);
    if (meta.textContent) row.appendChild(meta);
    row.appendChild(actions);

    notesList.appendChild(row);
  });
}

/* =========================
   LIVE LOAD NOTES
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
    allNotes = [];
    snap.forEach(docSnap => {
      allNotes.push({
        id: docSnap.id,
        data: docSnap.data(),
        ref: docSnap
      });
    });

    renderNotes();
  });
});

/* =========================
   ADD NOTE
========================= */
addNoteBtn.addEventListener("click", async () => {
  if (!currentUser) return;

  const title = safeText(noteTitle.value).trim();
  const body = safeText(noteBody.value).trim();
  const dateStr = safeText(noteDate.value).trim(); // optional yyyy-mm-dd

  if (!title && !body) {
    statusText.textContent = "Write something first.";
    return;
  }

  addNoteBtn.disabled = true;
  statusText.textContent = "Saving...";

  try {
    await addDoc(collection(db, "notes"), {
      uid: currentUser.uid,
      title,
      body,
      noteDate: dateStr || null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    statusText.textContent = "Saved ✅";
    setTimeout(() => closeAdd(), 400);

  } catch (err) {
    console.error("Add note error:", err);
    statusText.textContent = "Failed to save ❌";
  }

  addNoteBtn.disabled = false;
});

/* =========================
   EDIT NOTE
========================= */
saveEditBtn.addEventListener("click", async () => {
  if (!currentUser || !currentNoteId) return;

  saveEditBtn.disabled = true;

  try {
    await updateDoc(doc(db, "notes", currentNoteId), {
      title: safeText(editTitle.value).trim(),
      body: safeText(editBody.value).trim(),
      noteDate: safeText(editDate.value).trim() || null,
      updatedAt: serverTimestamp()
    });

    overlayMeta.textContent = "Saved ✅";
    setTimeout(() => closeEdit(), 300);

  } catch (err) {
    console.error("Update note error:", err);
    overlayMeta.textContent = "Save failed ❌";
  }

  saveEditBtn.disabled = false;
});

/* =========================
   DELETE NOTE (overlay)
========================= */
deleteBtn.addEventListener("click", async () => {
  if (!currentUser || !currentNoteId) return;

  const ok = confirm("Delete this note?");
  if (!ok) return;

  deleteBtn.disabled = true;

  try {
    await deleteDoc(doc(db, "notes", currentNoteId));
    closeEdit();
  } catch (err) {
    console.error("Delete note error:", err);
    overlayMeta.textContent = "Delete failed ❌";
  }

  deleteBtn.disabled = false;
});

/* =========================
   SEARCH + SORT
========================= */
searchInput.addEventListener("input", renderNotes);

sortBtn.addEventListener("click", () => {
  sortMode = sortMode === "recent" ? "old" : "recent";
  sortBtn.textContent = sortMode === "recent" ? "🕒 Recently Added" : "🕰 Oldest First";
  renderNotes();
});

/* =========================
   OVERLAY EVENTS
========================= */
openAddOverlay.addEventListener("click", openAdd);
closeAddOverlay.addEventListener("click", closeAdd);
addOverlay.addEventListener("click", (e) => {
  if (e.target === addOverlay) closeAdd();
});

closeOverlay.addEventListener("click", closeEdit);
noteOverlay.addEventListener("click", (e) => {
  if (e.target === noteOverlay) closeEdit();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeAdd();
    closeEdit();
  }
});
