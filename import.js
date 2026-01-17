import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";

const importBtn = document.getElementById("importBtn");
const fileInput = document.getElementById("fileInput");
const statusEl = document.getElementById("status");

importBtn.onclick = () => fileInput.click();

fileInput.onchange = async () => {
  const file = fileInput.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await routeImport(data);

    showStatus("✅ Import completed successfully");
  } catch (e) {
    console.error(e);
    showStatus("❌ Invalid or unsupported JSON file");
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
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated");

  if (Array.isArray(data.quotes)) {
    return batchInsert("quotes", data.quotes, user.uid);
  }

  if (Array.isArray(data.fiction)) {
    return batchInsert("books_fiction", data.fiction, user.uid);
  }

  if (Array.isArray(data.nonFiction)) {
    return batchInsert("books_nonfiction", data.nonFiction, user.uid);
  }

  if (Array.isArray(data.links)) {
    return batchInsert("links", data.links, user.uid);
  }

  throw new Error("No supported data found");
}

/* ======================
   BATCH INSERT
====================== */
async function batchInsert(collectionName, items, uid) {
  const batch = writeBatch(db);

  items.forEach(item => {
    const ref = doc(collection(db, collectionName));
    batch.set(ref, {
      ...item,
      uid,
      importedAt: Date.now()
    });
  });

  await batch.commit();
}
