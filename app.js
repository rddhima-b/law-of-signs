const SUPABASE_VIDEO_BASE_URL = "https://zophxtwisykqfhkfgmbp.supabase.co/storage/v1/object/public/videos/videos/";

function getVideoUrl(letter) {
  if (!letter) {
    console.error("Letter is undefined");
    return "";
  }

  const path = `videos/${letter}.mp4`;
  const fallbackUrl = `${SUPABASE_VIDEO_BASE_URL}${encodeURIComponent(letter)}.mp4`;

  if (!window.supabaseClient?.storage) {
    return fallbackUrl;
  }

  try {
    const { data } = window.supabaseClient
      .storage
      .from("videos")
      .getPublicUrl(path);

    return data?.publicUrl || fallbackUrl;
  } catch (error) {
    console.error("Failed to build Supabase video URL", error);
    return fallbackUrl;
  }
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
  let userHasInteracted = false;
  const pageKey = window.supabaseApp?.getPageKey?.() ?? "lesson";

  const title = document.getElementById("letterTitle");
  const video = document.getElementById("letterVideo");
  const nav = document.getElementById("letterNav");

  if (!title || !video || !nav) {
    return;
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

  function saveProgressInBackground(currentLetter) {
    void persistProgress(currentLetter).catch((error) => {
      console.error("Failed to save lesson progress", error);
    });
  }

  async function restoreProgress() {
    try {
      const savedProgress = await window.supabaseApp?.loadProgress?.(pageKey);

      if (userHasInteracted) {
        return;
      }

      if (savedProgress?.current_index !== undefined && savedProgress?.current_index !== null) {
        currentIndex = Math.min(savedProgress.current_index, letters.length - 1);
        render({ save: false });
        return;
      }

      saveProgressInBackground(letters[currentIndex]);
    } catch (error) {
      console.error("Failed to load lesson progress", error);
    }
  }

  function render({ save = true } = {}) {
    const currentLetter = letters[currentIndex];

    title.textContent = `Observe the sign for the letter ${currentLetter.toUpperCase()}:`;

    const url = getVideoUrl(currentLetter);

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
          userHasInteracted = true;
          currentIndex = index;
          render();
        };
      }

      p.appendChild(a);
      nav.appendChild(p);
    });

    if (save) {
      saveProgressInBackground(currentLetter);
    }
  }

  render({ save: false });
  void restoreProgress();
});
