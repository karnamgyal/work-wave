import { log } from "console";
import * as vscode from "vscode";

interface PendingReview {
  deadline: number; // epoch ms when review window ends
  expectedMs: number;
  chars: number;
  lines: number;
}

export class BulkInsertMonitor {
  // Thresholds for detecting a large insertion
  private LARGE_CHARS = 300; // ~ a few lines of code
  private LARGE_LINES = 8; // multi-line insert
  private TYPING_MAX_CHARS = 32; // likely human keystrokes

  private pending = new Map<string, PendingReview>(); // key: uri.toString()
  // Stores the most recent bulk-insert payload for later summarization
  private lastBulkInsert?: {
    text: string;
    timestamp: number;
    uri: string;
    chars: number;
    lines: number;
  };
  // Stores the user's speech/text summary of the last bulk insert
  private lastBulkInsertSummary?: {
    summaryText: string;
    timestamp: number;
    uri: string;
  };
  private summaryPanel?: vscode.WebviewPanel;

  public handleTextChange(e: vscode.TextDocumentChangeEvent) {
    const doc = e.document;
    const uriKey = doc.uri.toString();
    const now = Date.now();

    // Aggregate insertion size for this change event
    let insertedChars = 0;
    let insertedLines = 0;
    const insertedParts: string[] = [];
    for (const c of e.contentChanges) {
      if (c.text && c.text.length > 0) {
        insertedChars += c.text.length;
        insertedLines += Math.max(0, c.text.split(/\r?\n/).length - 1);
        insertedParts.push(c.text);
      }
    }

    // Detect large paste/agent insertion
    if (
      insertedChars >= this.LARGE_CHARS ||
      insertedLines >= this.LARGE_LINES
    ) {
      const expectedMs = this.estimateReviewTimeMs(
        insertedChars,
        insertedLines,
        doc
      );
      const deadline = now + expectedMs;
      this.pending.set(uriKey, {
        deadline,
        expectedMs,
        chars: insertedChars,
        lines: insertedLines,
      });

      // Save the inserted code for later AI summarization
      this.lastBulkInsert = {
        text: insertedParts.join("\n"),
        timestamp: now,
        uri: uriKey,
        chars: insertedChars,
        lines: insertedLines,
      };

      // Gentle prompt to review
      const secs = Math.max(1, Math.round(expectedMs / 1000));
      vscode.window.showInformationMessage(
        `📝 Large code insertion detected (${insertedLines} lines, ${insertedChars} chars). Take ~${secs}s to review before modifying.`
      );
      console.log(
        `[BulkInsertMonitor] Large insertion detected in ${doc.uri.toString()} (${insertedLines} lines, ${insertedChars} chars) - expected review time: ${expectedMs}ms`
      );

      // Open a large popup to collect a speech/text summary from the user
      this.openSummaryPanel(this.lastBulkInsert.text, uriKey);

      return;
    }

    // If there is a pending review window and the user starts typing immediately, nudge
    const pending = this.pending.get(uriKey);
    if (pending && now < pending.deadline) {
      // consider small inserts as typing; ignore whitespace-only edits
      const isTyping =
        insertedChars > 0 &&
        insertedChars <= this.TYPING_MAX_CHARS &&
        e.contentChanges.length <= 3;
      const hasNonWhitespace = e.contentChanges.some(
        (c) => (c.text || "").trim().length > 0
      );

      if (isTyping && hasNonWhitespace) {
        const elapsed = Math.max(
          0,
          pending.expectedMs - (pending.deadline - now)
        );
        const elapsedS = (elapsed / 1000).toFixed(1);
        const expectedS = (pending.expectedMs / 1000).toFixed(1);
        vscode.window.showInformationMessage(
          `⚠️ You started editing ${elapsedS}s after a large insertion (expected ~${expectedS}s). Consider reviewing for correctness/security.`
        );
        console.log(
          `[BulkInsertMonitor] User started editing ${elapsedS}s after large insertion in ${doc.uri.toString()} - expected review time: ${expectedS}s`
        );
        this.pending.delete(uriKey);
      }
    } else if (pending && now >= pending.deadline) {
      // Review window has passed; clear state
      this.pending.delete(uriKey);
    }
  }

  /**
   * Opens a webview panel prompting the user to summarize the inserted code.
   * Attempts to enable Speech-to-Text (if available) with a text fallback.
   */
  private openSummaryPanel(codeText: string, uriKey: string) {
    try {
      // Reuse an existing panel if open
      if (this.summaryPanel) {
        this.summaryPanel.reveal(vscode.ViewColumn.Active);
      } else {
        this.summaryPanel = vscode.window.createWebviewPanel(
          "bulkInsertSummary",
          "Describe Inserted Code",
          vscode.ViewColumn.Active,
          {
            enableScripts: true,
            retainContextWhenHidden: false,
          }
        );

        this.summaryPanel.onDidDispose(() => {
          this.summaryPanel = undefined;
        });

        this.summaryPanel.webview.onDidReceiveMessage((msg) => {
          if (!msg) return;
          if (msg.type === "submit-summary") {
            const text = String(msg.text || "").trim();
            if (text.length > 0) {
              this.lastBulkInsertSummary = {
                summaryText: text,
                timestamp: Date.now(),
                uri: uriKey,
              };
              vscode.window.showInformationMessage(
                "✅ Summary captured for the inserted code."
              );
              this.summaryPanel?.dispose();
            } else {
              vscode.window.showWarningMessage(
                "Please provide a brief description before submitting."
              );
            }
          }
        });
      }

      const preview = codeText.substring(0, 4000);
      const truncated = codeText.length > preview.length;
      this.summaryPanel.webview.html = this.buildSummaryHtml(
        preview,
        truncated
      );
    } catch (err) {
      console.error("[BulkInsertMonitor] Failed to open summary panel:", err);
      // Fallback: plain input box
      vscode.window
        .showInputBox({
          title: "Describe Inserted Code",
          prompt:
            "Summarize what the newly inserted code does (speech-to-text unavailable)",
          placeHolder: "e.g., Adds a function to parse JSON and handle errors",
          ignoreFocusOut: true,
        })
        .then((value) => {
          if (value && value.trim().length > 0) {
            this.lastBulkInsertSummary = {
              summaryText: value.trim(),
              timestamp: Date.now(),
              uri: uriKey,
            };
            vscode.window.showInformationMessage(
              "✅ Summary captured for the inserted code."
            );
          }
        });
    }
  }

  private buildSummaryHtml(codePreview: string, truncated: boolean): string {
    const escapeHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const vscodeApi = "acquireVsCodeApi";
    const csp =
      "default-src 'none'; img-src https: data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';";
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="${csp}" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Describe Inserted Code</title>
    <style>
      body { font-family: -apple-system, Segoe UI, sans-serif; padding: 16px; }
      .container { max-width: 960px; margin: 0 auto; }
      h1 { margin-top: 0; }
      .code { background: #0f0f10; color: #e6e6e6; padding: 12px; border-radius: 6px; overflow: auto; max-height: 300px; }
      .hint { color: #888; font-size: 12px; }
      textarea { width: 100%; height: 140px; font-family: Menlo, monospace; font-size: 13px; }
      .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
      button { padding: 8px 12px; }
      .pill { padding: 4px 8px; background: #2a2a2a; color: #ddd; border-radius: 999px; font-size: 12px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Describe the Inserted Code</h1>
      <p>Please summarize what the newly inserted code does. You can speak or type. If voice isn't supported, use the text box below.</p>
      <div class="row" style="margin: 8px 0 12px 0;">
        <span class="pill" id="sttStatus">Speech: checking...</span>
        <button id="startBtn">Start Recording</button>
        <button id="stopBtn" disabled>Stop</button>
      </div>
      <textarea id="summary" placeholder="e.g., Adds a function to parse JSON and handle errors"></textarea>
      <div class="row" style="margin-top: 12px;">
        <button id="submitBtn">Submit Summary</button>
      </div>
      <h3 style="margin-top: 24px;">Inserted Code Preview</h3>
      <div class="code"><pre>${escapeHtml(codePreview)}</pre></div>
      ${
        truncated
          ? '<p class="hint">Preview truncated for display. Full code is stored for processing.</p>'
          : ""
      }
    </div>
    <script>
      const vscode = window.${vscodeApi}();
      const status = document.getElementById('sttStatus');
      const startBtn = document.getElementById('startBtn');
      const stopBtn = document.getElementById('stopBtn');
      const summary = document.getElementById('summary');

      let recognition;
      let listening = false;

      function initSTT() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
          status.textContent = 'Speech: not available';
          startBtn.disabled = true;
          stopBtn.disabled = true;
          return;
        }
        status.textContent = 'Speech: ready';
        recognition = new SR();
        recognition.lang = navigator.language || 'en-US';
        recognition.interimResults = true;
        recognition.continuous = true;
        recognition.onresult = (event) => {
          let text = summary.value;
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const t = res[0].transcript;
            if (res.isFinal) {
              text += (text.endsWith(' ') ? '' : ' ') + t.trim() + '. ';
            }
          }
          summary.value = text;
        };
        recognition.onstart = () => { listening = true; status.textContent = 'Speech: recording...'; startBtn.disabled = true; stopBtn.disabled = false; };
        recognition.onend = () => { listening = false; status.textContent = 'Speech: stopped'; startBtn.disabled = false; stopBtn.disabled = true; };
        recognition.onerror = (e) => { status.textContent = 'Speech error: ' + (e.error || 'unknown'); };
      }

      initSTT();
      startBtn.addEventListener('click', () => { try { recognition && recognition.start(); } catch (_) {} });
      stopBtn.addEventListener('click', () => { try { recognition && recognition.stop(); } catch (_) {} });
      document.getElementById('submitBtn').addEventListener('click', () => {
        const text = (summary.value || '').trim();
        vscode.postMessage({ type: 'submit-summary', text });
      });
    </script>
  </body>
</html>`;
  }

  private estimateReviewTimeMs(
    chars: number,
    lines: number,
    doc: vscode.TextDocument
  ): number {
    // Base heuristics per size
    const perCharMs = 15; // faster than suggestion tracker: bulk paste skim
    const perLineMs = 150;
    let ms = chars * perCharMs + Math.max(0, lines) * perLineMs;

    // Language-based multiplier (JS/TS/Java/Python similar)
    const id = doc.languageId.toLowerCase();
    const langFactor = id === "java" ? 1.2 : 1.0;
    ms *= langFactor;

    // Clamp to a reasonable range
    ms = Math.max(1500, Math.min(ms, 20000));
    return ms;
  }

  /**
   * Returns true when the given document is currently under a bulk-insert review window.
   * While this is true, we should suppress motivational popups to avoid spam after AI/agent pastes.
   */
  public isInReviewWindow(uri: vscode.Uri | undefined): boolean {
    if (!uri) return false;
    const rec = this.pending.get(uri.toString());
    return !!(rec && Date.now() < rec.deadline);
  }

  /** Get the raw text of the last bulk insert, if any. */
  public getLastBulkInsertText(): string | undefined {
    return this.lastBulkInsert?.text;
  }

  /** Get metadata about the last bulk insert for diagnostics/telemetry. */
  public getLastBulkInsertMeta():
    | { timestamp: number; uri: string; chars: number; lines: number }
    | undefined {
    if (!this.lastBulkInsert) return undefined;
    const { timestamp, uri, chars, lines } = this.lastBulkInsert;
    return { timestamp, uri, chars, lines };
  }

  /** Get the captured user summary of the last bulk insert, if any. */
  public getLastBulkInsertSummaryText(): string | undefined {
    return this.lastBulkInsertSummary?.summaryText;
  }
}
