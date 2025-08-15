import * as vscode from 'vscode';

export interface HealthTip {
    id: string;
    message: string;
    category: 'stretch' | 'water' | 'posture' | 'eye' | 'break';
    priority: 'low' | 'medium' | 'high';
    cooldown: number; // milliseconds
}

export class HealthMonitor {
    private isMonitoring: boolean = false;
    private healthTimers: Map<string, NodeJS.Timeout> = new Map();
    private lastTipTime: Map<string, number> = new Map();
    private sessionStartTime: number = 0;
    private totalSessionTime: number = 0;
    private stretchCount: number = 0;
    private waterReminderCount: number = 0;
    private postureReminderCount: number = 0;

    private healthTips: HealthTip[] = [
        {
            id: 'stretch-arms',
            message: '💪 Time for a quick arm stretch! Reach up high and then touch your toes. Your muscles will thank you!',
            category: 'stretch',
            priority: 'medium',
            cooldown: 30 * 60 * 1000 // 30 minutes
        },
        {
            id: 'stretch-neck',
            message: '🦒 Neck feeling stiff? Gently roll your head in circles. Left, right, forward, back. Ah, that feels better!',
            category: 'stretch',
            priority: 'medium',
            cooldown: 25 * 60 * 1000 // 25 minutes
        },
        {
            id: 'stretch-fingers',
            message: '👐 Give those coding fingers a break! Stretch them out, make fists, and wiggle them around.',
            category: 'stretch',
            priority: 'low',
            cooldown: 20 * 60 * 1000 // 20 minutes
        },
        {
            id: 'water-reminder',
            message: '💧 Hydration check! Take a sip of water. Your brain works better when it\'s well-hydrated!',
            category: 'water',
            priority: 'high',
            cooldown: 45 * 60 * 1000 // 45 minutes
        },
        {
            id: 'posture-check',
            message: '🧘‍♂️ Posture check! Sit up straight, shoulders back, feet flat on the floor. Good posture = better coding!',
            category: 'posture',
            priority: 'medium',
            cooldown: 35 * 60 * 1000 // 35 minutes
        },
        {
            id: 'eye-rest',
            message: '👁️ 20-20-20 rule! Look at something 20 feet away for 20 seconds. Your eyes need a break from the screen!',
            category: 'eye',
            priority: 'high',
            cooldown: 40 * 60 * 1000 // 40 minutes
        },
        {
            id: 'micro-break',
            message: '☕ Take a 2-minute micro-break! Stand up, walk around, or just look out the window. Fresh perspective incoming!',
            category: 'break',
            priority: 'medium',
            cooldown: 60 * 60 * 1000 // 1 hour
        },
        {
            id: 'deep-breathing',
            message: '🫁 Take 3 deep breaths. In through your nose, out through your mouth. Feel that oxygen powering your brain!',
            category: 'break',
            priority: 'low',
            cooldown: 15 * 60 * 1000 // 15 minutes
        }
    ];

    constructor() {
        console.log('HealthMonitor initialized');
    }

    public startMonitoring(): void {
        if (this.isMonitoring) {
            return;
        }

        this.isMonitoring = true;
        this.sessionStartTime = Date.now();
        this.stretchCount = 0;
        this.waterReminderCount = 0;
        this.postureReminderCount = 0;

        // Start health tip timers
        this.startHealthTipTimers();

        vscode.window.showInformationMessage('🏥 Health monitoring activated! I\'ll help you stay healthy while coding!');
    }

    public stopMonitoring(): void {
        if (!this.isMonitoring) {
            return;
        }

        this.isMonitoring = false;
        this.totalSessionTime += Date.now() - this.sessionStartTime;

        // Clear all timers
        this.clearAllTimers();

        // Show health summary
        this.showHealthSummary();
    }

    private startHealthTipTimers(): void {
        this.healthTips.forEach(tip => {
            const timer = setTimeout(() => {
                this.showHealthTip(tip);
                // Restart timer for this tip
                this.scheduleNextTip(tip);
            }, tip.cooldown);

            this.healthTimers.set(tip.id, timer);
        });
    }

    private scheduleNextTip(tip: HealthTip): void {
        if (!this.isMonitoring) {
            return;
        }

        const timer = setTimeout(() => {
            this.showHealthTip(tip);
            this.scheduleNextTip(tip);
        }, tip.cooldown);

        this.healthTimers.set(tip.id, timer);
    }

    private showHealthTip(tip: HealthTip): void {
        if (!this.isMonitoring) {
            return;
        }

        const now = Date.now();
        const lastTime = this.lastTipTime.get(tip.id) || 0;

        // Check if enough time has passed since last tip
        if (now - lastTime < tip.cooldown) {
            return;
        }

        // Update last tip time
        this.lastTipTime.set(tip.id, now);

        // Track tip categories
        switch (tip.category) {
            case 'stretch':
                this.stretchCount++;
                break;
            case 'water':
                this.waterReminderCount++;
                break;
            case 'posture':
                this.postureReminderCount++;
                break;
        }

        // Show the health tip
        vscode.window.showInformationMessage(tip.message);

        // Log for debugging
        console.log(`Health tip shown: ${tip.message}`);
    }

    private clearAllTimers(): void {
        this.healthTimers.forEach(timer => {
            clearTimeout(timer);
        });
        this.healthTimers.clear();
    }

    private showHealthSummary(): void {
        const sessionDuration = Date.now() - this.sessionStartTime;
        const minutes = Math.floor(sessionDuration / (1000 * 60));

        let summary = `🏥 Health Summary (${minutes} minutes):\n`;
        summary += `• Stretches reminded: ${this.stretchCount}\n`;
        summary += `• Water reminders: ${this.waterReminderCount}\n`;
        summary += `• Posture checks: ${this.postureReminderCount}\n`;

        if (this.stretchCount > 0) {
            summary += `\n💪 Great job staying active! Your body thanks you!`;
        }

        if (this.waterReminderCount > 0) {
            summary += `\n💧 Stay hydrated! Your brain performance depends on it!`;
        }

        if (this.postureReminderCount > 0) {
            summary += `\n🧘‍♂️ Good posture habits will save you from future back pain!`;
        }

        vscode.window.showInformationMessage(summary);
    }

    public getHealthStats(): {
        sessionDuration: number;
        stretchCount: number;
        waterReminderCount: number;
        postureReminderCount: number;
        totalSessionTime: number;
    } {
        const currentSessionTime = this.isMonitoring ? Date.now() - this.sessionStartTime : 0;
        
        return {
            sessionDuration: currentSessionTime,
            stretchCount: this.stretchCount,
            waterReminderCount: this.waterReminderCount,
            postureReminderCount: this.postureReminderCount,
            totalSessionTime: this.totalSessionTime + currentSessionTime
        };
    }

    public forceHealthTip(category?: 'stretch' | 'water' | 'posture' | 'eye' | 'break'): void {
        let availableTips = this.healthTips;
        
        if (category) {
            availableTips = this.healthTips.filter(tip => tip.category === category);
        }

        if (availableTips.length > 0) {
            const randomTip = availableTips[Math.floor(Math.random() * availableTips.length)];
            this.showHealthTip(randomTip);
        }
    }

    public getCustomHealthTip(): string {
        const tips = [
            "🌟 Remember: Every great developer takes care of themselves. You're not just coding, you're building a sustainable career!",
            "💡 Pro tip: The best code often comes after a good stretch and a glass of water!",
            "🎯 Your health is your competitive advantage. Take care of it!",
            "🚀 A healthy developer is a productive developer. Keep up the good habits!",
            "💪 Small health habits compound into big results. You're building a better future!",
            "🧠 Your brain is your most important tool. Keep it well-rested and well-hydrated!",
            "🎉 Celebrate the small wins: every stretch, every water break, every posture check!",
            "🔥 You're not just writing code, you're building a lifestyle that supports your passion!"
        ];

        return tips[Math.floor(Math.random() * tips.length)];
    }
}
