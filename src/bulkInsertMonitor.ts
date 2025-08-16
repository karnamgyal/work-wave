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

  public handleTextChange(e: vscode.TextDocumentChangeEvent) {
    const doc = e.document;
    const uriKey = doc.uri.toString();
    const now = Date.now();

    // Aggregate insertion size for this change event
    let insertedChars = 0;
    let insertedLines = 0;
    for (const c of e.contentChanges) {
      if (c.text && c.text.length > 0) {
        insertedChars += c.text.length;
        insertedLines += Math.max(0, c.text.split(/\r?\n/).length - 1);
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

      // Gentle prompt to review
      const secs = Math.max(1, Math.round(expectedMs / 1000));
      vscode.window.showInformationMessage(
        `📝 Large code insertion detected (${insertedLines} lines, ${insertedChars} chars). Take ~${secs}s to review before modifying.`
      );
      console.log(
        `[BulkInsertMonitor] Large insertion detected in ${doc.uri.toString()} (${insertedLines} lines, ${insertedChars} chars) - expected review time: ${expectedMs}ms`
      );
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
}
