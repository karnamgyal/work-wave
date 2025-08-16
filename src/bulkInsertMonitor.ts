import * as vscode from "vscode";
import axios from "axios";
import { BuildSummaryPanel } from "./buildSummary";
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

  constructor(private extensionPath: string) {}

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
  private summaryPanel?: BuildSummaryPanel;

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

      // Open a large popup to collect a brief text summary from the user
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
   * Opens a webview panel prompting the user to summarize the inserted code (text-only).
   */
  private async openSummaryPanel(codeText: string, uriKey: string) {
    try {
      // Create BuildSummaryPanel if it doesn't exist
      if (!this.summaryPanel) {
        const summaryCallback = async (
          summaryText: string
        ): Promise<string> => {
          // Store the user's summary
          this.lastBulkInsertSummary = {
            summaryText: summaryText,
            timestamp: Date.now(),
            uri: uriKey,
          };

          // Get the full inserted code and evaluate with Gemini
          const code = this.lastBulkInsert?.text || "";
          if (!code) {
            throw new Error("Could not locate inserted code for review.");
          }

          return await this.evaluateWithGemini(code, summaryText);
        };

        this.summaryPanel = new BuildSummaryPanel(
          this.extensionPath,
          summaryCallback
        );
      }

      // Prepare metadata for the panel
      const preview = codeText.substring(0, 4000);
      const truncated = codeText.length > preview.length;
      const chars = codeText.length;
      const lines = Math.max(0, codeText.split(/\r?\n/).length - 1);
      const reviewTimeMs = this.estimateReviewTimeMs(chars, lines, {
        languageId: "typescript",
      } as vscode.TextDocument);

      // Show the panel with the code preview and metadata
      await this.summaryPanel.show(preview, {
        charCount: chars,
        lineCount: lines,
        reviewTimeMs: reviewTimeMs,
        truncated: truncated,
      });
    } catch (err) {
      console.error("[BulkInsertMonitor] Failed to open summary panel:", err);
      // Fallback: plain input box
      vscode.window
        .showInputBox({
          title: "Describe Inserted Code",
          prompt: "Summarize what the newly inserted code does",
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

  private async evaluateWithGemini(
    code: string,
    userSummary: string
  ): Promise<string> {
    const apiKey =
      process.env.GEMINI_API_KEY || "AIzaSyA7zq40Q3mbgCGof6Lg7ZQMpQyMLsTsNkk";
    if (!apiKey) {
      throw new Error(
        "Missing TEXT_API or GEMINI_API_KEY environment variable."
      );
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(
      apiKey
    )}`;
    const prompt = [
      "You are a senior code reviewer.",
      "Given the inserted code and the user's description, assess if the user accurately describes and understands the code.",
      "Respond concisely in this exact format:",
      "Verdict: Accurate | Partially Accurate | Inaccurate",
      "Rationale: one short sentence",
      "Hint: optional single suggestion (<= 1 line)",
    ].join("\n");
    const content = [
      `Inserted Code (fenced):\n\n\u0060\u0060\u0060\n${code}\n\u0060\u0060\u0060`,
      `\nUser Summary:\n${userSummary}`,
    ].join("\n\n");
    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${prompt}\n\n${content}` }],
        },
      ],
    } as const;
    const resp = await axios.post(url, payload, {
      headers: { "Content-Type": "application/json" },
      timeout: 20000,
      maxContentLength: 1024 * 1024 * 16,
    });
    const data = resp.data;
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text)
      .filter((t: any) => typeof t === "string")
      .join("\n")
      .trim();
    if (!text) throw new Error("Empty response from Gemini");
    return text;
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
