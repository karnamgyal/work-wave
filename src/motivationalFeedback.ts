import * as vscode from 'vscode';

export interface FeedbackContext {
    emotion: string;
    sessionDuration: number;
    breakthroughCount: number;
    focusTime: number;
    frustrationTime: number;
    lastEmotion: string;
}

export class MotivationalFeedback {
    private feedbackHistory: string[] = [];
    private lastFeedbackTime: number = 0;
    private feedbackCooldown: number = 30000; // 30 seconds between feedback

    constructor() {
        console.log('MotivationalFeedback initialized');
    }

    public getFeedback(context: FeedbackContext): string | null {
        const now = Date.now();
        
        // Check cooldown to avoid spam
        if (now - this.lastFeedbackTime < this.feedbackCooldown) {
            return null;
        }

        // Generate appropriate feedback based on context
        const feedback = this.generateContextualFeedback(context);
        
        if (feedback) {
            this.lastFeedbackTime = now;
            this.feedbackHistory.push(feedback);
            
            // Keep only last 10 feedback messages
            if (this.feedbackHistory.length > 10) {
                this.feedbackHistory.shift();
            }
        }

        return feedback;
    }

    private generateContextualFeedback(context: FeedbackContext): string | null {
        const { emotion, sessionDuration, breakthroughCount, focusTime, frustrationTime, lastEmotion } = context;
        
        // Breakthrough detection (frustration -> happiness/confidence)
        if (this.isBreakthrough(lastEmotion, emotion)) {
            return this.getBreakthroughFeedback(breakthroughCount);
        }

        // Focus and productivity feedback
        if (emotion === 'focused' || emotion === 'concentrated') {
            return this.getFocusFeedback(focusTime, sessionDuration);
        }

        // Frustration support
        if (emotion === 'frustrated' || emotion === 'confused') {
            return this.getFrustrationSupport(frustrationTime);
        }

        // General encouragement
        if (emotion === 'happy' || emotion === 'confident') {
            return this.getEncouragementFeedback(emotion);
        }

        // Session milestone feedback
        return this.getMilestoneFeedback(sessionDuration, breakthroughCount);
    }

    private isBreakthrough(lastEmotion: string, currentEmotion: string): boolean {
        const negativeEmotions = ['frustrated', 'confused', 'sad', 'angry'];
        const positiveEmotions = ['happy', 'confident', 'excited', 'surprised'];
        
        return negativeEmotions.includes(lastEmotion) && positiveEmotions.includes(currentEmotion);
    }

    private getBreakthroughFeedback(breakthroughCount: number): string {
        const messages = [
            "🎉 BREAKTHROUGH ALERT! You just solved something that was puzzling you! That's elite problem-solving energy!",
            "🚀 BOOM! You just leveled up your understanding! I saw that lightbulb moment!",
            "💪 YES! You went from confused to confident - that's the growth mindset in action!",
            "🔥 What a transformation! You just unlocked a new level of coding wisdom!",
            "🌟 Incredible! You just turned confusion into clarity. That's what separates good devs from great ones!",
            "🎯 Look at you go! From stuck to unstoppable - that's the power of persistence!",
            "⚡ Lightning strike moment! You just connected the dots that were eluding you!",
            "🏆 That's a breakthrough! You're not just coding, you're evolving as a developer!"
        ];

        if (breakthroughCount > 5) {
            messages.push("🔥 You're on FIRE today! Multiple breakthroughs - you're absolutely crushing it!");
        }

        return messages[Math.floor(Math.random() * messages.length)];
    }

    private getFocusFeedback(focusTime: number, sessionDuration: number): string | null {
        const focusPercentage = focusTime / sessionDuration;
        
        if (focusPercentage > 0.8) {
            return "🎯 You're in the ZONE! That's some serious flow state energy. Keep riding this wave!";
        } else if (focusPercentage > 0.6) {
            return "💪 Great focus! You're building momentum. Every focused minute makes you stronger!";
        } else if (focusPercentage > 0.4) {
            return "🎯 Nice focus! You're finding your rhythm. Keep building on this!";
        }
        
        return null;
    }

    private getFrustrationSupport(frustrationTime: number): string | null {
        const minutes = Math.floor(frustrationTime / (1000 * 60));
        
        if (minutes > 10) {
            return "💪 You've been working through this for a while. That's exactly how breakthroughs happen. Take a deep breath and keep going!";
        } else if (minutes > 5) {
            return "🧠 Stuck on something? That's your brain building new neural pathways. You're getting smarter with every challenge!";
        } else if (minutes > 2) {
            return "🌟 Every great developer has been exactly where you are. Keep pushing - breakthroughs happen after the struggle!";
        }
        
        return null;
    }

    private getEncouragementFeedback(emotion: string): string {
        const messages = {
            'happy': [
                "😊 Love seeing that smile! Coding should be fun and you're making it look easy!",
                "😄 Your happiness is contagious! Keep spreading that positive coding energy!",
                "😊 That joy in your face tells me you're loving what you're building!"
            ],
            'confident': [
                "💪 That confidence looks great on you! You're owning this code!",
                "🔥 You're radiating confidence! That's the energy of someone who knows their stuff!",
                "💪 Look at that confident posture! You're not just coding, you're commanding the keyboard!"
            ],
            'excited': [
                "🚀 I can feel your excitement! Something amazing is happening in that code!",
                "⚡ Your excitement is electric! That's the energy that drives innovation!",
                "🎉 Love the enthusiasm! You're not just coding, you're creating magic!"
            ]
        };

        const emotionMessages = messages[emotion as keyof typeof messages] || messages['happy'];
        return emotionMessages[Math.floor(Math.random() * emotionMessages.length)];
    }

    private getMilestoneFeedback(sessionDuration: number, breakthroughCount: number): string | null {
        const minutes = Math.floor(sessionDuration / (1000 * 60));
        
        // Hour milestone
        if (minutes === 60) {
            return "⏰ You've been coding for a full hour! That's dedication. You're building something amazing!";
        }
        
        // 30-minute milestone
        if (minutes === 30) {
            return "⏰ Half an hour of focused coding! You're building momentum and skill!";
        }
        
        // 15-minute milestone
        if (minutes === 15) {
            return "⏰ Quarter hour in! You're finding your flow. Keep it going!";
        }
        
        // Multiple breakthroughs milestone
        if (breakthroughCount >= 3) {
            return "🏆 Three breakthroughs in one session! You're absolutely unstoppable today!";
        }
        
        return null;
    }

    public getRandomMotivationalQuote(): string {
        const quotes = [
            "The only way to do great work is to love what you do. - Steve Jobs",
            "Code is like humor. When you have to explain it, it's bad. - Cory House",
            "First, solve the problem. Then, write the code. - John Johnson",
            "Sometimes it pays to stay in bed on Monday, rather than spending the rest of the week debugging Monday's code. - Dan Salomon",
            "Any fool can write code that a computer can understand. Good programmers write code that humans can understand. - Martin Fowler",
            "Programming isn't about what you know; it's about what you can figure out. - Chris Pine",
            "The best error message is the one that never shows up. - Thomas Fuchs",
            "Code never lies, comments sometimes do. - Ron Jeffries"
        ];

        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    public getFeedbackHistory(): string[] {
        return [...this.feedbackHistory];
    }

    public clearFeedbackHistory(): void {
        this.feedbackHistory = [];
    }
}
