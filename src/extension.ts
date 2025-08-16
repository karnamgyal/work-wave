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
  
  // Set bot interface reference in coding buddy bot for emotion updates
  codingBuddyBot.setBotInterface(botInterface);

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
    
    // Handle theme switching for code-based emotions
    const themeManager = require('./themeManager').ThemeManager.getInstance();
    themeManager.handleEmotionChange(emotion, 0.8); // High confidence for code-based emotions
    
    // Suppress motivational popups if a recent large insert is under review OR if session is not active
    const activeDoc = vscode.window.activeTextEditor?.document;
    const suppress = bulkMonitor.isInReviewWindow(activeDoc?.uri) || !codingBuddyBot.isSessionActive();
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
        // Only update stats when there are actual changes, not every second
        const currentBreakthroughs = codingBuddyBot["breakthroughCount"] || 0;
        const currentFocusTime = codingBuddyBot["focusTime"] || 0;
        
        // Update stats only if there are changes in breakthroughs or focus time
        if (currentBreakthroughs !== botInterface["breakthroughCount"] || 
            currentFocusTime !== botInterface["focusTime"]) {
          botInterface.updateSessionStats(
            0, // Don't update duration from extension - let webview handle it
            currentBreakthroughs,
            currentFocusTime
          );
        }
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

  let toggleCamera = vscode.commands.registerCommand(
    "coding-buddy-bot.toggleCamera",
    async () => {
      await codingBuddyBot.toggleCamera();
    }
  );

  let testWebcam = vscode.commands.registerCommand(
    "coding-buddy-bot.testWebcam",
    async () => {
      await codingBuddyBot.testWebcam();
    }
  );

  let openFrameDirectory = vscode.commands.registerCommand(
    "coding-buddy-bot.openFrameDirectory",
    async () => {
      await codingBuddyBot.openFrameDirectory();
    }
  );

  let captureFrame = vscode.commands.registerCommand(
    "coding-buddy-bot.captureFrame",
    async () => {
      await codingBuddyBot.captureFrame();
    }
  );

  // Theme switching commands
  let toggleThemeSwitching = vscode.commands.registerCommand(
    "coding-buddy-bot.toggleThemeSwitching",
    () => {
      const themeManager = require('./themeManager').ThemeManager.getInstance();
      const isEnabled = themeManager.isThemeSwitchingEnabled();
      themeManager.setEnabled(!isEnabled);
    }
  );

  let resetTheme = vscode.commands.registerCommand(
    "coding-buddy-bot.resetTheme",
    async () => {
      const themeManager = require('./themeManager').ThemeManager.getInstance();
      await themeManager.resetToDefaultTheme();
    }
  );

  let previewTheme = vscode.commands.registerCommand(
    "coding-buddy-bot.previewTheme",
    async () => {
      const emotion = await vscode.window.showQuickPick([
        'happy', 'focused', 'frustrated', 'confused', 'surprised', 'sad', 'disgusted', 'content'
      ], {
        placeHolder: 'Select emotion to preview theme'
      });
      if (emotion) {
        const themeManager = require('./themeManager').ThemeManager.getInstance();
        await themeManager.previewTheme(emotion);
      }
    }
  );

  let debugEmotionDetection = vscode.commands.registerCommand(
    "coding-buddy-bot.debugEmotionDetection",
    async () => {
      vscode.window.showInformationMessage('🔍 Check the Developer Console (Help → Toggle Developer Tools) to see raw AI detection results!');
      console.log('🔍 Debug: Check the console above for detailed emotion detection logs');
      
      // Show current detection status
      const currentEmotion = codingBuddyBot.getLastEmotion ? codingBuddyBot.getLastEmotion() : 'Unknown';
      vscode.window.showInformationMessage(`🎯 Current detected emotion: ${currentEmotion}`);
    }
  );

  let testThemeChange = vscode.commands.registerCommand(
    "coding-buddy-bot.testThemeChange",
    async () => {
      const themeManager = require('./themeManager').ThemeManager.getInstance();
      
      // Test if theme switching is enabled
      const isEnabled = themeManager.isThemeSwitchingEnabled();
      vscode.window.showInformationMessage(`🎨 Theme switching enabled: ${isEnabled}`);
      
      // Test current theme
      const currentTheme = themeManager.getCurrentTheme();
      vscode.window.showInformationMessage(`🎨 Current theme: ${currentTheme}`);
      
      // Test available themes
      const availableThemes = await vscode.workspace.getConfiguration('workbench').get('colorTheme') as string;
      console.log('🎨 Available themes:', availableThemes);
      
      // Force test a theme change
      try {
        await vscode.workspace.getConfiguration('workbench').update('colorTheme', 'High Contrast', vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage('🎨 Test theme change: Switched to High Contrast');
      } catch (error) {
        vscode.window.showErrorMessage(`❌ Test theme change failed: ${error}`);
      }
    }
  );

  let toggleMultiModelDetection = vscode.commands.registerCommand(
    "coding-buddy-bot.toggleMultiModelDetection",
    () => {
      const isEnabled = codingBuddyBot.getEmotionDetector ? codingBuddyBot.getEmotionDetector().isMultiModelEnabled() : false;
      codingBuddyBot.getEmotionDetector ? codingBuddyBot.getEmotionDetector().setMultiModelEnabled(!isEnabled) : null;
    }
  );

  context.subscriptions.push(startSession, stopSession, showBot, toggleCamera, testWebcam, openFrameDirectory, captureFrame, toggleThemeSwitching, resetTheme, previewTheme, debugEmotionDetection, testThemeChange, toggleMultiModelDetection);

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
