// Register Service Worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
      .then(() => console.log("Service Worker registered"))
      .catch(err => console.log("Service Worker failed", err));
  });
}

window.onload = () => {

  const letters = document.body.dataset.letters.split(",");
  let currentIndex = 0;

  const title = document.getElementById("letterTitle");
  const video = document.getElementById("letterVideo");
  const nav = document.getElementById("letterNav");

  function render() {
    const currentLetter = letters[currentIndex];

    // Animate title
    title.classList.remove("fade-slide");
    void title.offsetWidth;
    title.classList.add("fade-slide");

    title.textContent = `Observe the sign for the letter ${currentLetter.toUpperCase()}:`;

    // Animate video
    video.classList.remove("fade-slide");
    void video.offsetWidth;
    video.classList.add("fade-slide");

    video.src = `videos/${currentLetter}.mp4`;

    // Build buttons
    nav.innerHTML = "";

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

  render();
};