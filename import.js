import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

/* ======================
   DOM
====================== */
const importBtn = document.getElementById("importBtn");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");

/* ======================
   AUTH STATE (CRITICAL)
====================== */
let currentUser = null;

onAuthStateChanged(auth, user => {
  currentUser = user;
});

/* ======================
   UI
====================== */
importBtn.onclick = () => fileInput.click();

fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;

  try {
    if (!currentUser) {
      throw new Error("Auth not ready");
    }

    const text = await file.text();
    const data = JSON.parse(text);

    await routeImport(data);

    // ✅ success ONLY after batch.commit()
    showStatus("✅ Import completed successfully");
  } catch (e) {
    console.error(e);
    showStatus("❌ Import failed: " + e.message);
  } finally {
    fileInput.value = "";
  }
};

function showStatus(msg) {
  statusEl.textContent = msg;
  statusEl.classList.remove("hidden");
}

/* ======================
   ROUTER
====================== */
async function routeImport(data) {
  const uid = currentUser.uid;

  // Plain array
  if (Array.isArray(data)) {
    if (data[0]?.title) {
      return batchInsert("books-fiction", data, uid);
    }
    if (data[0]?.text) {
      return batchInsert("quotes", data, uid);
    }
    throw new Error("Unsupported array format");
  }

  // Wrapped formats
  if (Array.isArray(data.quotes)) {
    return batchInsert("quotes", data.quotes, uid);
  }

  if (Array.isArray(data.fiction)) {
    return batchInsert("books-fiction", data.fiction, uid);
  }

  if (Array.isArray(data.nonFiction)) {
    return batchInsert("books-nonfiction", data.nonFiction, uid);
  }

  if (Array.isArray(data.links)) {
    return batchInsert("links", data.links, uid);
  }

  throw new Error("No supported data found");
}

/* ======================
   BATCH INSERT (REAL, SAFE)
====================== */
async function batchInsert(collectionName, items, uid) {
  if (!items.length) {
    throw new Error("No items to import");
  }

  const batch = writeBatch(db);
  let count = 0;

  for (const item of items) {
    if (!item.id) continue;

    // 🔒 deterministic doc id = real duplicate prevention
    const ref = doc(db, collectionName, item.id);

    batch.set(ref, {
      ...item,
      uid,
      importedAt: Date.now()
    });

    count++;
  }

  if (count === 0) {
    throw new Error("No valid items found");
  }

  // 🚨 THIS IS THE POINT OF TRUTH
  await batch.commit();
}
