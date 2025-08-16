(function () {
  const vscode = acquireVsCodeApi();

  // DOM elements
  const submitBtn = document.getElementById("submitBtn");
  const closeBtn = document.getElementById("closeBtn");
  const summaryTextarea = document.getElementById("summary");
  const resultSection = document.getElementById("result");
  const resultContent = document.querySelector(".result-content");
  const overlay = document.getElementById("overlay");
  const truncationNotice = document.getElementById("truncation-notice");

  // Handle submit button click
  submitBtn.addEventListener("click", () => {
    const summary = summaryTextarea.value.trim();
    if (summary) {
      // Show loading overlay
      overlay.style.display = "flex";

      // Disable submit button
      submitBtn.disabled = true;

      // Send message to extension
      vscode.postMessage({
        type: "submit-summary",
        text: summary,
      });
    }
  });

  // Handle close button click
  closeBtn.addEventListener("click", () => {
    vscode.postMessage({
      type: "close-panel",
    });
  });

  // Handle messages from extension
  window.addEventListener("message", (event) => {
    const message = event.data;

    switch (message.type) {
      case "update-stats":
        updateStats(message);
        break;
      case "update-code-preview":
        updateCodePreview(message);
        break;
      case "review-result":
        handleReviewResult(message);
        break;
      case "loading":
        handleLoading(message.loading);
        break;
    }
  });

  function updateStats({ charCount, lineCount, reviewTime }) {
    document.getElementById("char-count").textContent = charCount;
    document.getElementById("line-count").textContent = lineCount;
    document.getElementById("review-time").textContent = reviewTime;
  }

  function updateCodePreview({ codeText, truncated }) {
    document.getElementById("code-preview").textContent = codeText;
    truncationNotice.style.display = truncated ? "block" : "none";
  }

  function handleReviewResult({ text, ok }) {
    // Hide loading overlay
    overlay.style.display = "none";

    // Show result
    resultContent.textContent = text;
    resultSection.style.display = "block";

    // Show close button
    closeBtn.style.display = "inline-block";

    // Reset submit button if there was an error
    if (!ok) {
      submitBtn.disabled = false;
    }
  }

  function handleLoading(loading) {
    overlay.style.display = loading ? "flex" : "none";
  }
})();
