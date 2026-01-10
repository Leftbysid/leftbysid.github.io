import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot, getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* COLLECTIONS */
const genresCol = collection(db, "genres");

/* STATE */
let currentFilter = "all";
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
const searchInput = document.getElementById("search");

const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

/* GENRE INPUT (DATALIST STYLE) */
const genreInput = document.getElementById("genreInput");
const genreList = document.getElementById("genreList");

/* INPUTS */
const nameInput = document.getElementById("name");
const seasonsInput = document.getElementById("seasons");

const editName = document.getElementById("editName");
const editSeasons = document.getElementById("editSeasons");
const editGenres = document.getElementById("editGenres");

/* FILTER BUTTONS */
document.querySelectorAll(".filter").forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll(".filter")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    applyFilters();
  };
});

/* AUTH */
onAuthStateChanged(auth, u => {
  if (!u) location.href = "index.html";
  user = u;
  loadGenres();
  loadSeries();
});

/* HELPERS */
function parseGenres(value) {
  return value
    .split(",")
    .map(g => g.trim())
    .filter(Boolean);
}

/* ADD SERIES */
toggleForm.onclick = () =>
  seriesForm.classList.toggle("hidden");

saveSeriesBtn.onclick = async () => {
  const name = nameInput.value.trim();
  const seasons = Number(seasonsInput.value);
  const genres = parseGenres(genreInput.value);

  if (!name || !seasons) return alert("Name and seasons required");

  await addDoc(collection(db, "series"), {
    uid: user.uid,
    name,
    seasons,
    genres,
    seen: false
  });

  seriesForm.classList.add("hidden");
  nameInput.value = seasonsInput.value = genreInput.value = "";
};

/* LOAD SERIES */
function loadSeries() {
  const q = query(collection(db, "series"), where("uid", "==", user.uid));
  onSnapshot(q, snap => {
    series = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyFilters();
  });
}

/* LOAD GENRES (SUGGESTIONS) */
function loadGenres() {
  onSnapshot(genresCol, snap => {
    genreList.innerHTML = "";
    snap.docs
      .map(d => d.data().name)
      .sort()
      .forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        genreList.appendChild(opt);
      });
  });
}

/* SAVE NEW GENRES (COMMA AWARE) */
genreInput.onchange = async () => {
  const inputGenres = parseGenres(genreInput.value);
  if (!inputGenres.length) return;

  const snap = await getDocs(genresCol);
  const existing = snap.docs.map(d => d.data().name.toLowerCase());

  for (const g of inputGenres) {
    if (!existing.includes(g.toLowerCase())) {
      await addDoc(genresCol, { name: g });
    }
  }
};

/* FILTER + SEARCH */
function applyFilters() {
  let list = [...series];

  if (currentFilter === "seen") {
    list = list.filter(s => s.seen);
  }
  if (currentFilter === "unseen") {
    list = list.filter(s => !s.seen);
  }

  const q = searchInput.value.toLowerCase();
  if (q) {
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.genres || []).some(g => g.toLowerCase().includes(q))
    );
  }

  render(list);
}

searchInput.oninput = applyFilters;

/* SORT */
sortNameBtn.onclick = () =>
  render([...series].sort((a,b)=>a.name.localeCompare(b.name)));

/* RENDER */
function render(list) {
  seriesList.innerHTML = "";

  list.forEach(s => {
    const row = document.createElement("div");
    row.className = "series-row";

    row.innerHTML = `
      <div class="series-text">
        <strong>
          ${s.name}
          <span class="status ${s.seen ? "seen" : "unseen"}">
            ${s.seen ? "SEEN" : "UNSEEN"}
          </span>
        </strong>
        <span>${s.seasons} seasons</span>
        <div>${(s.genres||[]).map(g=>`<span class="tag">#${g}</span>`).join("")}</div>
      </div>
      <div class="series-actions">
        <input type="checkbox" class="seen-toggle" ${s.seen ? "checked" : ""}>
        <button class="edit-btn">✏️</button>
        <button class="del-btn">🗑️</button>
      </div>
    `;

    row.querySelector(".seen-toggle").onchange = e =>
      updateDoc(doc(db, "series", s.id), { seen: e.target.checked });

    row.querySelector(".edit-btn").onclick = () => openEdit(s.id);
    row.querySelector(".del-btn").onclick = () => askDelete(s.id);

    seriesList.appendChild(row);
  });
}

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
    genres: parseGenres(editGenres.value)
  });
  editOverlay.classList.add("hidden");
};

cancelEditBtn.onclick = () =>
  editOverlay.classList.add("hidden");

/* DELETE */
function askDelete(id) {
  deleteId = id;
  confirmBox.classList.remove("hidden");
}
confirmDeleteBtn.onclick = async () => {
  await deleteDoc(doc(db,"series",deleteId));
  confirmBox.classList.add("hidden");
};
cancelDeleteBtn.onclick = () =>
  confirmBox.classList.add("hidden");
