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

  // Initialize status bar manager
  statusBarManager = new StatusBarManager();

  // Initialize bot interface
  botInterface = new BotInterface();

  // Initialize bulk insert monitor first so we can consult it in callbacks
  const bulkMonitor = new BulkInsertMonitor();
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
    // Suppress motivational popups if a recent large insert is under review
    const activeDoc = vscode.window.activeTextEditor?.document;
    const suppress = bulkMonitor.isInReviewWindow(activeDoc?.uri);
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

  // Register commands
  let sessionTimer: NodeJS.Timeout | undefined;
  let sessionStartTime: number = 0;

  // In extension.ts, update your command handlers:

  // In your startSession command:
  let startSession = vscode.commands.registerCommand(
    "coding-buddy-bot.startSession",
    () => {
      codingBuddyBot.startSession();
      statusBarManager.updateStatus("🟢 Active");
      vscode.window.showInformationMessage(
        "🚀 Coding Buddy Bot session started! Let's code together!"
      );
      sessionStartTime = Date.now();

      // Start timer and water reminders
      botInterface.startTimer();
      botInterface.startWaterReminder(); // Add this line

      // Start timer to update bot interface every second
      if (sessionTimer) clearInterval(sessionTimer);
      sessionTimer = setInterval(() => {
        const elapsed = Date.now() - sessionStartTime;
        botInterface.updateSessionStats(
          elapsed,
          codingBuddyBot["breakthroughCount"] || 0,
          codingBuddyBot["focusTime"] || 0
        );
      }, 1000);
    }
  );

  // In your stopSession command:
  let stopSession = vscode.commands.registerCommand(
    "coding-buddy-bot.stopSession",
    () => {
      codingBuddyBot.stopSession();
      statusBarManager.updateStatus("🔴 Inactive");
      vscode.window.showInformationMessage(
        "👋 Coding Buddy Bot session ended. Great work today!"
      );

      // Stop timer and water reminders
      botInterface.stopTimer();
      botInterface.stopWaterReminder(); // Add this line

      if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = undefined;
      }
      // Final update to bot interface with last session duration
      const elapsed = Date.now() - sessionStartTime;
      botInterface.updateSessionStats(
        elapsed,
        codingBuddyBot["breakthroughCount"] || 0,
        codingBuddyBot["focusTime"] || 0
      );
    }
  );

  let showBot = vscode.commands.registerCommand(
    "coding-buddy-bot.showBot",
    () => {
      botInterface.showBot();
    }
  );

  context.subscriptions.push(startSession, stopSession, showBot);

  // Removed: AI suggestion tracking test commands

  // bulkMonitor already set up above

  // Set initial status
  statusBarManager.updateStatus("🔴 Inactive");

  // Start health reminder timer
  startHealthReminders();
}

export function deactivate() {
  if (codingBuddyBot) {
    codingBuddyBot.stopSession();
  }
}

// ...existing code...

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
