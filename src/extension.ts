import * as vscode from "vscode";
import { CodingBuddyBot } from "./codingBuddyBot";
import { StatusBarManager } from "./statusBarManager";
import { BotInterface } from "./botInterface";
import { CodeAnalyzer } from "./codeAnalyzer";
import { BulkInsertMonitor } from "./bulkInsertMonitor";

let codingBuddyBot: CodingBuddyBot;
let statusBarManager: StatusBarManager;
let botInterface: BotInterface;
let codeAnalyzer: CodeAnalyzer;

export function activate(context: vscode.ExtensionContext) {
  console.log("Coding Buddy Bot is now active!");

  // Initialize the coding buddy bot
  codingBuddyBot = new CodingBuddyBot();

  // Init status bar badge button (🏅 counter w/ Quick Pick)
  codingBuddyBot.initUI(context);

  // Initialize status bar manager
  statusBarManager = new StatusBarManager();

  // Initialize bot interface (your webview UI)
  botInterface = new BotInterface();

  // Let the bot update the webview's emotion/status directly
  codingBuddyBot.setBotInterface(botInterface);

  // Initialize bulk insert monitor first so we can consult it in callbacks
  const bulkMonitor = new BulkInsertMonitor(context.extensionPath);
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) =>
      bulkMonitor.handleTextChange(e)
    )
  );

  // Initialize code analyzer
  codeAnalyzer = new CodeAnalyzer();
  codeAnalyzer.setEmotionCallback((emotion, reason) => {
    console.log(
      `[EXTENSION] Emotion callback triggered: ${emotion}, reason: ${reason}`
    );
    botInterface.updateEmotion(emotion, reason);

    const currentAnalysis = codeAnalyzer.getCurrentAnalysis();
    if (currentAnalysis) {
      botInterface.updateCodeStats({
        lineCount: currentAnalysis.lineCount,
        errorCount: currentAnalysis.errorCount,
        complexity: currentAnalysis.complexity,
        quality: currentAnalysis.quality,
      });
    }

    // Handle theme switching for code-based emotions
    const themeManager = require("./themeManager").ThemeManager.getInstance();
    themeManager.handleEmotionChange(emotion, 0.8); // High confidence for code-based emotions

    // Suppress motivational popups if a recent large insert is under review OR if session is not active
    const activeDoc = vscode.window.activeTextEditor?.document;
    const suppress =
      bulkMonitor.isInReviewWindow(activeDoc?.uri) ||
      !codingBuddyBot.isSessionActive();

    switch (emotion) {
      case "frustrated":
        if (!suppress) {
          vscode.window.showInformationMessage(
            `😤 ${reason} - Don't worry, debugging is part of the journey! 💪`
          );
        }
        break;
      case "happy":
        if (!suppress) {
          vscode.window.showInformationMessage(
            `😊 ${reason} - You're on fire! 🔥`
          );
        }
        break;
    }
  });

  // -------------------------
  // Register commands
  // -------------------------
  let sessionTimer: NodeJS.Timeout | undefined;
  let sessionStartTime = 0;

  // track last values locally to avoid poking BotInterface internals
  let lastBreakthroughs = -1;
  let lastFocusTime = -1;

  // Start Session
  const startSession = vscode.commands.registerCommand(
    "coding-buddy-bot.startSession",
    () => {
      // Pull interval from settings; fallback 60.
      const cfg = vscode.workspace.getConfiguration("codingBuddy");
      const mins = cfg.get<number>("badgeIntervalMinutes", 60);
      codingBuddyBot.setBadgeIntervalMinutes(mins);

      // 👉 For quick testing instead, uncomment the next line:
      codingBuddyBot.setBadgeIntervalMinutes(0.5); // ~30s

      codingBuddyBot.startSession();
      statusBarManager.updateStatus("🟢 Active");
      vscode.window.showInformationMessage(
        "🚀 Coding Buddy Bot session started! Let's code together!"
      );
      sessionStartTime = Date.now();

      // Start timer + water reminders in your webview
      botInterface.startTimer();
      botInterface.startWaterReminder();

      // Update bot interface (only when values change)
      if (sessionTimer) clearInterval(sessionTimer);
      sessionTimer = setInterval(() => {
        const currentBreakthroughs =
          (codingBuddyBot as any)["breakthroughCount"] || 0;
        const currentFocusTime = (codingBuddyBot as any)["focusTime"] || 0;

        if (
          currentBreakthroughs !== lastBreakthroughs ||
          currentFocusTime !== lastFocusTime
        ) {
          // Let the webview own the visible clock; we only push counts here
          botInterface.updateSessionStats(
            0,
            currentBreakthroughs,
            currentFocusTime
          );
          lastBreakthroughs = currentBreakthroughs;
          lastFocusTime = currentFocusTime;
        }
      }, 1000);
    }
  );

  // Stop Session
  const stopSession = vscode.commands.registerCommand(
    "coding-buddy-bot.stopSession",
    () => {
      codingBuddyBot.stopSession();
      statusBarManager.updateStatus("🔴 Inactive");
      vscode.window.showInformationMessage(
        "👋 Coding Buddy Bot session ended. Great work today!"
      );

      // Stop timer and water reminders
      botInterface.stopTimer();
      botInterface.stopWaterReminder();

      if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = undefined;
      }

      // Final update to bot interface with last session duration
      const elapsed = Date.now() - sessionStartTime;
      botInterface.updateSessionStats(
        elapsed,
        (codingBuddyBot as any)["breakthroughCount"] || 0,
        (codingBuddyBot as any)["focusTime"] || 0
      );

      // reset local trackers
      lastBreakthroughs = -1;
      lastFocusTime = -1;
    }
  );

  const showBot = vscode.commands.registerCommand(
    "coding-buddy-bot.showBot",
    () => {
      botInterface.showBot();
    }
  );

  const toggleCamera = vscode.commands.registerCommand(
    "coding-buddy-bot.toggleCamera",
    async () => {
      await codingBuddyBot.toggleCamera();
    }
  );

  const testWebcam = vscode.commands.registerCommand(
    "coding-buddy-bot.testWebcam",
    async () => {
      await codingBuddyBot.testWebcam();
    }
  );

  const openFrameDirectory = vscode.commands.registerCommand(
    "coding-buddy-bot.openFrameDirectory",
    async () => {
      await codingBuddyBot.openFrameDirectory();
    }
  );

  const captureFrame = vscode.commands.registerCommand(
    "coding-buddy-bot.captureFrame",
    async () => {
      await codingBuddyBot.captureFrame();
    }
  );

  context.subscriptions.push(
    startSession,
    stopSession,
    showBot,
    toggleCamera,
    testWebcam,
    openFrameDirectory,
    captureFrame
  );

  // Removed: AI suggestion tracking test commands

  // bulkMonitor already set up above

  // Set initial status
  // ---- Badge history commands (status bar button calls Quick Pick)
  const showBadgeQuickPick = vscode.commands.registerCommand(
    "coding-buddy-bot.showBadgeQuickPick",
    () => codingBuddyBot.showBadgeHistoryQuickPick()
  );

  const showBadgeOutput = vscode.commands.registerCommand(
    "coding-buddy-bot.showBadgeOutput",
    () => codingBuddyBot.showBadgeHistoryOutput()
  );

  // ---- Theme switching / debug commands
  const toggleThemeSwitching = vscode.commands.registerCommand(
    "coding-buddy-bot.toggleThemeSwitching",
    () => {
      const themeManager = require("./themeManager").ThemeManager.getInstance();
      const isEnabled = themeManager.isThemeSwitchingEnabled();
      themeManager.setEnabled(!isEnabled);
    }
  );

  const resetTheme = vscode.commands.registerCommand(
    "coding-buddy-bot.resetTheme",
    async () => {
      const themeManager = require("./themeManager").ThemeManager.getInstance();
      await themeManager.resetToDefaultTheme();
    }
  );

  const previewTheme = vscode.commands.registerCommand(
    "coding-buddy-bot.previewTheme",
    async () => {
      const emotion = await vscode.window.showQuickPick(
        [
          "happy",
          "focused",
          "frustrated",
          "confused",
          "surprised",
          "sad",
          "disgusted",
          "content",
        ],
        { placeHolder: "Select emotion to preview theme" }
      );
      if (emotion) {
        const themeManager =
          require("./themeManager").ThemeManager.getInstance();
        await themeManager.previewTheme(emotion);
      }
    }
  );

  const debugEmotionDetection = vscode.commands.registerCommand(
    "coding-buddy-bot.debugEmotionDetection",
    async () => {
      vscode.window.showInformationMessage(
        "🔍 Check the Developer Console (Help → Toggle Developer Tools) to see raw AI detection results!"
      );
      console.log(
        "🔍 Debug: Check the console above for detailed emotion detection logs"
      );

      const currentEmotion = codingBuddyBot.getLastEmotion
        ? codingBuddyBot.getLastEmotion()
        : "Unknown";
      vscode.window.showInformationMessage(
        `🎯 Current detected emotion: ${currentEmotion}`
      );
    }
  );

  const testThemeChange = vscode.commands.registerCommand(
    "coding-buddy-bot.testThemeChange",
    async () => {
      const themeManager = require("./themeManager").ThemeManager.getInstance();

      // Test if theme switching is enabled
      const isEnabled = themeManager.isThemeSwitchingEnabled();
      vscode.window.showInformationMessage(
        `🎨 Theme switching enabled: ${isEnabled}`
      );

      // Test current theme
      const currentTheme = themeManager.getCurrentTheme();
      vscode.window.showInformationMessage(`🎨 Current theme: ${currentTheme}`);

      // Force test a theme change
      try {
        await vscode.workspace
          .getConfiguration("workbench")
          .update(
            "colorTheme",
            "High Contrast",
            vscode.ConfigurationTarget.Global
          );
        vscode.window.showInformationMessage(
          "🎨 Test theme change: Switched to High Contrast"
        );
      } catch (error) {
        vscode.window.showErrorMessage(`❌ Test theme change failed: ${error}`);
      }
    }
  );

  const toggleMultiModelDetection = vscode.commands.registerCommand(
    "coding-buddy-bot.toggleMultiModelDetection",
    () => {
      const det = codingBuddyBot.getEmotionDetector
        ? codingBuddyBot.getEmotionDetector()
        : null;
      const isEnabled = det?.isMultiModelEnabled?.() ?? false;
      det?.setMultiModelEnabled?.(!isEnabled);
    }
  );

  // One push with everything
  context.subscriptions.push(
    startSession,
    stopSession,
    showBot,
    toggleCamera,
    testWebcam,
    openFrameDirectory,
    captureFrame,
    showBadgeQuickPick,
    showBadgeOutput,
    toggleThemeSwitching,
    resetTheme,
    previewTheme,
    debugEmotionDetection,
    testThemeChange,
    toggleMultiModelDetection
  );

  // Initial status
  statusBarManager.updateStatus("🔴 Inactive");

  // Health reminder timers
  startHealthReminders();
}

export function deactivate() {
  if (codingBuddyBot) {
    codingBuddyBot.stopSession();
  }
}

function startHealthReminders() {
  // Remind to take breaks every 50 minutes
  setInterval(() => {
    if (codingBuddyBot && codingBuddyBot.isSessionActive()) {
      vscode.window.showInformationMessage(
        "💡 Time for a quick break! Stretch those fingers and grab some water!"
      );
    }
  }, 50 * 60 * 1000);

  // Remind to blink every 20 minutes
  setInterval(() => {
    if (codingBuddyBot && codingBuddyBot.isSessionActive()) {
      vscode.window.showInformationMessage(
        "👁️ Remember to blink! Your eyes need a break from the screen."
      );
    }
  }, 20 * 60 * 1000);
}
