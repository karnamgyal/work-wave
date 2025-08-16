import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

/**
 * Interface for the Build Summary component
 * Provides a styled webview panel for collecting user summaries of inserted code
 */
export class BuildSummaryPanel {
  private panel?: vscode.WebviewPanel;
  private static readonly viewType = "buildSummary";

  constructor(
    private readonly extensionPath: string,
    private readonly onSubmitSummary: (summary: string) => Promise<string>
  ) {}

  /**
   * Creates and shows the build summary panel
   */
  public async show(
    codePreview: string,
    metadata: {
      charCount: number;
      lineCount: number;
      reviewTimeMs: number;
      truncated: boolean;
    }
  ): Promise<void> {
    const column = vscode.ViewColumn.Active;

    // If we already have a panel, show it
    if (this.panel) {
      this.panel.reveal(column);
      this.updateContent(codePreview, metadata);
      return;
    }

    // Create new panel
    this.panel = vscode.window.createWebviewPanel(
      BuildSummaryPanel.viewType,
      "📝 Code Summary",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.extensionPath, "src")),
        ],
      }
    );

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Handle messages from the webview
    this.panel.webview.onDidReceiveMessage(async (message) => {
      await this.handleMessage(message);
    });

    // Set initial content
    this.panel.webview.html = this.getWebviewContent(codePreview, metadata);
  }

  /**
   * Updates the content of an existing panel
   */
  private updateContent(
    codePreview: string,
    metadata: {
      charCount: number;
      lineCount: number;
      reviewTimeMs: number;
      truncated: boolean;
    }
  ): void {
    if (!this.panel) return;

    // Send update messages to the webview
    this.panel.webview.postMessage({
      type: "update-stats",
      charCount: metadata.charCount,
      lineCount: metadata.lineCount,
      reviewTime: this.formatReviewTime(metadata.reviewTimeMs),
    });

    this.panel.webview.postMessage({
      type: "update-code-preview",
      codeText: codePreview,
      truncated: metadata.truncated,
    });
  }

  /**
   * Handles messages from the webview
   */
  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case "submit-summary":
        await this.handleSubmitSummary(message.text);
        break;
      case "close-panel":
        this.dispose();
        break;
    }
  }

  /**
   * Handles summary submission
   */
  private async handleSubmitSummary(summaryText: string): Promise<void> {
    if (!this.panel) return;

    try {
      // Show loading state
      this.panel.webview.postMessage({
        type: "loading",
        loading: true,
      });

      const result = await this.onSubmitSummary(summaryText);

      this.panel.webview.postMessage({
        type: "review-result",
        text: result,
        ok: true,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.panel.webview.postMessage({
        type: "review-result",
        text: `Review failed: ${errorMessage}`,
        ok: false,
      });
    } finally {
      // Hide loading state
      this.panel.webview.postMessage({
        type: "loading",
        loading: false,
      });
    }
  }

  /**
   * Gets the HTML content for the webview
   */
  private getWebviewContent(
    codePreview: string,
    metadata: {
      charCount: number;
      lineCount: number;
      reviewTimeMs: number;
      truncated: boolean;
    }
  ): string {
    if (!this.panel) return "";

    // Get file URIs for resources
    const htmlPath = path.join(this.extensionPath, "src", "buildSummary.html");
    const cssPath = path.join(this.extensionPath, "src", "buildSummary.css");
    const jsPath = path.join(this.extensionPath, "src", "buildSummary.js");

    try {
      // Read HTML template
      let html = fs.readFileSync(htmlPath, "utf8");

      // Read CSS and JS
      const css = fs.readFileSync(cssPath, "utf8");
      const js = fs.readFileSync(jsPath, "utf8");

      // Replace placeholders
      html = html
        .replace("{{CHAR_COUNT}}", metadata.charCount.toString())
        .replace("{{LINE_COUNT}}", metadata.lineCount.toString())
        .replace(
          "{{REVIEW_TIME}}",
          this.formatReviewTime(metadata.reviewTimeMs)
        )
        .replace("{{CODE_PREVIEW}}", this.escapeHtml(codePreview));

      // Embed CSS and JS directly (for simplicity and CSP compliance)
      // Handle possible self-closing link tag variations
      const cssLinkRegex =
        /<link\s+rel=["']stylesheet["']\s+href=["']buildSummary\.css["']\s*\/?>(?:\s*)/i;
      if (cssLinkRegex.test(html)) {
        html = html.replace(cssLinkRegex, `<style>${css}</style>`);
      } else {
        // Fallback: inject before </head>
        html = html.replace(/<\/head>/i, `<style>${css}</style></head>`);
      }

      // Replace script tag or inject before </body>
      const jsScriptRegex =
        /<script\s+src=["']buildSummary\.js["']><\/script>/i;
      if (jsScriptRegex.test(html)) {
        html = html.replace(jsScriptRegex, `<script>${js}</script>`);
      } else {
        html = html.replace(/<\/body>/i, `<script>${js}</script></body>`);
      }

      // Update CSP and add truncation notice if needed
      const cspMeta = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />`;
      html = html.replace(
        '<meta name="viewport"',
        cspMeta + '\n    <meta name="viewport"'
      );

      // Show/hide truncation notice
      if (metadata.truncated) {
        html = html.replace('style="display:none;"', 'style="display:block;"');
      }

      return html;
    } catch (error) {
      console.error("Error loading build summary content:", error);
      return this.getFallbackContent(codePreview, metadata);
    }
  }

  /**
   * Fallback content if file reading fails
   */
  private getFallbackContent(
    codePreview: string,
    metadata: {
      charCount: number;
      lineCount: number;
      reviewTimeMs: number;
      truncated: boolean;
    }
  ): string {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';" />
            <title>Describe Inserted Code</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
                .container { max-width: 600px; margin: 0 auto; }
                textarea { width: 100%; height: 100px; margin: 10px 0; }
                button { padding: 10px 20px; margin: 5px; }
                .code { background: #f5f5f5; padding: 10px; border-radius: 5px; overflow: auto; max-height: 200px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Describe Inserted Code</h1>
                <p>Please summarize what the newly inserted code does:</p>
                <textarea id="summary" placeholder="e.g., Adds a function to parse JSON and handle errors"></textarea>
                <button id="submitBtn">Submit Summary</button>
                <button id="closeBtn" style="display:none;">Close</button>
                <div id="result" style="display:none; margin-top: 20px;"></div>
                <h3>Code Preview (${metadata.charCount} chars, ${
      metadata.lineCount
    } lines)</h3>
                <div class="code"><pre>${this.escapeHtml(
                  codePreview
                )}</pre></div>
                ${
                  metadata.truncated
                    ? "<p><em>Preview truncated for display.</em></p>"
                    : ""
                }
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('submitBtn').addEventListener('click', () => {
                    const text = document.getElementById('summary').value.trim();
                    if (text) {
                        vscode.postMessage({ type: 'submit-summary', text });
                        document.getElementById('submitBtn').disabled = true;
                    }
                });
                document.getElementById('closeBtn').addEventListener('click', () => {
                    vscode.postMessage({ type: 'close-panel' });
                });
                window.addEventListener('message', event => {
                    const msg = event.data;
                    if (msg.type === 'review-result') {
                        const result = document.getElementById('result');
                        result.textContent = msg.text;
                        result.style.display = 'block';
                        document.getElementById('closeBtn').style.display = 'inline';
                    }
                });
            </script>
        </body>
        </html>`;
  }

  /**
   * Formats review time in milliseconds to a readable string
   */
  private formatReviewTime(ms: number): string {
    const seconds = Math.round(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
  }

  /**
   * Escapes HTML characters
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Disposes of the panel
   */
  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }

  /**
   * Checks if the panel is currently visible
   */
  public get isVisible(): boolean {
    return !!this.panel && this.panel.visible;
  }
}
