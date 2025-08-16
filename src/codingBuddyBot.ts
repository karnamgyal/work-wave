import * as vscode from 'vscode';
import { EmotionDetector } from './emotionDetector';
import { MotivationalFeedback } from './motivationalFeedback';
import { HealthMonitor } from './healthMonitor';

export class CodingBuddyBot {
    private emotionDetector: EmotionDetector;
    private motivationalFeedback: MotivationalFeedback;
    private healthMonitor: HealthMonitor;

    private isActive: boolean = false;
    private isCameraActive: boolean = false;
    private sessionStartTime: number = 0;
    private lastEmotionTime: number = 0;
    private emotionChangeCount: number = 0;
    private focusTime: number = 0;
    private frustrationTime: number = 0;
    private breakthroughCount: number = 0;

    // ---- Badge tracking / timing ----
    private badgeTimeout: NodeJS.Timeout | undefined;
    private badgeClockRunning: boolean = false;
    private badgeIntervalMinutes: number = 60; // real interval (minutes)
    // Toggle TRUE for quick testing (0.1 min ≈ 6s). Keep FALSE for real use.
    private readonly __TEST_BADGE_INTERVAL__ = false;

    private badgesThisSession: { label: string; at: number }[] = [];

    // ---- Lightweight UI for badges (no custom webview) ----
    private badgeStatusItem: vscode.StatusBarItem | undefined;
    private badgeOutput: vscode.OutputChannel | undefined;

    constructor() {
        this.emotionDetector = new EmotionDetector();
        this.motivationalFeedback = new MotivationalFeedback();
        this.healthMonitor = new HealthMonitor();
    }

    // Call once from activate()
    public initUI(context: vscode.ExtensionContext) {
        this.badgeStatusItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 98);
        this.badgeStatusItem.tooltip = "Coding Buddy: Show badges earned this session";
        this.badgeStatusItem.command = "coding-buddy-bot.showBadgeQuickPick";
        this.badgeStatusItem.text = "🏅 0";
        this.badgeStatusItem.show();
        context.subscriptions.push(this.badgeStatusItem);
    }

    private updateBadgeStatusItem() {
        if (this.badgeStatusItem) {
            this.badgeStatusItem.text = `🏅 ${this.badgesThisSession.length}`;
        }
    }

    // Optional: settings/control hook
    public setBadgeIntervalMinutes(mins: number) {
        if (mins <= 0) return;
        this.badgeIntervalMinutes = mins;
        // only restart if already in a session
        if (this.isActive) {
            this.stopBadgeClock();
            this.startBadgeClock();
        }
    }

    public getBadgesThisSession(): { label: string; at: number }[] {
        return [...this.badgesThisSession];
    }

    // ---- Public session controls ----

    public async startSession(): Promise<void> {
        if (this.isActive) return;

        this.isActive = true;
        this.sessionStartTime = Date.now(); // anchor BEFORE starting badge clock
        this.emotionChangeCount = 0;
        this.focusTime = 0;
        this.frustrationTime = 0;
        this.breakthroughCount = 0;

        // reset per-session badges
        this.badgesThisSession = [];
        this.updateBadgeStatusItem();

        vscode.window.showInformationMessage('🎯 Starting your coding session! I\'ll be here to cheer you on!');

        await this.startEmotionDetection();
        this.healthMonitor.startMonitoring();

        // Start the drift-free badge clock (only after Start)
        this.startBadgeClock();
    }

    public stopSession(): void {
        if (!this.isActive) return;

        // stop badge scheduling first so nothing fires after stop
        this.stopBadgeClock();

        this.isActive = false;
        this.isCameraActive = false;

        this.emotionDetector.stopDetection();
        this.healthMonitor.stopMonitoring();

        this.showSessionSummary();
    }

    public async toggleCamera(): Promise<void> {
        if (!this.isActive) {
            vscode.window.showWarningMessage('Please start a coding session first!');
            return;
        }

        if (this.isCameraActive) {
            this.isCameraActive = false;
            this.emotionDetector.stopDetection();
            vscode.window.showInformationMessage('📹 Camera turned off');
        } else {
            this.isCameraActive = true;
            await this.startEmotionDetection();
            vscode.window.showInformationMessage('📹 Camera turned on - I\'m watching for your awesome moments!');
        }
    }

    public isSessionActive(): boolean {
        return this.isActive;
    }

    public getCameraActive(): boolean {
        return this.isCameraActive;
    }

    public async testWebcam(): Promise<void> {
        try {
            const webcamWorks = await this.emotionDetector.testWebcam();
            if (webcamWorks) {
                vscode.window.showInformationMessage('✅ Webcam test successful! Camera is working properly.');
            } else {
                vscode.window.showErrorMessage('❌ Webcam test failed. Please check your camera permissions and connections.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Webcam test failed: ${error}`);
        }
    }

    public async openFrameDirectory(): Promise<void> {
        try {
            const frameDir = this.emotionDetector.getFrameDirectory();
            if (frameDir) {
                const uri = vscode.Uri.file(frameDir);
                await vscode.commands.executeCommand('vscode.openFolder', uri);
                vscode.window.showInformationMessage('📁 Opened frame directory');
            } else {
                vscode.window.showWarningMessage('No frame directory available');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open frame directory: ${error}`);
        }
    }

    public async captureFrame(): Promise<void> {
        if (!this.isActive) {
            vscode.window.showWarningMessage('Please start a coding session first!');
            return;
        }

        try {
            const emotion = await this.emotionDetector.captureAndDetectEmotion();
            if (emotion) {
                vscode.window.showInformationMessage(`📸 Frame captured! Detected emotion: ${emotion}`);
            } else {
                vscode.window.showInformationMessage('📸 Frame captured! No emotion detected.');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to capture frame: ${error}`);
        }
    }

    // ---- Emotion handling ----

    private async startEmotionDetection(): Promise<void> {
        if (!this.isCameraActive) return;

        try {
            await this.emotionDetector.startDetection((emotion: string, confidence: number) => {
                this.handleEmotionChange(emotion, confidence);
            });
        } catch (error) {
            vscode.window.showErrorMessage('Failed to start camera. Please check your webcam permissions.');
            this.isCameraActive = false;
        }
    }

    private handleEmotionChange(emotion: string, confidence: number): void {
        console.log(`[ROBOFLOW] Emotion detected: ${emotion} (confidence: ${Math.round(confidence * 100)}%)`);

        if (confidence > 0.3) {
            switch (emotion) {
                case 'happy':
                    vscode.window.showInformationMessage(`😊 I can see you're happy! (${Math.round(confidence * 100)}% confidence)`);
                    break;
                case 'focused':
                    if (this.focusTime > 5 * 60 * 1000) {
                        vscode.window.showInformationMessage(`🎯 You're in the zone! (${Math.round(confidence * 100)}% confidence)`);
                    }
                    break;
                case 'frustrated':
                    vscode.window.showInformationMessage(`😤 I see you're frustrated. Debugging makes you stronger!`);
                    break;
                case 'confused':
                    vscode.window.showInformationMessage(`🤔 Confusion is learning in progress — keep going!`);
                    break;
                case 'surprised':
                    vscode.window.showInformationMessage(`😲 Surprise! Was that an "aha" moment?`);
                    break;
            }
        }

        this.lastEmotionTime = Date.now();
        this.emotionChangeCount++;

        if (emotion === 'focused') {
            this.focusTime += 5000; // assuming detector runs ~5s cadence
        }
    }

    // ---- Session summary ----

    private showSessionSummary(): void {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const minutes = Math.floor(sessionDuration / (1000 * 60));

        let summary = `🎯 Session Summary (${minutes} minutes):\n`;
        summary += `• Emotions detected: ${this.emotionChangeCount}\n`;
        summary += `• Breakthroughs: ${this.breakthroughCount}\n`;
        summary += `• Focus time: ${Math.floor(this.focusTime / (1000 * 60))} minutes\n`;
        summary += `• Badges earned: ${this.badgesThisSession.length}\n`;

        const recent = this.badgesThisSession.slice(0, 3)
            .map(b => new Date(b.at).toLocaleTimeString())
            .join(", ");
        if (recent) summary += `• Recent badges: ${recent}\n`;

        vscode.window.showInformationMessage(summary);
    }

    // ---- Badge clock (drift-free + hard guards) ----

    private startBadgeClock(): void {
        // Only start if a session is active and anchored
        if (!this.isActive) { console.log("⛔ startBadgeClock: session not active"); return; }
        if (!this.sessionStartTime) { console.log("⛔ startBadgeClock: no sessionStartTime"); return; }
        if (this.badgeClockRunning) { console.log("ℹ️ startBadgeClock: already running"); return; }

        this.badgeClockRunning = true;

        // If testing, override to 0.1 min (~6s)
        const testInterval = this.__TEST_BADGE_INTERVAL__ ? 0.1 : this.badgeIntervalMinutes;
        this.badgeIntervalMinutes = testInterval;

        this.scheduleNextBadge();
        console.log(`🏆 Badge clock started – every ${this.badgeIntervalMinutes} minute(s)`);
    }

    private stopBadgeClock(): void {
        if (this.badgeTimeout) {
            clearTimeout(this.badgeTimeout);
            this.badgeTimeout = undefined;
        }
        this.badgeClockRunning = false;
        console.log("🏆 Badge clock stopped");
    }

    // Anchored to sessionStartTime; fires at 1×, 2×, 3× intervals
    private scheduleNextBadge(): void {
        if (!this.isActive) { this.stopBadgeClock(); return; }
        if (!this.sessionStartTime) { this.stopBadgeClock(); return; }

        const now = Date.now();
        const intervalMs = this.badgeIntervalMinutes * 60 * 1000;
        const elapsed = now - this.sessionStartTime;

        const k = Math.floor(elapsed / intervalMs) + 1; // next whole multiple
        const nextAt = this.sessionStartTime + k * intervalMs;
        const delay = Math.max(0, nextAt - now);

        this.badgeTimeout = setTimeout(() => {
            // Double-check active right before awarding
            if (!this.isActive) { this.stopBadgeClock(); return; }
            this.awardTimeBadge(k);
            this.scheduleNextBadge();
        }, delay);
    }

    private awardTimeBadge(nth: number): void {
        if (!this.isActive) { console.log("⛔ awardTimeBadge: session not active"); return; }

        const label = `⏱️ Focus +${this.badgeIntervalMinutes} min (Badge #${nth})`;
        const at = Date.now();

        this.badgesThisSession.unshift({ label, at });
        if (this.badgesThisSession.length > 200) this.badgesThisSession.length = 200;

        this.updateBadgeStatusItem();

        vscode.window.showInformationMessage(`🏅 ${label}`, "Claim Badge")
            .then(sel => { if (sel === "Claim Badge") this.claimBadge(); });
    }

    private claimBadge(): void {
        vscode.window.showInformationMessage("🎉 Badge claimed! Keep up the great work!");
        console.log("🏆 Badge claimed by the user");
    }

    // ---- Badge viewers (no new custom UI) ----

    public showBadgeHistoryQuickPick(): void {
        if (this.badgesThisSession.length === 0) {
            vscode.window.showInformationMessage("No badges earned this session yet.");
            return;
        }
        const items = this.badgesThisSession.map(b => ({
            label: b.label,
            description: new Date(b.at).toLocaleTimeString()
        }));
        vscode.window.showQuickPick(items, {
            placeHolder: "Badges this session (newest first)"
        }).then(() => { /* no-op */ });
    }

    public showBadgeHistoryOutput(): void {
        if (!this.badgeOutput) {
            this.badgeOutput = vscode.window.createOutputChannel("Coding Buddy • Badges");
        }
        this.badgeOutput.clear();
        this.badgeOutput.appendLine("🏅 Badges this session (newest first):\n");
        if (this.badgesThisSession.length === 0) {
            this.badgeOutput.appendLine("  (none yet)");
        } else {
            for (const b of this.badgesThisSession) {
                this.badgeOutput.appendLine(`• ${b.label} — ${new Date(b.at).toLocaleString()}`);
            }
        }
        this.badgeOutput.show(true);
    }
}
