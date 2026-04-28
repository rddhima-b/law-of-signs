console.log("🔥 Practice loaded");

function getVideoUrl(letter) {
  const { data } = window.supabaseClient
    .storage
    .from("videos")
    .getPublicUrl(`videos/${letter}.mp4`);

  return data.publicUrl;
}

const correctSound = new Audio("audio/correct.mp3");
const wrongSound = new Audio("audio/wrong.mp3");

window.addEventListener("DOMContentLoaded", () => {
  const letters = document.body.dataset.practiceLetters.split(",");

  let index = 0;

  const video = document.getElementById("practiceVideo");
  const input = document.getElementById("answerInput");
  const output = document.getElementById("output");
  const nextBtn = document.getElementById("next");
  const answer = document.getElementById("answer");

  function loadLetter() {
    const letter = letters[index];

    console.log("👉 Letter:", letter);

    const url = getVideoUrl(letter);

    video.src = url;
    video.load();
    video.play().catch(() => {});

    input.value = "";
    output.innerHTML = "";
    nextBtn.style.display = "none";
  }

  window.showAnswer = () => {
    const correct = letters[index].toLowerCase();
    const user = input.value.trim().toLowerCase();

    if (user === correct) {
      output.innerHTML = "Correct!";
      correctSound.play().catch(() => {});
      nextBtn.style.display = "inline-block";
      answer.style.display = "none";
    } else {
      output.innerHTML = "Try again!";
      wrongSound.play().catch(() => {});
    }
  };

  window.nextPractice = () => {
    index++;

    if (index >= letters.length) {
      window.location.href =
        document.body.dataset.practiceCompleteHref;
      return;
    }

    loadLetter();
  };

  loadLetter();
});