import { auth, db } from "./firebase.js";
import {
  collection,
  doc,
  writeBatch,
  getDocs,
  query,
  where
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

  // ✅ CASE 1: plain array (AUTO-DETECT TYPE)
  if (Array.isArray(data)) {
    // Heuristic: detect by fields
    if (data[0]?.title && data[0]?.author !== undefined) {
      return batchInsert("books_fiction", data, user.uid);
    }

    if (data[0]?.text) {
      return batchInsert("quotes", data, user.uid);
    }

    throw new Error("Unsupported array format");
  }

  // ✅ CASE 2: wrapped formats
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
  // 1️⃣ Fetch existing sourceIds
  const existingSnap = await getDocs(
    query(
      collection(db, collectionName),
      where("uid", "==", uid)
    )
  );

  const existingIds = new Set(
    existingSnap.docs
      .map(d => d.data().sourceId)
      .filter(Boolean)
  );

  // 2️⃣ Prepare batch
  const batch = writeBatch(db);
  let added = 0;
  let skipped = 0;

  items.forEach(item => {
    const sourceId = item.id;

    if (sourceId && existingIds.has(sourceId)) {
      skipped++;
      return;
    }

    const ref = doc(collection(db, collectionName));
    batch.set(ref, {
      ...item,
      uid,
      sourceId,              // 👈 store original id
      importedAt: Date.now()
    });

    added++;
  });

  if (added === 0) {
    throw new Error("All items already imported");
  }

  await batch.commit();

  console.log(`Imported: ${added}, Skipped duplicates: ${skipped}`);
}

