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

/* PLAYLIST (EDIT THIS) */
const playlist = [
  { title: "POLICE STATE", src: "music/police-state.mp3" },
  { title: "MALAI KE MARCHAS", src: "music/malai-ke-marchas.mp3" },
];

let currentIndex = 0;
let isPlaying = false;

/* LOAD TRACK */
function loadTrack(index) {
  const track = playlist[index];
  if (!track) return;

  audio.src = track.src;
  titleEl.textContent = track.title;
}

/* PLAY / PAUSE */
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

/* NEXT */
function nextTrack() {
  currentIndex = (currentIndex + 1) % playlist.length;
  loadTrack(currentIndex);
  if (isPlaying) audio.play();
}

/* PREVIOUS */
function prevTrack() {
  currentIndex =
    (currentIndex - 1 + playlist.length) % playlist.length;
  loadTrack(currentIndex);
  if (isPlaying) audio.play();
}

/* AUTO ADVANCE */
audio.addEventListener("ended", nextTrack);

/* CONTROLS */
playBtn.onclick = togglePlay;
nextBtn.onclick = nextTrack;
prevBtn.onclick = prevTrack;

/* INIT */
loadTrack(currentIndex);
