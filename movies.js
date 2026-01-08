import { auth } from "./auth.js";
import { db } from "./firebase.js";
import {
  collection, addDoc, onSnapshot,
  deleteDoc, doc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const list = document.getElementById("movieList");
const overlay = document.getElementById("editOverlay");
const deleteOverlay = document.getElementById("deleteOverlay");

let editingId = null;
let deletingId = null;

const moviesRef = collection(db, "movies");

/* AUTH GUARD */
auth.onAuthStateChanged(user => {
  if (!user) location.href = "index.html";
});

/* RENDER */
onSnapshot(moviesRef, snap => {
  list.innerHTML = "";
  let seen = 0;

  snap.forEach(docSnap => {
    const m = docSnap.data();
    if (m.seen === "seen") seen++;

    const card = document.createElement("div");
    card.className = "movie-card";

    card.innerHTML = `
      <div class="movie-title">${m.title}</div>
      <div>${m.director || ""}</div>
      <div class="tags">${(m.genres||[]).map(g=>`<span>${g}</span>`).join("")}</div>
      <div class="badge">${m.seen === "seen" ? "Seen" : "Not Seen"}</div>
      <div class="icons">
        ✏️ <span class="icon edit"></span>
        🗑️ <span class="icon delete"></span>
      </div>
    `;

    card.querySelector(".edit").onclick = () => {
      editingId = docSnap.id;
      document.getElementById("movieTitle").value = m.title;
      document.getElementById("movieDirector").value = m.director || "";
      document.getElementById("movieSeen").value = m.seen;
      overlay.classList.remove("hidden");
    };

    card.querySelector(".delete").onclick = () => {
      deletingId = docSnap.id;
      deleteOverlay.classList.remove("hidden");
    };

    list.appendChild(card);
  });

  document.getElementById("totalCount").textContent = `Total: ${snap.size}`;
  document.getElementById("seenCount").textContent = `Seen: ${seen}`;
  document.getElementById("unseenCount").textContent = `Not Seen: ${snap.size - seen}`;
});

/* ADD */
document.getElementById("saveMovie").onclick = async () => {
  const title = movieTitle.value.trim();
  if (!title) return;

  const data = {
    title,
    director: movieDirector.value.trim(),
    genres: [...document.querySelectorAll(".tags span")].map(t=>t.textContent),
    seen: movieSeen.value
  };

  if (editingId) {
    await updateDoc(doc(db, "movies", editingId), data);
  } else {
    await addDoc(moviesRef, data);
  }

  overlay.classList.add("hidden");
  editingId = null;
};

document.getElementById("cancelMovie").onclick = () => {
  overlay.classList.add("hidden");
};

document.getElementById("confirmDelete").onclick = async () => {
  await deleteDoc(doc(db, "movies", deletingId));
  deleteOverlay.classList.add("hidden");
};

document.getElementById("cancelDelete").onclick = () => {
  deleteOverlay.classList.add("hidden");
};

document.getElementById("addMovieBtn").onclick = () => {
  editingId = null;
  overlay.classList.remove("hidden");
};
