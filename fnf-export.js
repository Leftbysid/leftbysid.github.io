/* ===============================
   EXPORT LIBRARY (PDF + JSON)
   Used on fnf.html
================================ */

import { auth, db } from "./firebase.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { requireAuth } from "./auth-guard.js";

requireAuth();

/* ===============================
   ELEMENTS
================================ */
const exportPdfBtn = document.getElementById("exportPdfBtn");
const exportJsonBtn = document.getElementById("exportJsonBtn");

/* ===============================
   AUTH
================================ */
let currentUser = null;

onAuthStateChanged(auth, user => {
  if (!user) return;
  currentUser = user;
});

/* ===============================
   FETCH DATA
================================ */
async function fetchLibrary() {
  if (!currentUser) return null;

  const fictionQ = query(
    collection(db, "books_fiction"),
    where("uid", "==", currentUser.uid)
  );

  const nonfictionQ = query(
    collection(db, "books_nonfiction"),
    where("uid", "==", currentUser.uid)
  );

  const [fictionSnap, nonfictionSnap] = await Promise.all([
    getDocs(fictionQ),
    getDocs(nonfictionQ)
  ]);

  const normalize = snap =>
    snap.docs.map(d => ({
      title: d.data().title || "",
      author: d.data().author || "",
      category: d.data().category || "",
      date: d.data().date || "",
      read: !!d.data().read,
      owned: !!d.data().owned
    }));

  return {
    fiction: normalize(fictionSnap),
    nonfiction: normalize(nonfictionSnap)
  };
}

/* ===============================
   EXPORT JSON
================================ */
exportJsonBtn.onclick = async () => {
  const data = await fetchLibrary();
  if (!data) return;

  const payload = {
    exportedAt: new Date().toISOString(),
    fiction: data.fiction,
    nonfiction: data.nonfiction
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  download(url, "library-backup.json");
};

/* ===============================
   EXPORT PDF
================================ */
exportPdfBtn.onclick = async () => {
  const data = await fetchLibrary();
  if (!data) return;

  // jsPDF must be loaded via CDN in fnf.html
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  let y = 10;

  function section(title, items) {
    pdf.setFontSize(14);
    pdf.text(title, 10, y);
    y += 8;

    pdf.setFontSize(10);

    if (!items.length) {
      pdf.text("— No entries —", 10, y);
      y += 6;
      return;
    }

    items.forEach(b => {
      const line =
        `• ${b.title} — ${b.author}` +
        ` | ${b.category}` +
        ` | ${b.read ? "READ" : "UNREAD"}` +
        ` | ${b.owned ? "OWNED" : "NOT OWNED"}`;

      if (y > 280) {
        pdf.addPage();
        y = 10;
      }

      pdf.text(line, 10, y);
      y += 6;
    });

    y += 6;
  }

  section("FICTION", data.fiction);
  section("NON-FICTION", data.nonfiction);

  pdf.save("library-backup.pdf");
};

/* ===============================
   UTIL
================================ */
function download(url, filename) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
