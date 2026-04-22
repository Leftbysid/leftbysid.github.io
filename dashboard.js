import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* =====================
   QUOTE WIDGET
===================== */
const quoteEl = document.getElementById("dashboardQuote");
const authorEl = document.getElementById("dashboardAuthor");

onAuthStateChanged(auth, async user => {
  if (!user) return;

  try {
    const q = query(
      collection(db, "quotes"),
      where("uid", "==", user.uid)
    );

    const snap = await getDocs(q);

    if (snap.empty) {
      quoteEl.textContent = "No quotes yet.";
      authorEl.textContent = "";
      return;
    }

    const docs = snap.docs;
    const randomDoc = docs[Math.floor(Math.random() * docs.length)];
    const data = randomDoc.data();

    quoteEl.textContent = `“${data.text}”`;
    authorEl.textContent = data.author ? `— ${data.author}` : "";

  } catch (err) {
    console.error("Dashboard quote error:", err);
    quoteEl.textContent = "Failed to load quote.";
    authorEl.textContent = "";
  }
});

/* =====================
   MUSIC PLAYER
===================== */
const audio = document.getElementById("bgMusic");
const playBtn = document.getElementById("playPause");
const nextBtn = document.getElementById("nextTrack");
const prevBtn = document.getElementById("prevTrack");
const titleEl = document.getElementById("trackTitle");

const playlist = [
  { title: "POLICE STATE", src: "music/police-state.mp3" },
  { title: "MALAI KE MARCHAS", src: "music/malai-ke-marchas.mp3" },
  { title: "B.Y.O.B", src: "music/BYOB.mp3" },
  { title: "Rage Against The Machine", src: "music/rage-against-the-machine.mp3" },
  { title: "Green Day - American Idiot", src: "music/green-day_american-idiot.mp3" },
  { title: "Fight The Power - Public enemy", src: "music/fight_the_power-public_enemy.mp3" },
  { title: "How the world works", src: "music/how_the_world_works-bo_burnham.mp3" },
  { title: "Bad Religion - American Jesus", src: "music/bad_religion-american_jesus.mp3" },
  { title: "Nathalie Cardone - Hasta Siempre", src: "music/nathalie_cardone-hasta_siempre.mp3" },
];

let currentIndex = 0;
let isPlaying = false;

function loadTrack(index) {
  const track = playlist[index];
  if (!track) return;
  audio.src = track.src;
  titleEl.textContent = track.title;
}

function togglePlay() {
  if (!audio.src) loadTrack(currentIndex);

  if (isPlaying) {
    audio.pause();
    playBtn.textContent = "▶";
  } else {
    audio.play().catch(() => {});
    playBtn.textContent = "⏸";
  }

  isPlaying = !isPlaying;
}

function nextTrack() {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadTrack(currentIndex);
  if (isPlaying) audio.play();
}

function prevTrack() {
  currentIndex =
    (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentIndex);
  if (isPlaying) audio.play();
}

audio.addEventListener("ended", nextTrack);

playBtn.onclick = togglePlay;
nextBtn.onclick = nextTrack;
prevBtn.onclick = prevTrack;

loadTrack(currentIndex);

/* =====================
   GLOBAL SEARCH
===================== */
const searchToggle = document.getElementById("searchToggle");
const searchBar = document.getElementById("searchBar");
const searchInput = document.getElementById("globalSearchInput");
const searchResults = document.getElementById("searchResults");
const searchCategory = document.getElementById("searchCategory");

searchToggle.onclick = () => {
  searchBar.classList.toggle("hidden");
  if (!searchBar.classList.contains("hidden")) {
    searchInput.focus();
  } else {
    searchResults.classList.add("hidden");
  }
};

/* 🔥 REAL SEARCH */
searchInput.oninput = async () => {
  const value = searchInput.value.trim().toLowerCase();
  const category = searchCategory.value;

  if (!value) {
    searchResults.classList.add("hidden");
    return;
  }

  searchResults.innerHTML = `<div style="padding:10px;">Searching...</div>`;
  searchResults.classList.remove("hidden");

  let resultsHTML = "";

  const collections = [
    { name: "Books", col: "books_fiction", page: "fnf.html" },
    { name: "Books", col: "books_nonfiction", page: "fnf.html" },
    { name: "Quotes", col: "quotes", page: "quotes.html" },
    { name: "Series", col: "series", page: "stuffs.html" },
    { name: "Movies", col: "movies", page: "stuffs.html" },
    { name: "Documentaries", col: "documentaries", page: "stuffs.html" },
    { name: "Links", col: "links", page: "links.html" },
    { name: "Notes", col: "notes", page: "notes.html" }
  ];

  for (const c of collections) {
    if (category !== "All" && category !== c.name) continue;

    try {
      const snap = await getDocs(
  query(collection(db, c.col), where("uid", "==", auth.currentUser.uid))
);

      snap.forEach(doc => {
        const data = doc.data();

        const text = (
          data.title ||
          data.name ||
          data.text ||
          ""
        ).toLowerCase();

        const code = (data.code || "").toLowerCase();

        if (text.includes(value) || code === value) {
          resultsHTML += `
            <div class="search-item"
              data-page="${c.page}"
              data-code="${data.code || ""}">
              <b>${data.code || ""}</b> — ${
                data.title ||
                data.name ||
                data.text?.slice(0, 50)
              }
            </div>
          `;
        }
      });

    } catch (err) {
      console.error("Search error:", err);
    }
  }

  if (!resultsHTML) {
    resultsHTML = `<div style="padding:10px;">No results</div>`;
  }

  searchResults.innerHTML = resultsHTML;
};

/* CLICK RESULT */
searchResults.onclick = (e) => {
  const item = e.target.closest(".search-item");
  if (!item) return;

  const page = item.dataset.page;
  const code = item.dataset.code;

  window.location.href = `${page}?code=${code}`;
};
