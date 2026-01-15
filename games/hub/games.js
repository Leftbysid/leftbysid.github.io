/* =========================
   GAMES HUB CONTROLLER
   (Lightweight, future-safe)
========================= */

document.addEventListener("DOMContentLoaded", () => {
  // All game cards
  const cards = document.querySelectorAll(".game-card");

  cards.forEach(card => {
    // Disabled games do nothing
    if (card.classList.contains("disabled")) {
      card.addEventListener("click", e => {
        e.preventDefault();
      });
      return;
    }

    // Subtle focus effect (keyboard users)
    card.setAttribute("tabindex", "0");

    card.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        card.click();
      }
    });
  });
});

/* =========================
   FUTURE IDEAS (NOT ACTIVE)
========================= */

/*
- Highlight recently played game
- Remember last game in localStorage
- Add game categories
- Animate card focus
- Add game metadata loading
*/
