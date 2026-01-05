// ENTRY glitch
window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-loaded");
});

// EXIT glitch on navigation
document.addEventListener("click", e => {
  const link = e.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (!href || href.startsWith("#") || link.target === "_blank") return;

  e.preventDefault();

  document.body.classList.remove("page-loaded");
  document.body.classList.add("page-exit");

  setTimeout(() => {
    window.location.href = href;
  }, 350); // MUST match CSS duration
});