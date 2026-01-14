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
const documentariesCol = collection(db, "documentaries");

/* STATE */
let currentFilter = "all";
let documentaries = [];
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
  loadDocumentaries();
});

/* HELPERS */
function parseGenres(value) {
  return value
    .split(",")
    .map(g => g.trim())
    .filter(Boolean);
}

function normalize(str) {
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

/* ADD DOCUMENTARY */
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
    query(documentariesCol, where("uid", "==", user.uid))
  );

  const exists = snap.docs.some(d =>
    normalize(d.data().name) === normalize(name)
  );

  if (exists) {
    alert("Documentary already exists");
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

  await addDoc(documentariesCol, data);

  seriesForm.classList.add("hidden");
  nameInput.value = yearInput.value = genreInput.value = "";
};

/* LOAD DOCUMENTARIES */
function loadDocumentaries() {
  const q = query(documentariesCol, where("uid", "==", user.uid));
  onSnapshot(q, snap => {
    documentaries = snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
  let list = [...documentaries];

  if (currentFilter === "seen") list = list.filter(d => d.seen);
  if (currentFilter === "unseen") list = list.filter(d => !d.seen);

  const q = searchInput.value.toLowerCase();
  if (q) {
    list = list.filter(d =>
      d.name.toLowerCase().includes(q) ||
      (d.genres || []).some(g => g.toLowerCase().includes(q))
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

  list.forEach(d => {
    const row = document.createElement("div");
    row.className = "series-row";

    row.innerHTML = `
      <div class="series-text">
        <strong>
          ${d.name}
          <span class="status ${d.seen ? "seen" : "unseen"}">
            ${d.seen ? "SEEN" : "UNSEEN"}
          </span>
        </strong>
        ${d.year ? `<span>${d.year}</span>` : ""}
        <div>${(d.genres||[]).map(g=>`<span class="tag">#${g}</span>`).join("")}</div>
      </div>
      <div class="series-actions">
        <input type="checkbox" class="seen-toggle" ${d.seen ? "checked" : ""}>
        <button class="edit-btn">✏️</button>
        <button class="del-btn">🗑️</button>
      </div>
    `;

    row.querySelector(".seen-toggle").onchange = e =>
      updateDoc(doc(db, "documentaries", d.id), { seen: e.target.checked });

    row.querySelector(".edit-btn").onclick = () => openEdit(d.id);
    row.querySelector(".del-btn").onclick = () => askDelete(d.id);

    seriesList.appendChild(row);
  });
}

/* EDIT */
function openEdit(id) {
  const d = documentaries.find(x => x.id === id);
  editId = id;
  editName.value = d.name;
  editYear.value = d.year;
  editGenres.value = (d.genres || []).join(", ");
  editOverlay.classList.remove("hidden");
}

saveEditBtn.onclick = async () => {
  await updateDoc(doc(db, "documentaries", editId), {
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
  await deleteDoc(doc(db, "documentaries", deleteId));
  confirmBox.classList.add("hidden");
};

cancelDeleteBtn.onclick = () =>
  confirmBox.classList.add("hidden");
