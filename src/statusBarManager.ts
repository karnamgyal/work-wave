import * as vscode from 'vscode';

export class StatusBarManager {
    private statusBarItem: vscode.StatusBarItem;
    private isActive: boolean = false;

    constructor() {
        // Create status bar item
        this.statusBarItem = vscode.window.createStatusBarItem(
            'coding-buddy-status',
            vscode.StatusBarAlignment.Right,
            100
        );

        // Set initial properties
        this.statusBarItem.name = 'Coding Buddy Status';
        this.statusBarItem.tooltip = 'Click to show the Coding Buddy Bot interface!';
        this.statusBarItem.command = 'coding-buddy-bot.showBot';
        
        // Show the status bar item
        this.statusBarItem.show();
    }

    public updateStatus(text: string): void {
        this.statusBarItem.text = text;
        
        // Update tooltip based on status
        switch (text) {
            case '🟢 Active':
                this.statusBarItem.tooltip = 'Coding Buddy Bot is active! Click to show the bot interface!';
                this.isActive = true;
                break;
            case '🔴 Inactive':
                this.statusBarItem.tooltip = 'Coding Buddy Bot is inactive. Click to show the bot interface!';
                this.isActive = false;
                break;
            case '📹 Camera On':
                this.statusBarItem.tooltip = 'Camera is active! Click to show the bot interface!';
                break;
            case '📹 Camera Off':
                this.statusBarItem.tooltip = 'Camera is off. Click to show the bot interface!';
                break;
            default:
                this.statusBarItem.tooltip = 'Click to show the Coding Buddy Bot interface!';
        }

        // Update command based on status
        if (this.isActive) {
            this.statusBarItem.command = 'coding-buddy-bot.showBot';
        } else {
            this.statusBarItem.command = 'coding-buddy-bot.showBot';
        }
    }

    public showSessionInfo(sessionDuration: number, breakthroughCount: number): void {
        const minutes = Math.floor(sessionDuration / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        
        let displayText = '';
        
        if (hours > 0) {
            displayText = `🟢 ${hours}h ${minutes % 60}m`;
        } else {
            displayText = `🟢 ${minutes}m`;
        }

        if (breakthroughCount > 0) {
            displayText += ` 🚀${breakthroughCount}`;
        }

        this.statusBarItem.text = displayText;
        this.statusBarItem.tooltip = `Session: ${minutes} minutes | Breakthroughs: ${breakthroughCount}`;
    }

    public showHealthStatus(healthStats: {
        stretchCount: number;
        waterReminderCount: number;
        postureReminderCount: number;
    }): void {
        const { stretchCount, waterReminderCount, postureReminderCount } = healthStats;
        
        let healthEmoji = '💚';
        if (stretchCount > 0 && waterReminderCount > 0 && postureReminderCount > 0) {
            healthEmoji = '🏆'; // All health categories covered
        } else if (stretchCount > 0 || waterReminderCount > 0) {
            healthEmoji = '💪'; // Some health activities done
        }

        this.statusBarItem.text = `🟢 ${healthEmoji}`;
        this.statusBarItem.tooltip = `Health: ${stretchCount} stretches, ${waterReminderCount} water reminders, ${postureReminderCount} posture checks`;
    }

    public showErrorStatus(errorMessage: string): void {
        this.statusBarItem.text = '🔴 Error';
        this.statusBarItem.tooltip = `Error: ${errorMessage}`;
        this.statusBarItem.backgroundColor = new vscode.ThemeColor('errorBar.background');
    }

    public clearErrorStatus(): void {
        this.statusBarItem.backgroundColor = undefined;
        this.updateStatus('🔴 Inactive');
    }

    public getStatusBarItem(): vscode.StatusBarItem {
        return this.statusBarItem;
    }

    public dispose(): void {
        this.statusBarItem.dispose();
    }
}
