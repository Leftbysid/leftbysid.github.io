import { auth } from "./firebase.js";
import { onAuthStateChanged } from
  "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";

let checked = false;

export function requireAuth(redirectTo = "index.html") {
  if (checked) return;
  checked = true;

  onAuthStateChanged(auth, user => {
    if (!user) {
      window.location.replace(redirectTo);
    }
  });
}
