import { auth, db } from "../firebase.js";
import {
  collection, addDoc, deleteDoc, updateDoc,
  doc, query, where, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.7.0/firebase-firestore.js";
import { onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

const BASE_URL =
  "https://raw.githubusercontent.com/YOUR_USERNAME/YOUR_REPO/main/images/assets/uploads/";

let images = [];
let user = null;
let editId = null;
let deleteId = null;

const imageGrid = document.getElementById("imageGrid");
const searchInput = document.getElementById("search");

const filenameInput = document.getElementById("filename");
const titleInput = document.getElementById("titleInput");
const tagsInput = document.getElementById("tagsInput");

const editTitle = document.getElementById("editTitle");
const editTags = document.getElementById("editTags");

onAuthStateChanged(auth, u => {
  if (!u) location.href = "../index.html";
  user = u;
  loadImages();
});

document.getElementById("toggleForm").onclick =
  () => document.getElementById("imageForm").classList.toggle("hidden");

document.getElementById("saveImage").onclick = async () => {
  const filename = filenameInput.value.trim();
  if (!filename) return alert("Filename required");

  await addDoc(collection(db, "images"), {
    uid: user.uid,
    filename,
    title: titleInput.value.trim(),
    tags: tagsInput.value.split(",").map(t=>t.trim()).filter(Boolean),
    createdAt: Date.now()
  });

  filenameInput.value = titleInput.value = tagsInput.value = "";
};

function loadImages() {
  const q = query(collection(db,"images"), where("uid","==",user.uid));
  onSnapshot(q, snap => {
    images = snap.docs.map(d => ({ id:d.id, ...d.data() }));
    render(images);
  });
}

function render(list) {
  imageGrid.innerHTML = "";

  list.forEach(img => {
    const card = document.createElement("div");
    card.className = "image-card";

    const url = BASE_URL + img.filename;

    card.innerHTML = `
      <img src="${url}">
      <div class="image-title">${img.title || img.filename}</div>
      <div class="image-tags">${(img.tags||[]).map(t=>`#${t}`).join(" ")}</div>
      <div class="image-actions">
        <button onclick="downloadImage('${url}')">⬇</button>
        <button onclick="editImage('${img.id}')">✏️</button>
        <button onclick="askDelete('${img.id}')">🗑️</button>
      </div>
    `;

    imageGrid.appendChild(card);
  });
}

searchInput.oninput = () => {
  const q = searchInput.value.toLowerCase();
  render(images.filter(i =>
    i.title?.toLowerCase().includes(q) ||
    i.filename.toLowerCase().includes(q) ||
    (i.tags||[]).some(t=>t.toLowerCase().includes(q))
  ));
};

document.getElementById("exportJson").onclick = () => {
  const data = images.map(({filename,title,tags}) => ({filename,title,tags}));
  const blob = new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "images.json";
  a.click();
};

window.downloadImage = url => {
  const a = document.createElement("a");
  a.href = url;
  a.download = "";
  a.click();
};

window.editImage = id => {
  const img = images.find(i=>i.id===id);
  editId = id;
  editTitle.value = img.title || "";
  editTags.value = (img.tags||[]).join(", ");
  document.getElementById("editOverlay").classList.remove("hidden");
};

document.getElementById("saveEditBtn").onclick = async () => {
  await updateDoc(doc(db,"images",editId),{
    title: editTitle.value.trim(),
    tags: editTags.value.split(",").map(t=>t.trim()).filter(Boolean)
  });
  document.getElementById("editOverlay").classList.add("hidden");
};

document.getElementById("cancelEditBtn").onclick =
  () => document.getElementById("editOverlay").classList.add("hidden");

window.askDelete = id => {
  deleteId = id;
  document.getElementById("confirmBox").classList.remove("hidden");
};

document.getElementById("confirmDeleteBtn").onclick = async () => {
  await deleteDoc(doc(db,"images",deleteId));
  document.getElementById("confirmBox").classList.add("hidden");
};

document.getElementById("cancelDeleteBtn").onclick =
  () => document.getElementById("confirmBox").classList.add("hidden");
