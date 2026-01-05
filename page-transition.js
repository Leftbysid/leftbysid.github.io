let isNavigating = false;

// ENTRY glitch
window.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("page-loaded");
});

// INTERCEPT ALL LINK CLICKS
document.addEventListener("click", e => {
  const link = e.target.closest("a");
  if (!link) return;

  const href = link.getAttribute("href");
  if (
    !href ||
    href.startsWith("#") ||
    link.target === "_blank" ||
    isNavigating
  ) return;

  e.preventDefault();
  triggerExit(href);
});

// EXIT HANDLER
function triggerExit(href) {
  isNavigating = true;
  document.body.classList.remove("page-loaded");
  document.body.classList.add("page-exit");

  setTimeout(() => {
    window.location.href = href;
  }, 1100); // MUST match CSS duration
}