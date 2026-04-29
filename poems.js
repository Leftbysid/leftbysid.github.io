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

/* ELEMENTS */
const poemsList = document.getElementById("poemsList");
const totalPoems = document.getElementById("totalPoems");

const searchInput = document.getElementById("searchInput");
const sortBtn = document.getElementById("sortBtn");

/* ADD OVERLAY */
const addOverlay = document.getElementById("addOverlay");
const openAddOverlay = document.getElementById("openAddOverlay");
const closeAddOverlay = document.getElementById("closeAddOverlay");

const poemContent = document.getElementById("poemContent");
const poemTitle = document.getElementById("poemTitle");
const poemAuthor = document.getElementById("poemAuthor");
const poemLanguage = document.getElementById("poemLanguage");
const poemYear = document.getElementById("poemYear");

const addPoemBtn = document.getElementById("addPoemBtn");

/* EDIT OVERLAY */
const poemOverlay = document.getElementById("poemOverlay");
const closeOverlay = document.getElementById("closeOverlay");

const overlayTitle = document.getElementById("overlayTitle");
const overlayContent = document.getElementById("overlayContent");
const overlayAuthor = document.getElementById("overlayAuthor");
const overlayLanguage = document.getElementById("overlayLanguage");
const overlayYear = document.getElementById("overlayYear");
const overlayMeta = document.getElementById("overlayMeta");

const saveEditBtn = document.getElementById("saveEditBtn");
const deleteBtn = document.getElementById("deleteBtn");

/* FOCUS MODE */
const focusOverlay = document.getElementById("focusOverlay");
const focusText = document.getElementById("focusText");
const focusMeta = document.getElementById("focusMeta");
const focusTitle = document.getElementById("focusTitle");

/* STATE */
let currentUser = null;
let currentPoemId = null;
let allPoems = [];
let sortMode = "recent";

/* HELPERS */
function safe(v){ return (v ?? "").toString(); }

/* =========================
   FOCUS MODE
========================= */
function openFocusMode(d){
  const meta = [
    d.author,
    d.language,
    d.year
  ].filter(Boolean).join(" — ");

  focusTitle.textContent = d.title || "Untitled";
  focusText.textContent = d.content || "";
  focusMeta.textContent = meta;

  focusOverlay.classList.remove("hidden");

  setTimeout(()=>{
    focusOverlay.classList.add("show");
  },10);
}
function closeFocusMode(){
  focusOverlay.classList.remove("show");
  setTimeout(()=> focusOverlay.classList.add("hidden"),300);
}

/* =========================
   RENDER
========================= */
function renderPoems(){
  const search = safe(searchInput.value).toLowerCase();

  let filtered = allPoems.filter(p => {
    const d = p.data;
    return (
      safe(d.title).toLowerCase().includes(search) ||
      safe(d.author).toLowerCase().includes(search)
    );
  });

  filtered.sort((a,b)=>{
    const ta = a.data.createdAt?.seconds || 0;
    const tb = b.data.createdAt?.seconds || 0;
    return sortMode==="recent"? tb-ta : ta-tb;
  });

  totalPoems.textContent = `Total: ${filtered.length}`;
  poemsList.innerHTML = "";

  filtered.forEach(p=>{
    const d = p.data;

    const row = document.createElement("div");
    row.className = "poem-row";

    const meta = [
      d.title,
      d.author,
      d.language,
      d.year
    ].filter(Boolean).join(" — ");

    /* TEXT */
    const text = document.createElement("div");
    text.className = "poem-text";
    text.textContent = meta || "Untitled";

    text.onclick = () => openFocusMode(d);

    /* ACTIONS */
    const actions = document.createElement("div");
    actions.className = "poem-actions";

    const editBtn = document.createElement("button");
    editBtn.textContent = "✏️";

    const delBtn = document.createElement("button");
    delBtn.textContent = "🗑️";

    /* EDIT */
    editBtn.onclick = (e)=>{
      e.stopPropagation();

      currentPoemId = p.id;

      overlayTitle.value = d.title || "";
      overlayContent.value = d.content || "";
      overlayAuthor.value = d.author || "";
      overlayLanguage.value = d.language || "";
      overlayYear.value = d.year || "";

      overlayMeta.textContent = meta;

      poemOverlay.classList.remove("hidden");
    };

    /* DELETE */
    delBtn.onclick = async (e)=>{
      e.stopPropagation();

      if(confirm("Delete this poem?")){
        await deleteDoc(doc(db,"poems",p.id));
      }
    };

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(text);
    row.appendChild(actions);

    poemsList.appendChild(row);
  });
}

/* =========================
   LOAD
========================= */
onAuthStateChanged(auth, user=>{
  if(!user) return;
  currentUser = user;

  const q = query(
    collection(db,"poems"),
    where("uid","==",user.uid),
    orderBy("createdAt","desc")
  );

  onSnapshot(q, snap=>{
    allPoems = [];
    snap.forEach(doc=>{
      allPoems.push({id:doc.id, data:doc.data()});
    });
    renderPoems();
  });
});

/* =========================
   ADD
========================= */
addPoemBtn.onclick = async ()=>{
  if(!currentUser) return;

  await addDoc(collection(db,"poems"),{
    uid: currentUser.uid,
    content: safe(poemContent.value),
    title: safe(poemTitle.value),
    author: safe(poemAuthor.value),
    language: safe(poemLanguage.value),
    year: safe(poemYear.value),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  addOverlay.classList.add("hidden");
};

/* =========================
   SAVE EDIT
========================= */
saveEditBtn.onclick = async ()=>{
  if(!currentPoemId) return;

  await updateDoc(doc(db,"poems",currentPoemId),{
    content: safe(overlayContent.value),
    title: safe(overlayTitle.value),
    author: safe(overlayAuthor.value),
    language: safe(overlayLanguage.value),
    year: safe(overlayYear.value),
    updatedAt: serverTimestamp()
  });

  poemOverlay.classList.add("hidden");
};

/* =========================
   DELETE (OVERLAY)
========================= */
deleteBtn.onclick = async ()=>{
  if(!currentPoemId) return;

  if(confirm("Delete this poem?")){
    await deleteDoc(doc(db,"poems",currentPoemId));
    poemOverlay.classList.add("hidden");
  }
};

/* =========================
   UI
========================= */
openAddOverlay.onclick = ()=> addOverlay.classList.remove("hidden");
closeAddOverlay.onclick = ()=> addOverlay.classList.add("hidden");

closeOverlay.onclick = ()=>{
  poemOverlay.classList.add("hidden");
  currentPoemId = null;
};

/* =========================
   SEARCH + SORT
========================= */
searchInput.addEventListener("input", renderPoems);

sortBtn.addEventListener("click", ()=>{
  sortMode = sortMode === "recent" ? "old" : "recent";
  sortBtn.textContent = sortMode === "recent"
    ? "🕒 Recently Added"
    : "🕰 Oldest First";
  renderPoems();
});

/* =========================
   FOCUS CLOSE
========================= */
focusOverlay.addEventListener("click", (e)=>{
  if(e.target === focusOverlay) closeFocusMode();
});

document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape") closeFocusMode();
});
