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