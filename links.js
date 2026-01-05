import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let links = [];
let editId = null;
let deleteId = null;
let user = null;

/* ELEMENTS */
const linkForm = document.getElementById("linkForm");
const linkList = document.getElementById("linkList");
const confirmBox = document.getElementById("confirmBox");
const editOverlay = document.getElementById("editOverlay");

const toggleForm = document.getElementById("toggleForm");
const saveLinkBtn = document.getElementById("saveLink");

const sortNameBtn = document.getElementById("sortName");
const sortTypeBtn = document.getElementById("sortType");
const searchInput = document.getElementById("search");

const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
const cancelDeleteBtn = document.getElementById("cancelDeleteBtn");

const saveEditBtn = document.getElementById("saveEditBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

/* INPUTS */
const typeInput = document.getElementById("type");
const nameInput = document.getElementById("name");
const descInput = document.getElementById("desc");
const tagsInput = document.getElementById("tags");

const editType = document.getElementById("editType");
const editName = document.getElementById("editName");
const editDesc = document.getElementById("editDesc");
const editTags = document.getElementById("editTags");

/* TYPE OPTIONS */
const TYPE_OPTIONS = ["VIDEO", "ARTICLE", "TOOL", "CODE", "REFERENCE"];

/* LOCK POPUPS */
window.addEventListener("DOMContentLoaded", () => {
  editOverlay.classList.add("hidden");
  confirmBox.classList.add("hidden");
});

/* AUTH */
onAuthStateChanged(auth, u => {
  if (!u) location.href = "index.html";
  user = u;
  loadLinks();
});

/* ADD FORM */
toggleForm.onclick = () => linkForm.classList.toggle("hidden");

saveLinkBtn.onclick = async () => {
  if (!user) return;

  const type = typeInput.value;
  const name = nameInput.value.trim();
  const desc = descInput.value.trim();
  const tags = tagsInput.value
    .split(",")
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  if (!type || !name) {
    alert("Type and Name are required");
    return;
  }

  await addDoc(collection(db, "links"), {
    uid: user.uid,
    type,
    name,
    desc,
    tags
  });

  linkForm.classList.add("hidden");
  typeInput.value = "";
  nameInput.value = "";
  descInput.value = "";
  tagsInput.value = "";
};

/* LOAD */
function loadLinks() {
  const q = query(collection(db, "links"), where("uid", "==", user.uid));
  onSnapshot(q, snap => {
    links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render(links);
  });
}

/* RENDER */
function render(list) {
  linkList.innerHTML = "";

  list.forEach(l => {
    const row = document.createElement("div");
    row.className = "link-row";

    row.innerHTML = `
      <div class="link-text">
        <strong>${l.type}</strong>
        <span>${l.name}</span>
        <span>${l.desc || ""}</span>
        <div>
          ${(l.tags || []).map(t => `<span class="tag">#${t}</span>`).join("")}
        </div>
      </div>
      <div class="link-actions">
        <button class="edit-btn">✏️</button>
        <button class="del-btn">🗑️</button>
      </div>
    `;

    row.querySelector(".edit-btn").onclick = () => openEdit(l.id);
    row.querySelector(".del-btn").onclick = () => askDelete(l.id);

    linkList.appendChild(row);
  });
}

/* SEARCH */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();

  const filtered = links.filter(l =>
    l.type.toLowerCase().includes(q) ||
    l.name.toLowerCase().includes(q) ||
    (l.desc || "").toLowerCase().includes(q) ||
    (l.tags || []).some(t => t.includes(q))
  );

  render(filtered);
};

/* SORT */
sortNameBtn.onclick = () =>
  render([...links].sort((a,b)=>a.name.localeCompare(b.name)));

sortTypeBtn.onclick = () =>
  render([...links].sort((a,b)=>a.type.localeCompare(b.type)));

/* EDIT */
function openEdit(id) {
  const l = links.find(x => x.id === id);
  editId = id;

  editType.innerHTML = TYPE_OPTIONS
    .map(t => `<option ${t === l.type ? "selected" : ""}>${t}</option>`)
    .join("");

  editName.value = l.name;
  editDesc.value = l.desc || "";
  editTags.value = (l.tags || []).join(", ");

  editOverlay.classList.remove("hidden");
}

saveEditBtn.onclick = async () => {
  if (!editId) return;

  const tags = editTags.value
    .split(",")
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);

  await updateDoc(doc(db, "links", editId), {
    type: editType.value,
    name: editName.value.trim(),
    desc: editDesc.value.trim(),
    tags
  });

  closeEdit();
};

cancelEditBtn.onclick = closeEdit;

function closeEdit() {
  editId = null;
  editOverlay.classList.add("hidden");
}

/* DELETE */
function askDelete(id) {
  deleteId = id;
  confirmBox.classList.remove("hidden");
}

confirmDeleteBtn.onclick = async () => {
  await deleteDoc(doc(db, "links", deleteId));
  closeConfirm();
};

cancelDeleteBtn.onclick = closeConfirm;

function closeConfirm() {
  deleteId = null;
  confirmBox.classList.add("hidden");
}
