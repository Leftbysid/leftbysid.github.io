import { auth, db } from "./firebase.js";
import {
  collection,
  addDoc,
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

const addOverlay = document.getElementById("addOverlay");
const openAddOverlay = document.getElementById("openAddOverlay");
const closeAddOverlay = document.getElementById("closeAddOverlay");

const poemContent = document.getElementById("poemContent");
const poemTitle = document.getElementById("poemTitle");
const poemAuthor = document.getElementById("poemAuthor");
const poemLanguage = document.getElementById("poemLanguage");
const poemYear = document.getElementById("poemYear");

const addPoemBtn = document.getElementById("addPoemBtn");
const statusText = document.getElementById("statusText");

/* VIEW */
const poemOverlay = document.getElementById("poemOverlay");
const closeOverlay = document.getElementById("closeOverlay");

const overlayTitle = document.getElementById("overlayTitle");
const overlayContent = document.getElementById("overlayContent");
const overlayMeta = document.getElementById("overlayMeta");
/* FOCUS MODE */
const focusOverlay = document.getElementById("focusOverlay");
const focusText = document.getElementById("focusText");
const focusMeta = document.getElementById("focusMeta");

/* STATE */
let currentUser = null;
let allPoems = [];
let sortMode = "recent";

/* HELPERS */
function safe(v){ return (v ?? "").toString(); }

/* FOCUS MODE FUNCTIONS */
function openFocusMode(d){
  const meta = [
    d.title,
    d.author,
    d.language,
    d.year
  ].filter(Boolean).join(" — ");

  focusText.textContent = d.content || "";
  focusMeta.textContent = meta;

  focusOverlay.classList.remove("hidden");

  setTimeout(()=>{
    focusOverlay.classList.add("show");
  },10);
}

function closeFocusMode(){
  focusOverlay.classList.remove("show");

  setTimeout(()=>{
    focusOverlay.classList.add("hidden");
  },300);
}

/* RENDER */
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

    row.textContent = meta || "Untitled";

    row.onclick = ()=>{
  openFocusMode(d);
};

    poemsList.appendChild(row);
  });
}

/* LOAD */
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

/* ADD */
addPoemBtn.onclick = async ()=>{
  if(!currentUser) return;

  await addDoc(collection(db,"poems"),{
    uid: currentUser.uid,
    content: safe(poemContent.value),
    title: safe(poemTitle.value),
    author: safe(poemAuthor.value),
    language: safe(poemLanguage.value),
    year: safe(poemYear.value),
    createdAt: serverTimestamp()
  });

  addOverlay.classList.add("hidden");
};

/* UI */
openAddOverlay.onclick = ()=> addOverlay.classList.remove("hidden");
closeAddOverlay.onclick = ()=> addOverlay.classList.add("hidden");

/* CLOSE FOCUS MODE */
focusOverlay.addEventListener("click", closeFocusMode);

document.addEventListener("keydown", (e)=>{
  if(e.key === "Escape"){
    closeFocusMode();
  }
});
