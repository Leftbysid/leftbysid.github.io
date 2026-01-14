import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* COLLECTIONS */
const genresCol = collection(db, "genres");
const moviesCol = collection(db, "movies");

/* STATE */
let currentFilter = "all";
let movies = [];
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

const sortRecentBtn = document.getElementById("sortRecent");
const searchInput = document.getElementById("search");

const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");
const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

/* GENRE INPUT */
const genreInput = document.getElementById("genreInput");
const genreList = document.getElementById("genreList");

/* INPUTS */
const nameInput = document.getElementById("name");
const yearInput = document.getElementById("year");

const editName = document.getElementById("editName");
const editYear = document.getElementById("editYear");
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
  loadMovies();
});

/* HELPERS */
function parseGenres(value) {
  return value
    .split(",")
    .map(g => g.trim())
    .filter(Boolean);
}

function normalize(str = "") {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

/* ADD MOVIE */
toggleForm.onclick = () =>
  seriesForm.classList.toggle("hidden");

saveSeriesBtn.onclick = async () => {
  const name = nameInput.value.trim();
  const year = Number(yearInput.value);
  const genres = parseGenres(genreInput.value);

  if (!name) {
    alert("You fking idiot");
    return;
  }

  const snap = await getDocs(
    query(moviesCol, where("uid", "==", user.uid))
  );

  const exists = snap.docs.some(d => {
  const data = d.data();
  if (!data.name) return false;
  return normalize(data.name) === normalize(name);
});

  if (exists) {
    alert("Movie already exists");
    return;
  }

  const data = {
    uid: user.uid,
    name,
    genres,
    seen: false,
    createdAt: serverTimestamp()
  };

  if (year) data.year = year;

  await addDoc(moviesCol, data);

  seriesForm.classList.add("hidden");
  nameInput.value = yearInput.value = genreInput.value = "";
};

/* LOAD MOVIES */
function loadMovies() {
  const q = query(moviesCol, where("uid", "==", user.uid));
  onSnapshot(q, snap => {
    movies = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    applyFilters();
  });
}

/* LOAD GENRES */
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

/* SAVE NEW GENRES */
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
  let list = [...movies];

  if (currentFilter === "seen") list = list.filter(m => m.seen);
  if (currentFilter === "unseen") list = list.filter(m => !m.seen);

  const q = searchInput.value.toLowerCase();
  if (q) {
    list = list.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.genres || []).some(g => g.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) =>
    (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
  );

  render(list);
}

searchInput.oninput = applyFilters;

/* RENDER */
function render(list) {
  seriesList.innerHTML = "";

  list.forEach(m => {
    const row = document.createElement("div");
    row.className = "series-row";

    row.innerHTML = `
      <div class="series-text">
        <strong>
          ${m.name}
          <span class="status ${m.seen ? "seen" : "unseen"}">
            ${m.seen ? "SEEN" : "UNSEEN"}
          </span>
        </strong>
        ${m.year ? `<span>${m.year}</span>` : ""}
        <div>${(m.genres||[]).map(g=>`<span class="tag">#${g}</span>`).join("")}</div>
      </div>
      <div class="series-actions">
        <input type="checkbox" class="seen-toggle" ${m.seen ? "checked" : ""}>
        <button class="edit-btn">✏️</button>
        <button class="del-btn">🗑️</button>
      </div>
    `;

    row.querySelector(".seen-toggle").onchange = e =>
      updateDoc(doc(db, "movies", m.id), { seen: e.target.checked });

    row.querySelector(".edit-btn").onclick = () => openEdit(m.id);
    row.querySelector(".del-btn").onclick = () => askDelete(m.id);

    seriesList.appendChild(row);
  });
}

/* EDIT */
function openEdit(id) {
  const m = movies.find(x => x.id === id);
  editId = id;
  editName.value = m.name;
  editYear.value = m.year;
  editGenres.value = (m.genres || []).join(", ");
  editOverlay.classList.remove("hidden");
}

saveEditBtn.onclick = async () => {
  await updateDoc(doc(db, "movies", editId), {
    name: editName.value.trim(),
    year: Number(editYear.value),
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
  await deleteDoc(doc(db, "movies", deleteId));
  confirmBox.classList.add("hidden");
};

cancelDeleteBtn.onclick = () =>
  confirmBox.classList.add("hidden");
