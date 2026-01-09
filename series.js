import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let series = [];
let editId = null;
let deleteId = null;
let user = null;

/* ELEMENTS */
const seriesForm = document.getElementById("seriesForm");
const seriesList = document.getElementById("seriesList");
const confirmBox = document.getElementById("confirmBox");
const editOverlay = document.getElementById("editOverlay");

const toggleForm = document.getElementById("toggleForm");
const saveSeriesBtn = document.getElementById("saveSeries");

const sortNameBtn = document.getElementById("sortName");
const sortSeasonsBtn = document.getElementById("sortSeasons");
const searchInput = document.getElementById("search");

const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

/* INPUTS */
const nameInput = document.getElementById("name");
const seasonsInput = document.getElementById("seasons");
const genresInput = document.getElementById("genres");

const editName = document.getElementById("editName");
const editSeasons = document.getElementById("editSeasons");
const editGenres = document.getElementById("editGenres");

/* AUTH */
onAuthStateChanged(auth, u => {
  if (!u) location.href = "index.html";
  user = u;
  loadSeries();
});

/* ADD */
toggleForm.onclick = () => seriesForm.classList.toggle("hidden");

saveSeriesBtn.onclick = async () => {
  const name = nameInput.value.trim();
  const seasons = Number(seasonsInput.value);
  const genres = genresInput.value.split(",").map(g=>g.trim()).filter(Boolean);

  if (!name || !seasons) return alert("Name and seasons required");

  await addDoc(collection(db, "series"), {
    uid: user.uid,
    name, seasons, genres
  });

  seriesForm.classList.add("hidden");
  nameInput.value = seasonsInput.value = genresInput.value = "";
};

/* LOAD */
function loadSeries() {
  const q = query(collection(db, "series"), where("uid", "==", user.uid));
  onSnapshot(q, snap => {
    series = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render(series);
  });
}

/* RENDER */
function render(list) {
  seriesList.innerHTML = "";

  list.forEach(s => {
    const row = document.createElement("div");
    row.className = "series-row";

    row.innerHTML = `
      <div class="series-text">
        <strong>${s.name}</strong>
        <span>${s.seasons} seasons</span>
        <div>${(s.genres||[]).map(g=>`<span class="tag">#${g}</span>`).join("")}</div>
      </div>
      <div class="series-actions">
        <button class="edit-btn">✏️</button>
        <button class="del-btn">🗑️</button>
      </div>
    `;

    row.querySelector(".edit-btn").onclick = () => openEdit(s.id);
    row.querySelector(".del-btn").onclick = () => askDelete(s.id);

    seriesList.appendChild(row);
  });
}

/* SEARCH */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  render(series.filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.genres||[]).some(g=>g.toLowerCase().includes(q))
  ));
};

/* SORT */
sortNameBtn.onclick = () =>
  render([...series].sort((a,b)=>a.name.localeCompare(b.name)));
sortSeasonsBtn.onclick = () =>
  render([...series].sort((a,b)=>a.seasons-b.seasons));

/* EDIT */
function openEdit(id) {
  const s = series.find(x=>x.id===id);
  editId = id;

  editName.value = s.name;
  editSeasons.value = s.seasons;
  editGenres.value = (s.genres||[]).join(", ");

  editOverlay.classList.remove("hidden");
}

saveEditBtn.onclick = async () => {
  await updateDoc(doc(db,"series",editId),{
    name: editName.value,
    seasons: Number(editSeasons.value),
    genres: editGenres.value.split(",").map(g=>g.trim()).filter(Boolean)
  });
  editOverlay.classList.add("hidden");
};

cancelEditBtn.onclick = () => editOverlay.classList.add("hidden");

/* DELETE */
function askDelete(id) {
  deleteId = id;
  confirmBox.classList.remove("hidden");
}
confirmDeleteBtn.onclick = async () => {
  await deleteDoc(doc(db,"series",deleteId));
  confirmBox.classList.add("hidden");
};
cancelDeleteBtn.onclick = () => confirmBox.classList.add("hidden");
