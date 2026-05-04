function getVideoUrl(letter) {
  const { data } = window.supabaseClient
    .storage
    .from("videos")
    .getPublicUrl(`videos/${letter}.mp4`);

  return data.publicUrl;
}

const correctSound = new Audio("audio/correct.mp3");
const wrongSound = new Audio("audio/wrong.mp3");

window.addEventListener("DOMContentLoaded", async () => {
  const practiceLetters = document.body.dataset.practiceLetters;

  if (!practiceLetters) {
    return;
  }

  const baseLetters = practiceLetters.split(",");
  let letters = shuffleLetters(baseLetters);

  let index = 0;
  let firstTryCorrect = 0;
  let missedCurrentQuestion = false;
  let currentQuestionScored = false;
  const pageKey = window.supabaseApp?.getPageKey?.() ?? "practice";

  const video = document.getElementById("practiceVideo");
  const input = document.getElementById("answerInput");
  const output = document.getElementById("output");
  const nextBtn = document.getElementById("next");
  const answer = document.getElementById("answer");

  if (!video || !input || !output || !nextBtn || !answer) {
    return;
  }

  const videoContainer = video.closest(".center");
  const inputContainer = input.closest(".input");
  const questionTitle = document.querySelector("h2");
  const completeView = document.createElement("section");
  completeView.className = "practice-complete-view";
  completeView.hidden = true;
  inputContainer?.after(completeView);

  function shuffleLetters(list) {
    const shuffled = [...list];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
    }

    return shuffled;
  }

  function hasSameLetters(savedLetters, expectedLetters) {
    if (!Array.isArray(savedLetters) || savedLetters.length !== expectedLetters.length) {
      return false;
    }

    return expectedLetters.every((letter) => savedLetters.includes(letter));
  }

  function showQuestionControls() {
    document.body.classList.remove("practice-finished");
    completeView.hidden = true;

    if (questionTitle) {
      questionTitle.style.display = "";
    }

    if (videoContainer) {
      videoContainer.style.display = "";
    }

    if (inputContainer) {
      inputContainer.style.display = "";
    }

    input.style.display = "inline-block";
    nextBtn.style.display = "none";
    answer.style.display = "inline-block";
  }

  function showCorrectControls() {
    input.style.display = "none";
    nextBtn.style.display = "inline-block";
    answer.style.display = "none";
  }

  function showCompleteView() {
    const percentCorrect = Math.round((firstTryCorrect / letters.length) * 100);

    if (videoContainer) {
      videoContainer.style.display = "none";
    }

    if (questionTitle) {
      questionTitle.style.display = "none";
    }

    if (inputContainer) {
      inputContainer.style.display = "none";
    }

    document.body.classList.add("practice-finished");
    completeView.hidden = false;
    completeView.innerHTML = `
      <div class="practice-complete">
        <h3>Practice complete!</h3>
        <p>You got ${percentCorrect}% right on the first try.</p>
        <p>${firstTryCorrect} out of ${letters.length} correct.</p>
        <button class="btn" type="button" onclick="restartPractice()">Try again</button>
        <a class="btn" href="${document.body.dataset.practiceCompleteHref || "beginning.html"}">Back to lessons</a>
      </div>
    `;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function completePractice() {
    index = letters.length - 1;
    showCompleteView();
    void persistProgress(true);
  }

  const savedProgress = await window.supabaseApp?.loadProgress?.(pageKey);

  if (hasSameLetters(savedProgress?.meta?.letters, baseLetters)) {
    letters = savedProgress.meta.letters;
  }

  if (Number.isInteger(savedProgress?.meta?.firstTryCorrect)) {
    firstTryCorrect = savedProgress.meta.firstTryCorrect;
  }

  if (typeof savedProgress?.meta?.missedCurrentQuestion === "boolean") {
    missedCurrentQuestion = savedProgress.meta.missedCurrentQuestion;
  }

  if (typeof savedProgress?.meta?.currentQuestionScored === "boolean") {
    currentQuestionScored = savedProgress.meta.currentQuestionScored;
  }

  if (savedProgress?.current_index !== undefined && savedProgress?.current_index !== null) {
    index = Math.min(savedProgress.current_index, letters.length - 1);
  }

  async function persistProgress(completed = false) {
    await window.supabaseApp?.saveProgress?.({
      pageKey,
      pageType: "practice",
      currentIndex: index,
      currentValue: letters[index],
      completed,
      totalItems: letters.length,
      meta: { letters, firstTryCorrect, missedCurrentQuestion, currentQuestionScored },
    });
  }

  function loadLetter() {
    const letter = letters[index];

    console.log("👉 Letter:", letter);

    const url = getVideoUrl(letter);

    video.src = url;
    video.load();
    video.play().catch(() => {});

    input.value = "";
    output.innerHTML = "";
    showQuestionControls();
    input.focus();

    void persistProgress(false);
  }

  window.showAnswer = async () => {
    const correct = letters[index].toLowerCase();
    const user = input.value.trim().toLowerCase();

    if (user === correct) {
      if (!missedCurrentQuestion && !currentQuestionScored) {
        firstTryCorrect++;
      }
      currentQuestionScored = true;
      correctSound.play().catch(() => {});

      if (index === letters.length - 1) {
        completePractice();
        return;
      }

      output.innerHTML = "Correct!";
      showCorrectControls();
      void persistProgress(false);
    } else {
      missedCurrentQuestion = true;
      output.innerHTML = "Try again!";
      wrongSound.play().catch(() => {});
      void persistProgress(false);
    }
  };

  window.nextPractice = async () => {
    index++;

    if (index >= letters.length) {
      completePractice();
      return;
    }

    missedCurrentQuestion = false;
    currentQuestionScored = false;
    loadLetter();
    await persistProgress(false);
  };

  window.restartPractice = async () => {
    letters = shuffleLetters(baseLetters);
    index = 0;
    firstTryCorrect = 0;
    missedCurrentQuestion = false;
    currentQuestionScored = false;

    loadLetter();
    await persistProgress(false);
  };

  if (savedProgress?.completed) {
    showCompleteView();
    return;
  }

  loadLetter();
});
