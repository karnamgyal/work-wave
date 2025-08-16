import * as vscode from 'vscode';
import { EmotionDetector } from './emotionDetector';
import { MotivationalFeedback } from './motivationalFeedback';
import { HealthMonitor } from './healthMonitor';
import { ThemeManager } from './themeManager';

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

    private botInterface: any = null; // for webview emotion updates
    private themeManager: ThemeManager;
    private lastEmotion: string = 'unknown';

    // ---- Badge tracking / timing ----
    private badgeTimeout: NodeJS.Timeout | undefined;
    private badgeClockRunning: boolean = false;
    private badgeIntervalMinutes: number = 60; // real interval (minutes)
    private readonly __TEST_BADGE_INTERVAL__ = false; // set true only if you want ~6s badges

    private badgesThisSession: { label: string; at: number }[] = [];

    // ---- Lightweight UI for badges (no custom webview) ----
    private badgeStatusItem: vscode.StatusBarItem | undefined;
    private badgeOutput: vscode.OutputChannel | undefined;

    constructor() {
        this.emotionDetector = new EmotionDetector();
        this.motivationalFeedback = new MotivationalFeedback();
        this.healthMonitor = new HealthMonitor();
        this.themeManager = ThemeManager.getInstance();
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
        this.sessionStartTime = Date.now();
        this.emotionChangeCount = 0;
        this.focusTime = 0;
        this.frustrationTime = 0;
        this.breakthroughCount = 0;

        // reset per-session badges
        this.badgesThisSession = [];
        this.updateBadgeStatusItem();

        vscode.window.showInformationMessage('🎯 Starting your coding session! I\'ll be here to cheer you on!');

        // read interval from settings (fallback 60)
        const cfg = vscode.workspace.getConfiguration("codingBuddy");
        const mins = cfg.get<number>("badgeIntervalMinutes", 60);
        this.setBadgeIntervalMinutes(mins);

        // Start emotion detection & health monitoring
        await this.startEmotionDetection();
        this.healthMonitor.startMonitoring();

        // start badge timer AFTER session starts
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

    public isSessionActive(): boolean { return this.isActive; }
    public getCameraActive(): boolean { return this.isCameraActive; }
    public getLastEmotion(): string { return this.lastEmotion || 'unknown'; }
    public getEmotionDetector(): any { return this.emotionDetector; }
    public setBotInterface(botInterface: any): void { this.botInterface = botInterface; }

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

        // Only show notifications for high-confidence detections AND when session is active
        if (confidence > 0.3 && this.isActive) {
            switch (emotion) {
                case 'happy':
                    vscode.window.showInformationMessage(`😊 I can see you're happy! Your positive energy is contagious! (${Math.round(confidence * 100)}% confidence)`);
                    break;
                case 'focused':
                    if (this.focusTime > 5 * 60 * 1000) {
                        vscode.window.showInformationMessage(`🎯 You're in the zone! That focused expression shows real concentration! (${Math.round(confidence * 100)}% confidence)`);
                    }
                    break;
                case 'frustrated':
                    vscode.window.showInformationMessage(`😤 I see you're frustrated. Remember, every debugging session makes you stronger! (${Math.round(confidence * 100)}% confidence)`);
                    break;
                case 'confused':
                    vscode.window.showInformationMessage(`🤔 Confusion is just your brain processing new information. You've got this! (${Math.round(confidence * 100)}% confidence)`);
                    break;
                case 'surprised':
                    vscode.window.showInformationMessage(`😲 Ooh! Did you just discover something amazing? I love those "aha!" moments! (${Math.round(confidence * 100)}% confidence)`);
                    break;
            }
        }

        // Update emotion tracking
        this.lastEmotionTime = Date.now();
        this.emotionChangeCount++;
        this.lastEmotion = emotion;

        // Track focus time
        if (emotion === 'focused') {
            this.focusTime += 5000; // ~5s polling cadence
        }

        // Update bot interface webview with emotion
        if (this.botInterface && confidence > 0.3) {
            const reason = `Detected via camera (${Math.round(confidence * 100)}% confidence)`;
            this.botInterface.updateEmotion(emotion, reason);
        }

        // Theme switching
        this.themeManager.handleEmotionChange(emotion, confidence);

        // Optional: low-frequency encouragement (kept low to avoid spam)
        this.provideRealTimeFeedback(emotion, confidence);
    }

    private showBreakthroughMessage(): void {
        if (!this.isActive) return;
        const messages = [
            "🎉 BREAKTHROUGH ALERT! You just solved something that was puzzling you! That's elite problem-solving energy!",
            "🚀 BOOM! You just leveled up your understanding! I saw that lightbulb moment!",
            "💪 YES! You went from confused to confident - that's the growth mindset in action!",
            "🔥 What a transformation! You just unlocked a new level of coding wisdom!",
            "🌟 Incredible! You just turned confusion into clarity. That's what separates good devs from great ones!"
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        vscode.window.showInformationMessage(randomMessage);
    }

    private showEncouragementMessage(): void {
        if (!this.isActive) return;
        const messages = [
            "💪 Hey, I see you're working through something challenging. That's exactly how you grow! Take a deep breath.",
            "🧠 Stuck on something? That's your brain building new neural pathways. You're getting smarter!",
            "🌟 Every great developer has been exactly where you are. Keep pushing - breakthroughs happen after the struggle!",
            "💡 Sometimes the best code comes after the toughest debugging sessions. You've got this!",
            "🎯 I believe in you! Every line of code you write makes you a better developer."
        ];
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        vscode.window.showInformationMessage(randomMessage);
    }

    private provideRealTimeFeedback(emotion: string, confidence: number): void {
        // only occasionally to avoid spam AND only when active
        if (Math.random() > 0.02 || !this.isActive) return;
        switch (emotion) {
            case 'focused':
                if (this.focusTime > 10 * 60 * 1000) {
                    vscode.window.showInformationMessage('🎯 You\'ve been in the zone for a while! That\'s some serious flow state energy!');
                }
                break;
            case 'happy':
                vscode.window.showInformationMessage('😊 Love seeing that smile! Coding should be fun!');
                break;
            case 'confident':
                vscode.window.showInformationMessage('💪 That confidence looks great on you! You\'re owning this code!');
                break;
            case 'surprised':
                vscode.window.showInformationMessage('😲 Ooh! Did you just discover something cool? I love those "aha!" moments!');
                break;
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
        if (!this.isActive) { console.log("⛔ startBadgeClock: session not active"); return; }
        if (!this.sessionStartTime) { console.log("⛔ startBadgeClock: no sessionStartTime"); return; }
        if (this.badgeClockRunning) { console.log("ℹ️ startBadgeClock: already running"); return; }

        this.badgeClockRunning = true;

        // If testing, override to ~6s
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
            if (!this.isActive) { this.stopBadgeClock(); return; }
            this.awardTimeBadge(k);
            this.scheduleNextBadge();
        }, delay);
    }

    private awardTimeBadge(nth: number): void {
        if (!this.isActive) { console.log("⛔ awardTimeBadge: session not active"); return; }

        // Optional: custom names from settings (fallback to time label)
        const cfg = vscode.workspace.getConfiguration("codingBuddy");
        const names = cfg.get<string[]>("badgeNames", []);
        const customName = names.length ? (names[(nth - 1) % names.length]) : undefined;

        const base = `Focus +${this.badgeIntervalMinutes} min (Badge #${nth})`;
        const label = customName ? `🏅 ${customName} (+${this.badgeIntervalMinutes} min)` : `⏱️ ${base}`;
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
