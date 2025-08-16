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

    constructor() {
        this.emotionDetector = new EmotionDetector();
        this.motivationalFeedback = new MotivationalFeedback();
        this.healthMonitor = new HealthMonitor();
    }

    public async startSession(): Promise<void> {
        if (this.isActive) {
            return;
        }

        this.isActive = true;
        this.sessionStartTime = Date.now();
        this.emotionChangeCount = 0;
        this.focusTime = 0;
        this.frustrationTime = 0;
        this.breakthroughCount = 0;

        vscode.window.showInformationMessage('🎯 Starting your coding session! I\'ll be here to cheer you on!');

        // Start emotion detection
        await this.startEmotionDetection();

        // Start health monitoring
        this.healthMonitor.startMonitoring();
    }

    public stopSession(): void {
        if (!this.isActive) {
            return;
        }

        this.isActive = false;
        this.isCameraActive = false;
        this.emotionDetector.stopDetection();
        this.healthMonitor.stopMonitoring();

        // Show session summary
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

    private async startEmotionDetection(): Promise<void> {
        if (!this.isCameraActive) {
            return;
        }

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
    // EmotionDetector's random emotions are ignored for bot interface/status bar
    // Only codeAnalyzer-driven emotions are shown in the UI
    // This method is now a no-op for UI updates
    return;
    }

    private showBreakthroughMessage(): void {
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
        // Only provide feedback occasionally to avoid spam
        if (Math.random() > 0.1) {
            return;
        }

        switch (emotion) {
            case 'focused':
                if (this.focusTime > 10 * 60 * 1000) { // 10 minutes
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

    private showSessionSummary(): void {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const minutes = Math.floor(sessionDuration / (1000 * 60));
        
        let summary = `🎯 Session Summary (${minutes} minutes):\n`;
        summary += `• Emotions detected: ${this.emotionChangeCount}\n`;
        summary += `• Breakthroughs: ${this.breakthroughCount}\n`;
        summary += `• Focus time: ${Math.floor(this.focusTime / (1000 * 60))} minutes\n`;
        
        if (this.breakthroughCount > 0) {
            summary += `\n🚀 You had ${this.breakthroughCount} breakthrough moments! That's incredible progress!`;
        }
        
        if (this.focusTime > sessionDuration * 0.7) {
            summary += `\n🎯 You were focused for ${Math.floor((this.focusTime / sessionDuration) * 100)}% of your session! Amazing concentration!`;
        }

        vscode.window.showInformationMessage(summary);
    }
}
