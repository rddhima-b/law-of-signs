// console.log("Supabase:", window.supabaseClient);
// console.log("CLIENT:", window.supabaseClient);
// console.log("STORAGE:", window.supabaseClient?.storage);
// console.log("🔥 NEW APP.JS LOADED");

// function getVideoUrl(letter) {
//   const { data } = window.supabaseClient
//     .storage
//     .from("videos")
//     .getPublicUrl(`videos/${letter}.mp4`);

//   return data.publicUrl;
// }

// // Service worker
// if ("serviceWorker" in navigator) {
//   window.addEventListener("load", () => {
//     navigator.serviceWorker.register("/service-worker.js");
//   });
// }

// window.onload = () => {

//   const letters = document.body.dataset.letters.split(",");
//   let currentIndex = 0;

//   const title = document.getElementById("letterTitle");
//   const video = document.getElementById("letterVideo");
//   const nav = document.getElementById("letterNav");

//   // preload
//   letters.forEach(letter => {
//     const vid = document.createElement("video");
//     vid.src = getVideoUrl(letter);
//     vid.preload = "auto";
//   });

//   function render() {
//     const currentLetter = letters[currentIndex];

//     title.textContent =
//       `Observe the sign for the letter ${currentLetter.toUpperCase()}:`;

//     video.src = getVideoUrl(currentLetter);
//     video.load();
//     video.play().catch(() => {});

//     nav.innerHTML = "";

//     letters.forEach((letter, index) => {
//       const p = document.createElement("p");
//       const a = document.createElement("a");

//       p.classList.add("intro");
//       a.classList.add("b");
//       a.textContent = `Letter ${letter.toUpperCase()}`;

//       if (index === currentIndex) {
//         p.classList.add("active");
//       } else {
//         a.onclick = () => {
//           currentIndex = index;
//           render();
//         };
//       }

//       p.appendChild(a);
//       nav.appendChild(p);
//     });

//     console.log("Current letter:", currentLetter);
// console.log("Final URL:", getVideoUrl(currentLetter));
//   }

//   render();
// };

console.log("🔥 NEW APP.JS LOADED");
console.log("Supabase:", window.supabaseClient);
console.log("CLIENT:", window.supabaseClient);
console.log("STORAGE:", window.supabaseClient?.storage);

// -----------------------------
// Supabase Video URL Function
// -----------------------------
function getVideoUrl(letter) {
  if (!letter) {
    console.error("❌ Letter is undefined");
    return "";
  }

  const path = `videos/${letter}.mp4`;

  const { data } = window.supabaseClient
    .storage
    .from("videos")
    .getPublicUrl(path);

  console.log("📦 Requested path:", path);
  console.log("🔗 Final URL:", data.publicUrl);

  return data.publicUrl;
}

// -----------------------------
// Service Worker
// -----------------------------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js");
  });
}

// -----------------------------
// Main App Logic
// -----------------------------
window.onload = () => {
  const letters = document.body.dataset.letters.split(",");
  let currentIndex = 0;

  const title = document.getElementById("letterTitle");
  const video = document.getElementById("letterVideo");
  const nav = document.getElementById("letterNav");

  console.log("📚 Letters loaded:", letters);

  // preload videos
  letters.forEach(letter => {
    const vid = document.createElement("video");
    vid.src = getVideoUrl(letter);
    vid.preload = "auto";
  });

  function render() {
    const currentLetter = letters[currentIndex];

    console.log("👉 Current letter:", currentLetter);

    title.textContent =
      `Observe the sign for the letter ${currentLetter.toUpperCase()}:`;

    const url = getVideoUrl(currentLetter);

    // VIDEO LOAD
    video.pause();
    video.src = url;
    video.load();
    video.play().catch(() => {});

    // NAV UI
    nav.innerHTML = "";

    letters.forEach((letter, index) => {
      const p = document.createElement("p");
      const a = document.createElement("a");

      p.classList.add("intro");
      a.classList.add("b");
      a.textContent = `Letter ${letter.toUpperCase()}`;

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

    console.log("🎬 Final video URL:", url);
  }

  render();
};