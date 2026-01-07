import { auth, db } from "./firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let links = [];
let types = new Set();
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
const typeList = document.getElementById("typeList");

const editType = document.getElementById("editType");
const editName = document.getElementById("editName");
const editDesc = document.getElementById("editDesc");
const editTags = document.getElementById("editTags");

/* AUTH */
onAuthStateChanged(auth, u => {
  if (!u) location.href = "index.html";
  user = u;
  loadLinks();
});

/* ADD */
toggleForm.onclick = () => linkForm.classList.toggle("hidden");

saveLinkBtn.onclick = async () => {
  const type = typeInput.value.trim().toUpperCase();
  const name = nameInput.value.trim();
  const desc = descInput.value.trim();
  const tags = tagsInput.value.split(",").map(t => t.trim()).filter(Boolean);

  if (!type || !name) return alert("Type and Link required");

  await addDoc(collection(db, "links"), {
    uid: user.uid,
    type, name, desc, tags
  });

  linkForm.classList.add("hidden");
  typeInput.value = nameInput.value = descInput.value = tagsInput.value = "";
};

/* LOAD */
function loadLinks() {
  const q = query(collection(db, "links"), where("uid", "==", user.uid));
  onSnapshot(q, snap => {
    links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    types.clear();
    links.forEach(l => l.type && types.add(l.type));
    updateTypeList();
    render(links);
  });
}

/* TYPES */
function updateTypeList() {
  typeList.innerHTML = "";
  [...types].sort().forEach(t => {
    const o = document.createElement("option");
    o.value = t;
    typeList.appendChild(o);
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
        <strong class="type ${l.type.toLowerCase()}">${l.type}</strong>
        <a class="copy-link" data-url="${l.name}">${l.name}</a>
        <span>${l.desc || ""}</span>
        <div>${(l.tags||[]).map(t=>`<span class="tag">#${t}</span>`).join("")}</div>
      </div>
      <div class="link-actions">
        <button class="edit-btn">✏️</button>
        <button class="del-btn">🗑️</button>
      </div>
    `;

    row.querySelector(".copy-link").onclick = e => {
      navigator.clipboard.writeText(e.target.dataset.url);
      toast("Copied");
    };

    row.querySelector(".edit-btn").onclick = () => openEdit(l.id);
    row.querySelector(".del-btn").onclick = () => askDelete(l.id);

    linkList.appendChild(row);
  });
}

/* SEARCH */
searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  render(links.filter(l =>
    l.type.toLowerCase().includes(q) ||
    l.name.toLowerCase().includes(q) ||
    (l.desc||"").toLowerCase().includes(q) ||
    (l.tags||[]).some(t=>t.toLowerCase().includes(q))
  ));
};

/* SORT */
sortNameBtn.onclick = () =>
  render([...links].sort((a,b)=>a.name.localeCompare(b.name)));
sortTypeBtn.onclick = () =>
  render([...links].sort((a,b)=>a.type.localeCompare(b.type)));

/* EDIT */
function openEdit(id) {
  const l = links.find(x=>x.id===id);
  editId = id;

  editType.innerHTML = [...types].map(t =>
    `<option ${t===l.type?"selected":""}>${t}</option>`
  ).join("");

  editName.value = l.name;
  editDesc.value = l.desc || "";
  editTags.value = (l.tags||[]).join(", ");
  editOverlay.classList.remove("hidden");
}

saveEditBtn.onclick = async () => {
  await updateDoc(doc(db,"links",editId),{
    type: editType.value,
    name: editName.value,
    desc: editDesc.value,
    tags: editTags.value.split(",").map(t=>t.trim()).filter(Boolean)
  });
  editOverlay.classList.add("hidden");
};

cancelEditBtn.onclick = () => editOverlay.classList.add("hidden");

/* DELETE */
function askDelete(id) {
  deleteId = id;
  confirmBox.classList.remove("hidden");
}
confirmDeleteBtn.onclick = async () => {
  await deleteDoc(doc(db,"links",deleteId));
  confirmBox.classList.add("hidden");
};
cancelDeleteBtn.onclick = () => confirmBox.classList.add("hidden");

/* TOAST */
function toast(msg){
  const t=document.createElement("div");
  t.textContent=msg;
  t.style.position="fixed";
  t.style.bottom="30px";
  t.style.left="50%";
  t.style.transform="translateX(-50%)";
  t.style.border="1px solid #00ff9c";
  t.style.background="black";
  t.style.padding="6px 12px";
  document.body.appendChild(t);
  setTimeout(()=>t.remove(),1000);
}
