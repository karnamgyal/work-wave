import * as vscode from 'vscode';

export class BotInterface {
    private panel: vscode.WebviewPanel | undefined;
    private currentEmotion: string = 'focused';
    private sessionDuration: number = 0;
    private breakthroughCount: number = 0;
    private focusTime: number = 0;

    constructor() {
        console.log('BotInterface initialized');
    }

    public showBot(): void {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        // Create and show panel
        this.panel = vscode.window.createWebviewPanel(
            'codingBuddyBot',
            '🤖 Coding Buddy Bot',
            vscode.ViewColumn.Two,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        // Set the HTML content
        this.updateBotInterface();

        // Handle panel disposal
        this.panel.onDidDispose(() => {
            this.panel = undefined;
        });

        // Handle messages from webview
        this.panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'startSession':
                        vscode.commands.executeCommand('coding-buddy-bot.startSession');
                        break;
                    case 'stopSession':
                        vscode.commands.executeCommand('coding-buddy-bot.stopSession');
                        break;
                    case 'toggleCamera':
                        vscode.commands.executeCommand('coding-buddy-bot.toggleCamera');
                        break;
                }
            }
        );
    }

    public updateBotInterface(): void {
        if (!this.panel) {
            return;
        }

        this.panel.webview.html = this.getWebviewContent();
    }

    public updateEmotion(emotion: string): void {
        this.currentEmotion = emotion;
        this.updateBotInterface();
    }

    public updateSessionStats(duration: number, breakthroughs: number, focus: number): void {
        this.sessionDuration = duration;
        this.breakthroughCount = breakthroughs;
        this.focusTime = focus;
        this.updateBotInterface();
    }

    private getWebviewContent(): string {
        const minutes = Math.floor(this.sessionDuration / (1000 * 60));
        const hours = Math.floor(minutes / 60);
        const displayTime = hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Coding Buddy Bot</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        min-height: 100vh;
                    }
                    .bot-container {
                        text-align: center;
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    .bot-avatar {
                        font-size: 120px;
                        margin: 20px 0;
                        animation: bounce 2s infinite;
                    }
                    .bot-status {
                        background: rgba(255, 255, 255, 0.1);
                        padding: 20px;
                        border-radius: 15px;
                        margin: 20px 0;
                        backdrop-filter: blur(10px);
                    }
                    .emotion-display {
                        font-size: 24px;
                        margin: 15px 0;
                        padding: 10px;
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 10px;
                    }
                    .stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin: 20px 0;
                    }
                    .stat-card {
                        background: rgba(255, 255, 255, 0.15);
                        padding: 15px;
                        border-radius: 10px;
                        text-align: center;
                    }
                    .stat-value {
                        font-size: 28px;
                        font-weight: bold;
                        margin: 5px 0;
                    }
                    .stat-label {
                        font-size: 14px;
                        opacity: 0.8;
                    }
                    .controls {
                        margin: 20px 0;
                    }
                    .btn {
                        background: rgba(255, 255, 255, 0.2);
                        border: none;
                        color: white;
                        padding: 12px 24px;
                        margin: 5px;
                        border-radius: 25px;
                        cursor: pointer;
                        font-size: 16px;
                        transition: all 0.3s ease;
                    }
                    .btn:hover {
                        background: rgba(255, 255, 255, 0.3);
                        transform: translateY(-2px);
                    }
                    .btn:active {
                        transform: translateY(0);
                    }
                    .message-log {
                        background: rgba(0, 0, 0, 0.2);
                        padding: 15px;
                        border-radius: 10px;
                        margin: 20px 0;
                        max-height: 200px;
                        overflow-y: auto;
                        text-align: left;
                    }
                    .message {
                        margin: 5px 0;
                        padding: 8px;
                        background: rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        font-size: 14px;
                    }
                    @keyframes bounce {
                        0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
                        40% { transform: translateY(-10px); }
                        60% { transform: translateY(-5px); }
                    }
                    .pulse {
                        animation: pulse 2s infinite;
                    }
                    @keyframes pulse {
                        0% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                        100% { transform: scale(1); }
                    }
                </style>
            </head>
            <body>
                <div class="bot-container">
                    <div class="bot-avatar pulse">
                        ${this.getBotEmoji()}
                    </div>
                    
                    <h1>🤖 Coding Buddy Bot</h1>
                    
                    <div class="bot-status">
                        <h2>Current Status</h2>
                        <div class="emotion-display">
                            🎭 Feeling: <strong>${this.currentEmotion}</strong>
                        </div>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">⏱️</div>
                            <div class="stat-value">${displayTime}</div>
                            <div class="stat-label">Session Time</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">🚀</div>
                            <div class="stat-value">${this.breakthroughCount}</div>
                            <div class="stat-label">Breakthroughs</div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-value">🎯</div>
                            <div class="stat-value">${Math.floor(this.focusTime / (1000 * 60))}m</div>
                            <div class="stat-label">Focus Time</div>
                        </div>
                    </div>
                    
                    <div class="controls">
                        <button class="btn" onclick="startSession()">🚀 Start Session</button>
                        <button class="btn" onclick="stopSession()">⏹️ Stop Session</button>
                        <button class="btn" onclick="toggleCamera()">📹 Toggle Camera</button>
                    </div>
                    
                    <div class="message-log">
                        <h3>💬 Recent Messages</h3>
                        <div class="message">🎯 Welcome to your coding session!</div>
                        <div class="message">💪 I'm here to cheer you on and keep you healthy!</div>
                        <div class="message">🌟 Remember: Every great developer started somewhere!</div>
                    </div>
                </div>
                
                <script>
                    function startSession() {
                        vscode.postMessage({ command: 'startSession' });
                    }
                    
                    function stopSession() {
                        vscode.postMessage({ command: 'stopSession' });
                    }
                    
                    function toggleCamera() {
                        vscode.postMessage({ command: 'toggleCamera' });
                    }
                    
                    // Simulate bot activity
                    setInterval(() => {
                        const emotions = ['focused', 'happy', 'confident', 'frustrated', 'confused', 'surprised'];
                        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
                        
                        // Update emotion display
                        const emotionDisplay = document.querySelector('.emotion-display');
                        if (emotionDisplay) {
                            emotionDisplay.innerHTML = \`🎭 Feeling: <strong>\${randomEmotion}</strong>\`;
                        }
                        
                        // Update bot avatar
                        const botAvatar = document.querySelector('.bot-avatar');
                        if (botAvatar) {
                            botAvatar.innerHTML = getBotEmoji(randomEmotion);
                        }
                    }, 5000);
                    
                    function getBotEmoji(emotion = 'focused') {
                        const emojiMap = {
                            'focused': '🤔',
                            'happy': '😊',
                            'confident': '💪',
                            'frustrated': '😤',
                            'confused': '🤷‍♂️',
                            'surprised': '😲'
                        };
                        return emojiMap[emotion] || '🤖';
                    }
                </script>
            </body>
            </html>
        `;
    }

    private getBotEmoji(): string {
        const emojiMap: { [key: string]: string } = {
            'focused': '🤔',
            'happy': '😊',
            'confident': '💪',
            'frustrated': '😤',
            'confused': '🤷‍♂️',
            'surprised': '😲'
        };
        return emojiMap[this.currentEmotion] || '🤖';
    }

    public dispose(): void {
        if (this.panel) {
            this.panel.dispose();
        }
    }
}
