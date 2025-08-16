// Timer logic and button handlers for botInterface.html
const vscodeApi = acquireVsCodeApi();
function startSession() {
    vscodeApi.postMessage({ command: 'startSession' });
    startTimer();
}
function stopSession() {
    vscodeApi.postMessage({ command: 'stopSession' });
    stopTimer();
}
let timerInterval;
let startTime = Date.now();
function updateTimer() {
    const now = Date.now();
    const elapsed = now - startTime;
    const totalSeconds = Math.floor(elapsed / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    var timerElem = document.getElementById('session-timer');
    if (timerElem) {
        timerElem.textContent = hours + 'h ' + minutes + 'm ' + seconds + 's';
    }
}
function startTimer() {
    startTime = Date.now();
    if (!timerInterval) {
        timerInterval = setInterval(updateTimer, 1000);
    }
}
function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}
window.addEventListener('message', function(event) {
    if (event.data.command === 'startSession') {
        startTimer();
    } else if (event.data.command === 'stopSession') {
        stopTimer();
    }
});
