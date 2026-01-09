import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let series = [];
let editId = null;
let deleteId = null;
let user = null;
let filter = "all";

/* ELEMENTS */
const seriesForm = document.getElementById("seriesForm");
const seriesList = document.getElementById("seriesList");
const statsBar = document.getElementById("statsBar");
const confirmBox = document.getElementById("confirmBox");
const editOverlay = document.getElementById("editOverlay");

const toggleForm = document.getElementById("toggleForm");
const saveSeriesBtn = document.getElementById("saveSeries");
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
toggleForm.onclick = () =>
  seriesForm.classList.toggle("hidden");

saveSeriesBtn.onclick = async () => {
  if (!nameInput.value.trim()) return;

  await addDoc(collection(db, "series"), {
    uid: user.uid,
    name: nameInput.value.trim(),
    seasons: Number(seasonsInput.value),
    genres: genresInput.value.split(",").map(g=>g.trim()).filter(Boolean),
    seen: false
  });

  seriesForm.classList.add("hidden");
  nameInput.value = seasonsInput.value = genresInput.value = "";
};

/* LOAD */
function loadSeries() {
  const q = query(collection(db, "series"), where("uid", "==", user.uid));
  onSnapshot(q, snap => {
    series = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyFilters();
  });
}

/* FILTER */
document.querySelectorAll(".filter").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".filter").forEach(b=>b.classList.remove("active"));
    btn.classList.add("active");
    filter = btn.dataset.filter;
    applyF
