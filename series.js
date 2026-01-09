import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  query,
  onSnapshot,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

/* =====================
   STATE
===================== */
let series = [];
let editingId = null;
let deleteId = null;
let genres = [];
let editGenres = [];

/* =====================
   ELEMENTS
===================== */
const addBtn = document.getElementById("addBtn");
const seriesForm = document.getElementById("seriesForm");
const seriesList = document.getElementById("seriesList");

const nameInput = document.getElementById("name");
const seasonsInput = document.getElementById("seasons");

const genreInput = document.getElementById("genreInput");
const genreTags = document.getElementById("genreTags");

/* EDIT */
const editOverlay = document.getElementById("editOverlay");
const editName = document.getElementById("editName");
const editSeasons = document.getElementById("editSeasons");
const editGenreTags = document.getElementById("editGenreTags");

/* =====================
   UI
===================== */
addBtn.onclick = () =>
  seriesForm.classList.toggle("hidden");

/* =====================
   GENRE INPUT (ADD)
===================== */
genreInput.onkeydown = e => {
  if (e.key !== "Enter") return;
  e.preventDefault();

  const g = genreInput.value.trim();
  if (!g || genres.includes(g)) return;

  genres.push(g);
  renderGenreTags(genreTags, genres);
  genreInput.value = "";
};

function renderGenreTags(container, list) {
  container.innerHTML = "";
  list.forEach(g => {
    const tag = document.createElement("span");
    tag.className = "genre-tag";
    tag.textContent = `#${g}`;
    tag.onclick = () => {
      list.splice(list.indexOf(g), 1);
      renderGenreTags(container, list);
    };
    container.appendChild(tag);
  });
}

/* =====================
   ADD SERIES
===================== */
window.addSeries = async () => {
  if (!nameInput.value.trim()) return;

  await addDoc(collection(db, "series"), {
    name: nameInput.value.trim(),
    seasons: Number(seasonsInput.value),
    genres
  });

  seriesForm.classList.add("hidden");
  nameInput.value = "";
  seasonsInput.value = "";
  genres = [];
  renderGenreTags(genreTags, genres);
};

/* =====================
   LOAD SERIES
===================== */
function loadSeries() {
  const q = query(collection(db, "series"), orderBy("name"));

  onSnapshot(q, snap => {
    series = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderSeries(series);
  });
}

/* =====================
   RENDER
===================== */
function renderSeries(list) {
  seriesList.innerHTML = "";

  list.forEach(s => {
    seriesList.innerHTML += `
      <div class="series-row">
        <div class="series-actions">
          <button onclick="editSeries('${s.id}')">✏️</button>
          <button onclick="askDelete('${s.id}')">🗑️</button>
        </div>

        <div class="series-name">${s.name}</div>
        <div class="series-meta">${s.seasons} seasons</div>

        <div class="series-tags">
          ${(s.genres || []).map(g =>
            `<span class="genre-tag">#${g}</span>`
          ).join("")}
        </div>
      </div>
    `;
  });
}

/* =====================
   EDIT
===================== */
window.editSeries = id => {
  const s = series.find(x => x.id === id);
  editingId = id;

  editName.value = s.name;
  editSeasons.value = s.seasons;
  editGenres = [...(s.genres || [])];

  renderGenreTags(editGenreTags, editGenres);
  editOverlay.classList.remove("hidden");
};

window.saveEdit = async () => {
  await updateDoc(doc(db, "series", editingId), {
    name: editName.value.trim(),
    seasons: Number(editSeasons.value),
    genres: editGenres
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
  await deleteDoc(doc(db, "series", deleteId));
  closeConfirm();
};

window.closeConfirm = () =>
  document.getElementById("confirmBox").classList.add("hidden");

/* =====================
   INIT
===================== */
loadSeries();
