function showAnswer() {
    
const input = document.getElementById("answerInput").value.trim();
const output = document.getElementById("output");
const sound = new Audio('audio/correct.mp3');
const correctAnswer = "d";

    if (input.toLowerCase() === correctAnswer) {
        output.textContent = "Your answer: " + input +  " is CORRECT!";
        output.style.color = "green";
        document.getElementById("next").innerHTML = "Next Practice";
        //document.getElementById('effect').addEventListener(() => {sound.currentTime = 0; 
        // sound.play().catch(err => console.error("Playback failed:", err));});
        document.getElementById("next").style.display = "inline-block"; 
        sound.currentTime = 0;
        sound.play().catch(err => console.error("Playback failed:", err));
    } 

    else {
        output.textContent = "WRONG";
        output.style.color = "red";
    }
}