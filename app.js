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

  return data.publicUrl;
}

if ("serviceWorker" in navigator && !window.siteServiceWorkerRegistered) {
  window.siteServiceWorkerRegistered = true;

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").catch((error) => {
      console.error("Failed to register service worker", error);
    });
  });
}

window.addEventListener("DOMContentLoaded", async () => {
  const letterList = document.body.dataset.letters;

  if (!letterList) {
    return;
  }

  const letters = letterList.split(",");
  let currentIndex = 0;
  const pageKey = window.supabaseApp?.getPageKey?.() ?? "lesson";

  const title = document.getElementById("letterTitle");
  const video = document.getElementById("letterVideo");
  const nav = document.getElementById("letterNav");

  if (!title || !video || !nav) {
    return;
  }

  const savedProgress = await window.supabaseApp?.loadProgress?.(pageKey);

  if (savedProgress?.current_index !== undefined && savedProgress?.current_index !== null) {
    currentIndex = Math.min(savedProgress.current_index, letters.length - 1);
  }

  letters.forEach((letter) => {
    const vid = document.createElement("video");
    vid.src = getVideoUrl(letter);
    vid.preload = "auto";
  });

  async function persistProgress(currentLetter) {
    await window.supabaseApp?.saveProgress?.({
      pageKey,
      pageType: "lesson",
      currentIndex,
      currentValue: currentLetter,
      completed: currentIndex === letters.length - 1,
      totalItems: letters.length,
      meta: { letters },
    });
  }

  async function render() {
    const currentLetter = letters[currentIndex];

    title.textContent = `Observe the sign for the letter ${currentLetter.toUpperCase()}:`;

    const url = getVideoUrl(currentLetter);

    await persistProgress(currentLetter);
    video.pause();
    video.src = url;
    video.load();
    video.play().catch(() => {});

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
          void render();
        };
      }

      p.appendChild(a);
      nav.appendChild(p);
    });
  }

  await render();
});
