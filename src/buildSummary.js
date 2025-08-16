(function () {
  const vscode = acquireVsCodeApi();

  // DOM elements
  const submitBtn = document.getElementById("submitBtn");
  const closeBtn = document.getElementById("closeBtn");
  const retryBtn = document.getElementById("retryBtn");
  const summaryTextarea = document.getElementById("summary");
  const resultSection = document.getElementById("result");
  const resultContent = document.querySelector(".result-content");
  const verdictBadge = document.getElementById("verdict-badge");
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

  // Handle retry button click: re-enable form and allow resubmission
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      overlay.style.display = "none";
      resultSection.style.display = "none";
      submitBtn.disabled = false;
      summaryTextarea.focus();
    });
  }

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

    // Parse and render only the actual response content (no labels)
    const cleaned = cleanGeminiText(text);
    renderCleanResult(cleaned);
    resultSection.style.display = "block";

    // Extract verdict from the Gemini response (e.g., "Verdict: Accurate")
    try {
      const match =
        /Verdict:\s*(Accurate|Partially\s+Accurate|Inaccurate)/i.exec(text);
      if (match && verdictBadge) {
        const verdict = match[1].toLowerCase();
        verdictBadge.style.display = "inline-block";
        verdictBadge.classList.remove("green", "yellow", "red");
        if (verdict.includes("inaccurate")) {
          verdictBadge.classList.add("red");
          verdictBadge.textContent = "Inaccurate";
          if (retryBtn) retryBtn.style.display = "inline-block";
        } else if (verdict.includes("partially")) {
          verdictBadge.classList.add("yellow");
          verdictBadge.textContent = "Partially Accurate";
          if (retryBtn) retryBtn.style.display = "inline-block";
        } else {
          verdictBadge.classList.add("green");
          verdictBadge.textContent = "Accurate";
          if (retryBtn) retryBtn.style.display = "none";
        }
      }
    } catch {}

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

  // Extracts verdict, rationale, and hint; returns object
  function parseGeminiText(raw) {
    const verdictMatch =
      /Verdict:\s*(Accurate|Partially\s+Accurate|Inaccurate)/i.exec(raw);
    const rationaleMatch =
      /Rationale\s*:\s*([\s\S]*?)(?=(?:\bHint\s*:|$))/i.exec(raw);
    const hintMatch = /Hint\s*:\s*([\s\S]*?)$/i.exec(raw);
    return {
      verdict: verdictMatch ? verdictMatch[1].trim() : undefined,
      rationale: rationaleMatch ? rationaleMatch[1].trim() : undefined,
      hint: hintMatch ? hintMatch[1].trim() : undefined,
    };
  }

  // Removes labels and returns minimal content for display
  function cleanGeminiText(raw) {
    const { verdict, rationale, hint } = parseGeminiText(raw);
    // Update badge if we didn't earlier
    if (verdict && verdictBadge && verdictBadge.style.display === "none") {
      const v = verdict.toLowerCase();
      verdictBadge.style.display = "inline-block";
      verdictBadge.classList.remove("green", "yellow", "red");
      if (v.includes("inaccurate")) {
        verdictBadge.classList.add("red");
        verdictBadge.textContent = "Inaccurate";
      } else if (v.includes("partially")) {
        verdictBadge.classList.add("yellow");
        verdictBadge.textContent = "Partially Accurate";
      } else {
        verdictBadge.classList.add("green");
        verdictBadge.textContent = "Accurate";
      }
    }
    return { rationale, hint, fallback: raw };
  }

  function renderCleanResult({ rationale, hint, fallback }) {
    // Clear existing content
    resultContent.innerHTML = "";
    let rendered = false;
    if (rationale && rationale.length > 0) {
      const p = document.createElement("p");
      p.textContent = rationale;
      resultContent.appendChild(p);
      rendered = true;
    }
    if (hint && hint.length > 0) {
      const p = document.createElement("p");
      p.textContent = hint;
      resultContent.appendChild(p);
      rendered = true;
    }
    if (!rendered) {
      // As a fallback, strip labels inline and show what remains
      const stripped = fallback
        .replace(/Verdict\s*:[^\n]*/gi, "")
        .replace(/Rationale\s*:\s*/gi, "")
        .replace(/Hint\s*:\s*/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      resultContent.textContent = stripped || fallback;
    }
  }
})();
