import { db } from "./firebase.js";
import {
  collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc, query, where
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* ELEMENTS */
const list = document.getElementById("movieList");
const overlay = document.getElementById("movieOverlay");
const deleteOverlay = document.getElementById("deleteOverlay");

const titleInput = document.getElementById("movieTitle");
const directorInput = document.getElementById("movieDirector");
const genreInput = document.getElementById("genreInput");
const genreTags = document.getElementById("genreTags");
const seenSelect = document.getElementById("movieSeen");

const searchInput = document.getElementById("searchInput");
const filterSelect = document.getElementById("filterSelect");

/* STATE */
let editingId = null;
let deletingId = null;
let genres = [];
let allMovies = [];
let userId = null;

/* AUTH GUARD */
onAuthStateChanged(auth, user => {
  if (!user) location.href = "index.html";
  else { userId = user.uid; listenMovies(); }
});

/* FIRESTORE */
function listenMovies() {
  const q = query(collection(db, "movies"), where("userId", "==", userId));
  onSnapshot(q, snap => {
    allMovies = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    render();
  });
}

/* RENDER */
function render() {
  const s = searchInput.value.toLowerCase();
  const f = filterSelect.value;
  const filtered = allMovies.filter(m => {
    if (f==="seen" && m.seen!=="seen") return false;
    if (f==="unseen" && m.seen!=="unseen") return false;
    return m.title.toLowerCase().includes(s) ||
      (m.director||"").toLowerCase().includes(s) ||
      m.genres.some(g=>g.toLowerCase().includes(s));
  });

  list.innerHTML = "";
  filtered.forEach(m => {
    const c = document.createElement("div");
    c.className = "movie-card";
    c.innerHTML = `
      <div class="movie-title">${m.title}</div>
      ${m.director?`<div>${m.director}</div>`:""}
      <div class="tags">${m.genres.map(g=>`<span>${g}</span>`).join("")}</div>
      <div class="badge">${m.seen==="seen"?"Seen":"Not Seen"}</div>
      <div class="icons">
        <span class="icon edit">✏️</span>
        <span class="icon delete">🗑️</span>
      </div>
    `;
    c.querySelector(".badge").onclick = () =>
      updateDoc(doc(db,"movies",m.id),{seen:m.seen==="seen"?"unseen":"seen"});
    c.querySelector(".edit").onclick = () => openEdit(m);
    c.querySelector(".delete").onclick = () => { deletingId=m.id; deleteOverlay.classList.remove("hidden"); };
    list.appendChild(c);
  });

  document.getElementById("statTotal").textContent = `Total: ${allMovies.length}`;
  document.getElementById("statSeen").textContent =
    `Seen: ${allMovies.filter(m=>m.seen==="seen").length}`;
  document.getElementById("statUnseen").textContent =
    `Not Seen: ${allMovies.filter(m=>m.seen==="unseen").length}`;
}

/* ADD */
document.getElementById("addMovieBtn").onclick = () => {
  editingId=null; genres=[];
  titleInput.value=""; directorInput.value=""; seenSelect.value="unseen";
  drawGenres(); overlay.classList.remove("hidden");
};

/* SAVE */
document.getElementById("saveMovie").onclick = async () => {
  const title = titleInput.value.trim();
  if (!title) return alert("Movie title required");
  const data = { title, director:directorInput.value.trim(), genres, seen:seenSelect.value, userId };
  if (editingId) await updateDoc(doc(db,"movies",editingId),data);
  else await addDoc(collection(db,"movies"),data);
  overlay.classList.add("hidden");
};

/* EDIT */
function openEdit(m) {
  editingId=m.id;
  titleInput.value=m.title;
  directorInput.value=m.director||"";
  seenSelect.value=m.seen;
  genres=[...m.genres];
  drawGenres();
  overlay.classList.remove("hidden");
}

/* DELETE */
document.getElementById("confirmDelete").onclick = async () => {
  await deleteDoc(doc(db,"movies",deletingId));
  deleteOverlay.classList.add("hidden");
};
document.getElementById("cancelDelete").onclick = () => deleteOverlay.classList.add("hidden");
document.getElementById("cancelMovie").onclick = () => overlay.classList.add("hidden");

/* GENRES */
genreInput.addEventListener("keydown", e => {
  if (e.key==="Enter" && genreInput.value.trim()) {
    genres.push(genreInput.value.trim());
    genreInput.value="";
    drawGenres();
  }
});
function drawGenres() {
  genreTags.innerHTML="";
  genres.forEach((g,i)=>{
    const s=document.createElement("span");
    s.textContent=g;
    s.onclick=()=>{ genres.splice(i,1); drawGenres(); };
    genreTags.appendChild(s);
  });
}

/* SEARCH / FILTER */
searchInput.oninput = render;
filterSelect.onchange = render;
