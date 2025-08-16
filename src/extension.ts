import * as vscode from 'vscode';
import { CodingBuddyBot } from './codingBuddyBot';
import { StatusBarManager } from './statusBarManager';
import { BotInterface } from './botInterface';

let codingBuddyBot: CodingBuddyBot;
let statusBarManager: StatusBarManager;
let botInterface: BotInterface;

export function activate(context: vscode.ExtensionContext) {
    console.log('Coding Buddy Bot is now active!');

    // Initialize the coding buddy bot
    codingBuddyBot = new CodingBuddyBot();
    
    // Initialize status bar manager
    statusBarManager = new StatusBarManager();
    
    // Initialize bot interface
    botInterface = new BotInterface();

    // Register commands
    let startSession = vscode.commands.registerCommand('coding-buddy-bot.startSession', () => {
        codingBuddyBot.startSession();
        statusBarManager.updateStatus('🟢 Active');
        vscode.window.showInformationMessage('🚀 Coding Buddy Bot session started! Let\'s code together!');
    });

    let stopSession = vscode.commands.registerCommand('coding-buddy-bot.stopSession', () => {
        codingBuddyBot.stopSession();
        statusBarManager.updateStatus('🔴 Inactive');
        vscode.window.showInformationMessage('👋 Coding Buddy Bot session ended. Great work today!');
    });

    let toggleCamera = vscode.commands.registerCommand('coding-buddy-bot.toggleCamera', () => {
        codingBuddyBot.toggleCamera();
        const isActive = codingBuddyBot.getCameraActive();
        statusBarManager.updateStatus(isActive ? '📹 Camera On' : '📹 Camera Off');
    });

    let showBot = vscode.commands.registerCommand('coding-buddy-bot.showBot', () => {
        botInterface.showBot();
    });

    let testWebcam = vscode.commands.registerCommand('coding-buddy-bot.testWebcam', async () => {
        try {
            const { WebcamManager } = await import('./webcamManager');
            const webcamManager = WebcamManager.getInstance();
            
            vscode.window.showInformationMessage('🔍 Testing webcam access...');
            
            const hasPermission = await webcamManager.initialize();
            if (!hasPermission) {
                vscode.window.showErrorMessage('❌ Webcam permission not granted');
                return;
            }

            const webcamWorks = await webcamManager.testWebcam();
            if (webcamWorks) {
                vscode.window.showInformationMessage('✅ Webcam test successful! Camera is working properly.');
            } else {
                vscode.window.showErrorMessage('❌ Webcam test failed. Please check your camera connection.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Webcam test failed: ${error}`);
        }
    });

    let openFrameDirectory = vscode.commands.registerCommand('coding-buddy-bot.openFrameDirectory', () => {
        if (codingBuddyBot) {
            codingBuddyBot.getEmotionDetector().openTempDirectory();
        } else {
            vscode.window.showWarningMessage('Please start a coding session first!');
        }
    });

    let captureFrame = vscode.commands.registerCommand('coding-buddy-bot.captureFrame', async () => {
        if (codingBuddyBot) {
            await codingBuddyBot.captureFrameAndDetectEmotion();
        } else {
            vscode.window.showWarningMessage('Please start a coding session first!');
        }
    });

    context.subscriptions.push(startSession, stopSession, toggleCamera, showBot, testWebcam, openFrameDirectory, captureFrame);

    // Set initial status
    statusBarManager.updateStatus('🔴 Inactive');

    // Start health reminder timer
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
            vscode.window.showInformationMessage('💡 Time for a quick break! Stretch those fingers and grab some water!');
        }
    }, 50 * 60 * 1000);

    // Remind to blink every 20 minutes
    setInterval(() => {
        if (codingBuddyBot && codingBuddyBot.isSessionActive()) {
            vscode.window.showInformationMessage('👁️ Remember to blink! Your eyes need a break from the screen.');
        }
    }, 20 * 60 * 1000);
}
