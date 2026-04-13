// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then(reg => console.log("Service Worker registered"))
      .catch(err => console.log("Service Worker failed", err));
  });
}

// Lesson button navigation (Duolingo-style)
document.querySelectorAll(".lesson").forEach(btn => {
  btn.addEventListener("click", () => {
    const link = btn.dataset.link;
    if (link) {
      window.location.href = link;
    }
  });
});

const letters = ["a", "b", "c", "d", "e"];

let currentIndex = 0;

const title = document.getElementById("letterTitle");
const video = document.getElementById("letterVideo");
const nav = document.getElementById("letterNav");

function render() {
  // Update title
  title.textContent = `Observe the sign for the letter ${letters[currentIndex].toUpperCase()}:`;

  // Update video
  video.src = `videos/${letters[currentIndex]}.mp4`;

  // Clear nav
  nav.innerHTML = "";

  // Rebuild buttons
  letters.forEach((letter, index) => {
    const p = document.createElement("p");
    p.className = "intro";

    const a = document.createElement("a");
    a.textContent = `Letter ${letter.toUpperCase()}`;
    a.className = "b";

    if (index === currentIndex) {
      p.classList.add("active");
    } else {
      a.onclick = () => {
        currentIndex = index;
        render();
      };
    }

    p.appendChild(a);
    nav.appendChild(p);
  });
}

// Initialize AFTER page loads
window.onload = render;