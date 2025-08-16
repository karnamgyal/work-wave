import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export interface CodeAnalysisResult {
  hasErrors: boolean;
  errorCount: number;
  lineCount: number;
  complexity: number;
  quality: "good" | "improving" | "needs_work";
  lastError?: string;
  lastSuccess?: string;
}

export class CodeAnalyzer {
  private fileWatcher: vscode.FileSystemWatcher | undefined;
  private currentFile: string | undefined;
  private analysisResults: Map<string, CodeAnalysisResult> = new Map();
  private onEmotionChange:
    | ((emotion: string, reason: string) => void)
    | undefined;

  constructor() {
    console.log("CodeAnalyzer initialized");
    this.setupFileWatcher();
  }

  public setEmotionCallback(
    callback: (emotion: string, reason: string) => void
  ): void {
    this.onEmotionChange = callback;
  }

  private setupFileWatcher(): void {
    console.log("🔧 Setting up file watchers...");

    // Watch for active text editor changes
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor && this.isSupportedFile(editor.document)) {
        console.log(`📁 Active editor changed to: ${editor.document.fileName}`);
        this.currentFile = editor.document.fileName;
        this.analyzeFile(editor.document);
      }
    });

    // Watch for document changes
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (
        this.isSupportedFile(event.document) &&
        event.document === vscode.window.activeTextEditor?.document
      ) {
        console.log(`✏️ Document changed: ${event.document.fileName}`);
        this.analyzeFile(event.document);
      }
    });

    // Watch for document saves
    vscode.workspace.onDidSaveTextDocument((document) => {
      if (this.isSupportedFile(document)) {
        console.log(`💾 Document saved: ${document.fileName}`);
        this.analyzeFile(document);
      }
    });

    // React to diagnostics changes so we reflect actual squiggles from language servers
    vscode.languages.onDidChangeDiagnostics((event) => {
      const active = vscode.window.activeTextEditor;
      if (!active || !this.isSupportedFile(active.document)) return;
      if (
        event.uris.some((u) => u.toString() === active.document.uri.toString())
      ) {
        console.log(`🩺 Diagnostics changed: ${active.document.fileName}`);
        this.analyzeFile(active.document);
      }
    });

    console.log("✅ File watchers set up successfully");

    // Perform initial analysis for the currently active editor (if any)
    const active = vscode.window.activeTextEditor;
    if (active && this.isSupportedFile(active.document)) {
      this.currentFile = active.document.fileName;
      this.analyzeFile(active.document);
    }
  }

  private isSupportedFile(document: vscode.TextDocument): boolean {
    const id = document.languageId;
    const name = document.fileName.toLowerCase();
    return (
      id === "python" ||
      name.endsWith(".py") ||
      id === "javascript" ||
      name.endsWith(".js") ||
      id === "typescript" ||
      name.endsWith(".ts") ||
      id === "java" ||
      name.endsWith(".java")
    );
  }

  private async analyzeFile(document: vscode.TextDocument): Promise<void> {
    try {
      console.log(`🔍 Analyzing file: ${document.fileName}`);
      const content = document.getText();
      const result = await this.analyzeCode(
        content,
        document.languageId,
        document.fileName
      );

      console.log(`📊 Analysis result:`, result);

      // Track current file being analyzed
      this.currentFile = document.fileName;

      // Compare against previous results BEFORE updating the cache
      const previous = this.analysisResults.get(document.fileName);

      // Overlay with VS Code diagnostics for authoritative errors
      const diags = vscode.languages.getDiagnostics(document.uri);
      const errors = diags.filter(
        (d) => d.severity === vscode.DiagnosticSeverity.Error
      );
      result.errorCount = errors.length;
      result.hasErrors = errors.length > 0;
      // last messages from diagnostics if available
      if (errors.length > 0) {
        const e = errors[0];
        const line = (e.range?.start?.line ?? 0) + 1;
        result.lastError = `Line ${line}: ${e.message}`;
      }

      // Update cache first so consumers can read the latest
      this.analysisResults.set(document.fileName, result);

      // Notify UI based on diff with previous
      this.updateBotEmotion(result, document.fileName, previous);
    } catch (error) {
      console.error("Error analyzing Python file:", error);
    }
  }

  private async analyzePythonCode(
    content: string
  ): Promise<CodeAnalysisResult> {
    const lines = content.split("\n").filter((line) => line.trim().length > 0);
    const lineCount = lines.length;

    // Basic syntax analysis (may be overridden by diagnostics)
    const syntaxErrors = this.checkPythonSyntax(content);
    const hasErrors = syntaxErrors.length > 0;
    const errorCount = syntaxErrors.length;

    // Code quality analysis
    const complexity = this.calculateComplexity(lines);
    const quality = this.assessCodeQuality(lines, complexity, errorCount);

    // Get last messages
    const lastError = hasErrors ? syntaxErrors[0] : undefined;
    const lastSuccess =
      !hasErrors && lineCount > 0 ? "Code looks good!" : undefined;

    return {
      hasErrors,
      errorCount,
      lineCount,
      complexity,
      quality,
      lastError,
      lastSuccess,
    };
  }

  private async analyzeJSTSCode(content: string): Promise<CodeAnalysisResult> {
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const lineCount = lines.length;

    const syntaxErrors = this.checkJSTSSyntax(content);
    const hasErrors = syntaxErrors.length > 0;
    const errorCount = syntaxErrors.length;

    const complexity = this.calculateComplexity(lines);
    const quality = this.assessCodeQuality(lines, complexity, errorCount);

    const lastError = hasErrors ? syntaxErrors[0] : undefined;
    const lastSuccess =
      !hasErrors && lineCount > 0 ? "Code looks good!" : undefined;

    return {
      hasErrors,
      errorCount,
      lineCount,
      complexity,
      quality,
      lastError,
      lastSuccess,
    };
  }

  private async analyzeJavaCode(content: string): Promise<CodeAnalysisResult> {
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    const lineCount = lines.length;

    const syntaxErrors = this.checkJavaSyntax(content);
    const hasErrors = syntaxErrors.length > 0;
    const errorCount = syntaxErrors.length;

    const complexity = this.calculateComplexity(lines);
    const quality = this.assessCodeQuality(lines, complexity, errorCount);

    const lastError = hasErrors ? syntaxErrors[0] : undefined;
    const lastSuccess =
      !hasErrors && lineCount > 0 ? "Code looks good!" : undefined;

    return {
      hasErrors,
      errorCount,
      lineCount,
      complexity,
      quality,
      lastError,
      lastSuccess,
    };
  }

  private async analyzeCode(
    content: string,
    languageId: string,
    fileName: string
  ): Promise<CodeAnalysisResult> {
    const id = languageId.toLowerCase();
    if (id === "python") return this.analyzePythonCode(content);
    if (id === "javascript" || id === "typescript")
      return this.analyzeJSTSCode(content);
    if (id === "java") return this.analyzeJavaCode(content);
    // Fallback to Python heuristics if unknown (basic metrics only)
    return this.analyzePythonCode(content);
  }

  private checkPythonSyntax(content: string): string[] {
    const errors: string[] = [];

    // Basic Python syntax checks
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;

      // Check for common Python syntax issues
      if (line.includes("print(") && !line.includes(")")) {
        errors.push(
          `Line ${lineNumber}: Missing closing parenthesis in print statement`
        );
      }

      if (
        line.includes("if ") &&
        !line.includes(":") &&
        line.trim().length > 0
      ) {
        errors.push(`Line ${lineNumber}: Missing colon after if statement`);
      }

      if (
        line.includes("def ") &&
        !line.includes(":") &&
        line.trim().length > 0
      ) {
        errors.push(
          `Line ${lineNumber}: Missing colon after function definition`
        );
      }

      if (
        line.includes("for ") &&
        !line.includes(":") &&
        line.trim().length > 0
      ) {
        errors.push(`Line ${lineNumber}: Missing colon after for loop`);
      }

      if (
        line.includes("while ") &&
        !line.includes(":") &&
        line.trim().length > 0
      ) {
        errors.push(`Line ${lineNumber}: Missing colon after while loop`);
      }

      if (line.includes("try:") && !this.hasMatchingExcept(lines, i)) {
        errors.push(`Line ${lineNumber}: try block without matching except`);
      }

      // Check for unmatched quotes
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      if (singleQuotes % 2 !== 0 || doubleQuotes % 2 !== 0) {
        errors.push(`Line ${lineNumber}: Unmatched quotes`);
      }

      // Check for undefined variables (basic check)
      if (
        line.includes("=") &&
        line.includes("+") &&
        line.includes("undefined")
      ) {
        errors.push(`Line ${lineNumber}: Possible undefined variable usage`);
      }
    }

    return errors;
  }

  private hasMatchingExcept(lines: string[], tryLineIndex: number): boolean {
    for (let i = tryLineIndex + 1; i < lines.length; i++) {
      if (lines[i].trim().startsWith("except")) {
        return true;
      }
      if (
        lines[i].trim().startsWith("def ") ||
        lines[i].trim().startsWith("class ")
      ) {
        break;
      }
    }
    return false;
  }

  private calculateComplexity(lines: string[]): number {
    let complexity = 0;

    for (const line of lines) {
      const trimmed = line.trim();

      // Increase complexity for control structures
      if (trimmed.startsWith("if ") || trimmed.startsWith("elif "))
        complexity += 1;
      if (trimmed.startsWith("for ") || trimmed.startsWith("while "))
        complexity += 2;
      if (trimmed.startsWith("try:") || trimmed.startsWith("except "))
        complexity += 1;
      if (trimmed.startsWith("def ") || trimmed.startsWith("class "))
        complexity += 1;
      if (trimmed.includes(" and ") || trimmed.includes(" or "))
        complexity += 1;
      if (trimmed.includes("lambda ")) complexity += 2;

      // Nested structures increase complexity more
      const indentLevel = line.length - line.trimStart().length;
      if (indentLevel > 8) complexity += 1;
    }

    return complexity;
  }

  // (Warnings removed)

  private assessCodeQuality(
    lines: string[],
    complexity: number,
    errorCount: number
  ): "good" | "improving" | "needs_work" {
    if (errorCount === 0 && complexity < 10 && lines.length > 0) {
      return "good";
    } else if (errorCount === 0 && lines.length > 0) {
      return "improving";
    } else {
      return "needs_work";
    }
  }

  // ===== JS/TS heuristics =====
  private checkJSTSSyntax(content: string): string[] {
    const errors: string[] = [];
    const lines = content.split("\n");

    // Unbalanced brackets/quotes across the file
    const count = (s: string, ch: string) =>
      (s.match(new RegExp(`\\${ch}`, "g")) || []).length;
    const paren = count(content, "(") - count(content, ")");
    const brace = count(content, "{") - count(content, "}");
    const bracket = count(content, "[") - count(content, "]");
    const single = count(content, "'") % 2 !== 0;
    const dbl = count(content, '"') % 2 !== 0;
    const btick = count(content, "`") % 2 !== 0;
    if (paren !== 0) errors.push("Unbalanced parentheses");
    if (brace !== 0) errors.push("Unbalanced curly braces");
    if (bracket !== 0) errors.push("Unbalanced brackets");
    if (single || dbl || btick) errors.push("Unmatched quotes/backticks");

    // try without catch/finally
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith("try")) {
        const rest = lines.slice(i + 1).join("\n");
        if (!/\bcatch\b|\bfinally\b/.test(rest)) {
          errors.push(`Line ${i + 1}: try block without catch/finally`);
        }
      }
    }
    return errors;
  }

  // (Warnings removed)

  // ===== Java heuristics =====
  private checkJavaSyntax(content: string): string[] {
    const errors: string[] = [];
    const lines = content.split("\n");

    const count = (s: string, ch: string) =>
      (s.match(new RegExp(`\\${ch}`, "g")) || []).length;
    const paren = count(content, "(") - count(content, ")");
    const brace = count(content, "{") - count(content, "}");
    const bracket = count(content, "[") - count(content, "]");
    const single = count(content, "'") % 2 !== 0;
    const dbl = count(content, '"') % 2 !== 0;
    if (paren !== 0) errors.push("Unbalanced parentheses");
    if (brace !== 0) errors.push("Unbalanced curly braces");
    if (bracket !== 0) errors.push("Unbalanced brackets");
    if (single || dbl) errors.push("Unmatched quotes");

    // try without catch/finally
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith("try")) {
        const rest = lines.slice(i + 1).join("\n");
        if (!/\bcatch\b|\bfinally\b/.test(rest)) {
          errors.push(`Line ${i + 1}: try block without catch/finally`);
        }
      }
    }

    // crude missing semicolon detection for statements
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const l = raw.trim();
      if (!l) continue;
      if (
        /(^if\b|^for\b|^while\b|^switch\b|^try\b|^catch\b|^finally\b|^class\b|^interface\b|^enum\b)/.test(
          l
        )
      )
        continue;
      if (l.endsWith("{") || l.endsWith("}") || l.endsWith(";")) continue;
      // Ignore annotations and comments
      if (
        l.startsWith("@") ||
        l.startsWith("//") ||
        l.startsWith("/*") ||
        l.startsWith("*")
      )
        continue;
      // Likely missing semicolon
      errors.push(`Line ${i + 1}: Possible missing semicolon`);
    }
    return errors;
  }

  // (Warnings removed)

  private updateBotEmotion(
    result: CodeAnalysisResult,
    fileName: string,
    previousResult?: CodeAnalysisResult
  ): void {
    if (!this.onEmotionChange) return;

    let emotion: string;
    let reason: string;

    if (result.hasErrors) {
      emotion = "frustrated";
      reason = `Found ${result.errorCount} syntax error(s) in ${path.basename(
        fileName
      )}`;
    } else if (result.lineCount === 0) {
      emotion = "happy";
      reason = "Empty file - ready to start coding!";
    } else {
      emotion = "happy";
      reason = `Great code! ${result.lineCount} lines written, no errors found`;
    }

    // Only trigger emotion change if it's different or significant
    const baseline = previousResult ?? this.analysisResults.get(fileName);
    if (
      !baseline ||
      baseline.hasErrors !== result.hasErrors ||
      baseline.errorCount !== result.errorCount ||
      baseline.lineCount !== result.lineCount
    ) {
      console.log(`🎭 Emotion change: ${emotion} - ${reason}`);
      this.onEmotionChange(emotion, reason);
    }
  }

  public getCurrentAnalysis(): CodeAnalysisResult | undefined {
    if (!this.currentFile) return undefined;
    return this.analysisResults.get(this.currentFile);
  }

  public getAllAnalysisResults(): Map<string, CodeAnalysisResult> {
    return this.analysisResults;
  }

  public dispose(): void {
    if (this.fileWatcher) {
      this.fileWatcher.dispose();
    }
  }
}
