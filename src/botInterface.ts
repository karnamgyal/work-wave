import * as vscode from "vscode";

export class BotInterface {
  private panel: vscode.WebviewPanel | undefined;
  private currentEmotion: string = "focused";
  private sessionDuration: number = 0;
  private breakthroughCount: number = 0;
  private focusTime: number = 0;
  private currentReason: string = "Ready to code!";
  private waterReminderTimer: NodeJS.Timeout | undefined;
  private codeStats: {
    lineCount: number;
    errorCount: number;
    complexity: number;
    quality: string;
  } = {
    lineCount: 0,
    errorCount: 0,
    complexity: 0,
    quality: "good",
  };

  constructor() {
    console.log("BotInterface initialized");
  }

  public showBot(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    // Create and show panel
    this.panel = vscode.window.createWebviewPanel(
      "codingBuddyBot",
      "🤖 Coding Buddy Bot",
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    // Set the HTML content
    this.updateBotInterface();

    // Handle panel disposal
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });

    // Handle messages from webview
    if (this.panel && this.panel.webview) {
      this.panel.webview.onDidReceiveMessage((message: any) => {
        switch (message.command) {
          case "startSession":
            vscode.commands.executeCommand("coding-buddy-bot.startSession");
            break;
          case "stopSession":
            vscode.commands.executeCommand("coding-buddy-bot.stopSession");
            break;
        }
      });
    }
  }

  public updateBotInterface(): void {
    if (!this.panel) {
      return;
    }

    this.panel.webview.html = this.getWebviewContent();
  }

  public updateEmotion(emotion: string, reason?: string): void {
    console.log(
      `[BOT INTERFACE] updateEmotion called: ${emotion}, reason: ${reason}`
    );
    this.currentEmotion = emotion;
    if (reason) {
      this.currentReason = reason;
    }
    if (this.panel) {
      this.updateBotInterface();
    }
  }

  public updateCodeStats(stats: {
    lineCount: number;
    errorCount: number;
    complexity: number;
    quality: string;
  }): void {
    this.codeStats = stats;
    this.updateBotInterface();
  }

  public updateSessionStats(
    duration: number,
    breakthroughs: number,
    focus: number
  ): void {
    this.sessionDuration = duration;
    this.breakthroughCount = breakthroughs;
    this.focusTime = focus;
    this.updateBotInterface();
  }

  public startTimer(): void {
    if (this.panel) {
      this.panel.webview.postMessage({ command: 'startTimer' });
    }
  }

  public stopTimer(): void {
    if (this.panel) {
      this.panel.webview.postMessage({ command: 'stopTimer' });
    }
  }

  public startWaterReminder(): void {
    this.stopWaterReminder();
    
    this.waterReminderTimer = setInterval(() => {
      this.showWaterNotification();
    }, 15 * 1000);
    
    console.log("💧 Water reminder started - notifications every 15 seconds");
  }

  public stopWaterReminder(): void {
    if (this.waterReminderTimer) {
      clearInterval(this.waterReminderTimer);
      this.waterReminderTimer = undefined;
      console.log("💧 Water reminder stopped");
    }
  }

  private showWaterNotification(): void {
    const waterMessages = [
      "💧 Time to hydrate! Take a sip of water and keep that brain working smoothly!",
      "🚰 Hydration checkpoint! Your body needs water to keep coding at peak performance!",
      "💦 Don't forget to drink water! Stay hydrated, stay focused!",
      "🥤 Water break reminder! Your coding buddy cares about your health!",
      "💧 Quick hydration reminder - your brain is 75% water, keep it topped up!"
    ];

    const randomMessage = waterMessages[Math.floor(Math.random() * waterMessages.length)];
    
    vscode.window.showInformationMessage(randomMessage);
    
    if (this.panel) {
      this.panel.webview.postMessage({ 
        command: 'waterReminder', 
        message: randomMessage 
      });
    }
  }

  private getWebviewContent(): string {
    const minutes = Math.floor(this.sessionDuration / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const displayTime =
      hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Coding Buddy Bot</title>
                <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }

                    body {
                        font-family: 'Rajdhani', 'Segoe UI', monospace;
                        margin: 0;
                        padding: 20px;
                        background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%);
                        color: #00ffff;
                        min-height: 100vh;
                        overflow-x: hidden;
                        position: relative;
                    }

                    body::before {
                        content: '';
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: 
                            radial-gradient(circle at 20% 80%, rgba(0, 255, 255, 0.05) 0%, transparent 50%),
                            radial-gradient(circle at 80% 20%, rgba(255, 0, 255, 0.05) 0%, transparent 50%),
                            radial-gradient(circle at 40% 40%, rgba(0, 255, 0, 0.03) 0%, transparent 50%);
                        pointer-events: none;
                        z-index: -1;
                    }

                    .bot-container {
                        text-align: center;
                        max-width: 800px;
                        margin: 0 auto;
                        position: relative;
                    }

                    .bot-avatar {
                        font-size: 120px;
                        margin: 20px 0;
                        animation: float 3s ease-in-out infinite, glow 2s ease-in-out infinite alternate;
                        filter: drop-shadow(0 0 20px #00ffff);
                        position: relative;
                    }

                    .bot-avatar::after {
                        content: '';
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        width: 120%;
                        height: 120%;
                        border: 2px solid rgba(0, 255, 255, 0.3);
                        border-radius: 50%;
                        animation: scan 4s linear infinite;
                        pointer-events: none;
                    }

                    h1 {
                        font-family: 'Orbitron', monospace;
                        font-weight: 900;
                        font-size: 3rem;
                        background: linear-gradient(45deg, #00ffff, #ff00ff, #ffff00);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                        margin-bottom: 10px;
                        text-shadow: 0 0 30px rgba(0, 255, 255, 0.5);
                        animation: textGlow 3s ease-in-out infinite alternate;
                    }

                    .subtitle {
                        font-family: 'Rajdhani', sans-serif;
                        font-size: 1.2rem;
                        color: #00ffff;
                        margin-bottom: 30px;
                        opacity: 0.8;
                        text-transform: lowercase;
                        letter-spacing: 2px;
                    }

                    .bot-status {
                        background: linear-gradient(135deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1));
                        padding: 25px;
                        border-radius: 20px;
                        margin: 25px 0;
                        backdrop-filter: blur(15px);
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        box-shadow: 
                            0 0 30px rgba(0, 255, 255, 0.2),
                            inset 0 0 30px rgba(0, 255, 255, 0.05);
                        position: relative;
                        overflow: hidden;
                    }

                    .bot-status::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.1), transparent);
                        animation: shimmer 3s infinite;
                    }

                    .bot-status h2 {
                        font-family: 'Orbitron', monospace;
                        font-weight: 700;
                        color: #00ffff;
                        margin-bottom: 15px;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                    }

                    .emotion-display {
                        font-size: 24px;
                        margin: 15px 0;
                        padding: 15px;
                        background: rgba(0, 255, 255, 0.1);
                        border-radius: 15px;
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }

                    .reason-display {
                        font-size: 18px;
                        margin: 15px 0;
                        padding: 15px;
                        background: linear-gradient(135deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 0, 0.1));
                        border-radius: 15px;
                        border: 1px solid rgba(255, 0, 255, 0.3);
                        font-style: italic;
                        color: #ff00ff;
                    }

                    .stats-grid {
                        display: grid;
                        grid-template-columns: 1fr;
                        gap: 20px;
                        margin: 30px 0;
                    }

                    .stat-card {
                        background: linear-gradient(135deg, rgba(0, 255, 255, 0.05), rgba(0, 100, 255, 0.05));
                        padding: 20px;
                        border-radius: 15px;
                        text-align: center;
                        border: 1px solid rgba(0, 255, 255, 0.3);
                        backdrop-filter: blur(10px);
                        box-shadow: 0 5px 25px rgba(0, 255, 255, 0.1);
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                    }

                    .stat-card:hover {
                        transform: translateY(-10px) scale(1.05);
                        box-shadow: 0 15px 35px rgba(0, 255, 255, 0.3);
                        border-color: rgba(0, 255, 255, 0.6);
                    }

                    .stat-card::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.2), transparent);
                        transition: left 0.6s ease;
                    }

                    .stat-card:hover::before {
                        left: 100%;
                    }

                    .stat-value {
                        font-family: 'Orbitron', monospace;
                        font-size: 32px;
                        font-weight: 900;
                        margin: 10px 0;
                        color: #00ffff;
                        text-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
                    }

                    .stat-label {
                        font-size: 14px;
                        opacity: 0.8;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        font-weight: 500;
                    }

                    .code-analysis {
                        background: linear-gradient(135deg, rgba(255, 0, 255, 0.05), rgba(0, 255, 0, 0.05));
                        padding: 25px;
                        border-radius: 20px;
                        margin: 30px 0;
                        border: 1px solid rgba(255, 0, 255, 0.3);
                        backdrop-filter: blur(10px);
                        box-shadow: 0 10px 30px rgba(255, 0, 255, 0.1);
                    }

                    .code-analysis h3 {
                        font-family: 'Orbitron', monospace;
                        color: #ff00ff;
                        margin-bottom: 20px;
                        text-transform: uppercase;
                        letter-spacing: 2px;
                    }

                    .code-stats-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 15px;
                        margin: 20px 0;
                    }

                    .code-stat-card {
                        background: rgba(255, 0, 255, 0.1);
                        padding: 15px;
                        border-radius: 12px;
                        text-align: center;
                        border: 1px solid rgba(255, 0, 255, 0.2);
                        transition: all 0.3s ease;
                    }

                    .code-stat-card:hover {
                        background: rgba(255, 0, 255, 0.2);
                        transform: translateY(-5px);
                        box-shadow: 0 10px 20px rgba(255, 0, 255, 0.2);
                    }

                    .code-stat-value {
                        font-family: 'Orbitron', monospace;
                        font-size: 24px;
                        font-weight: bold;
                        margin: 5px 0;
                        color: #ff00ff;
                    }

                    .code-stat-label {
                        font-size: 12px;
                        opacity: 0.8;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }

                    .controls {
                        margin: 30px 0;
                    }

                    .btn {
                        background: linear-gradient(45deg, rgba(0, 255, 255, 0.2), rgba(0, 100, 255, 0.2));
                        border: 2px solid #00ffff;
                        color: #00ffff;
                        padding: 15px 30px;
                        margin: 10px;
                        border-radius: 50px;
                        cursor: pointer;
                        font-size: 16px;
                        font-family: 'Orbitron', monospace;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        transition: all 0.3s ease;
                        position: relative;
                        overflow: hidden;
                        backdrop-filter: blur(10px);
                        box-shadow: 0 5px 15px rgba(0, 255, 255, 0.3);
                    }

                    .btn::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.4), transparent);
                        transition: left 0.6s ease;
                    }

                    .btn:hover {
                        background: linear-gradient(45deg, rgba(0, 255, 255, 0.4), rgba(0, 100, 255, 0.4));
                        transform: translateY(-3px) scale(1.05);
                        box-shadow: 
                            0 10px 25px rgba(0, 255, 255, 0.4),
                            0 0 30px rgba(0, 255, 255, 0.3);
                        text-shadow: 0 0 10px rgba(0, 255, 255, 0.8);
                    }

                    .btn:hover::before {
                        left: 100%;
                    }

                    .btn:active {
                        transform: translateY(0) scale(1);
                    }

                    .btn:disabled {
                        background: rgba(100, 100, 100, 0.2);
                        border-color: rgba(100, 100, 100, 0.3);
                        color: rgba(150, 150, 150, 0.5);
                        cursor: not-allowed;
                        opacity: 0.4;
                        box-shadow: none;
                    }

                    .btn:disabled:hover {
                        transform: none;
                        box-shadow: none;
                        text-shadow: none;
                    }

                    .message-log {
                        background: linear-gradient(135deg, rgba(0, 0, 0, 0.3), rgba(0, 50, 50, 0.2));
                        padding: 20px;
                        border-radius: 15px;
                        margin: 25px 0;
                        max-height: 300px;
                        overflow-y: auto;
                        text-align: left;
                        border: 1px solid rgba(0, 255, 255, 0.2);
                        backdrop-filter: blur(10px);
                    }

                    .message-log h3 {
                        font-family: 'Orbitron', monospace;
                        color: #00ffff;
                        margin-bottom: 15px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }

                    .message {
                        margin: 8px 0;
                        padding: 12px;
                        background: rgba(0, 255, 255, 0.05);
                        border-radius: 10px;
                        font-size: 14px;
                        border-left: 3px solid rgba(0, 255, 255, 0.3);
                        transition: all 0.3s ease;
                        animation: messageSlide 0.5s ease-out;
                    }

                    .message:hover {
                        background: rgba(0, 255, 255, 0.1);
                        transform: translateX(5px);
                    }

                    .water-message {
                        background: rgba(0, 150, 255, 0.1);
                        border-left: 3px solid #0096ff;
                        box-shadow: 0 0 15px rgba(0, 150, 255, 0.2);
                    }

                    /* Custom Scrollbar */
                    .message-log::-webkit-scrollbar {
                        width: 8px;
                    }

                    .message-log::-webkit-scrollbar-track {
                        background: rgba(0, 0, 0, 0.2);
                        border-radius: 10px;
                    }

                    .message-log::-webkit-scrollbar-thumb {
                        background: linear-gradient(180deg, #00ffff, #0066cc);
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
                    }

                    .message-log::-webkit-scrollbar-thumb:hover {
                        background: linear-gradient(180deg, #00cccc, #0044aa);
                    }

                    /* Animations */
                    @keyframes float {
                        0%, 100% { transform: translateY(0px); }
                        50% { transform: translateY(-10px); }
                    }

                    @keyframes glow {
                        0% { filter: drop-shadow(0 0 20px #00ffff); }
                        100% { filter: drop-shadow(0 0 30px #00ffff) drop-shadow(0 0 40px #00ffff); }
                    }

                    @keyframes scan {
                        0% { transform: translate(-50%, -50%) rotate(0deg); }
                        100% { transform: translate(-50%, -50%) rotate(360deg); }
                    }

                    @keyframes textGlow {
                        0% { text-shadow: 0 0 20px rgba(0, 255, 255, 0.5); }
                        100% { text-shadow: 0 0 30px rgba(0, 255, 255, 0.8), 0 0 40px rgba(255, 0, 255, 0.3); }
                    }

                    @keyframes shimmer {
                        0% { left: -100%; }
                        100% { left: 100%; }
                    }

                    @keyframes messageSlide {
                        0% { transform: translateX(-20px); opacity: 0; }
                        100% { transform: translateX(0); opacity: 1; }
                    }

                    @keyframes pulse {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.05); opacity: 0.8; }
                    }

                    .pulse {
                        animation: pulse 2s infinite;
                    }

                    /* Responsive Design */
                    @media (max-width: 768px) {
                        .stats-grid {
                            grid-template-columns: 1fr;
                            gap: 15px;
                        }
                        
                        .bot-avatar {
                            font-size: 80px;
                        }
                        
                        h1 {
                            font-size: 2rem;
                        }
                        
                        .btn {
                            padding: 12px 24px;
                            font-size: 14px;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="bot-container">
                    <div class="bot-avatar pulse">
                        ${this.getBotEmoji()}
                    </div>
                    
                    <h1>WorkWave</h1>
                    <div class="subtitle">your coding companion</div>
                    
                    <div class="bot-status">
                        <h2>Current Status</h2>
                        <div class="emotion-display">
                            🎭 Feeling: <strong>${this.currentEmotion}</strong>
                        </div>
                        <div class="reason-display">
                            💭 ${this.currentReason}
                        </div>
                    </div>
                    
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-value">⏱️</div>
                            <div class="stat-value" id="session-timer">${displayTime}</div>
                            <div class="stat-label">Session Time</div>
                        </div>
                    </div>
                    
                    <div class="code-analysis">
                        <h3>📊 Code Analysis</h3>
                        <div class="code-stats-grid">
                            <div class="code-stat-card">
                                <div class="code-stat-value">📝</div>
                                <div class="code-stat-value">${this.codeStats.lineCount}</div>
                                <div class="code-stat-label">Lines of Code</div>
                            </div>
                            <div class="code-stat-card">
                                <div class="code-stat-value">❌</div>
                                <div class="code-stat-value">${this.codeStats.errorCount}</div>
                                <div class="code-stat-label">Errors</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="controls">
                        <button class="btn" onclick="startSession()" id="start-btn">🚀 Start Session</button>
                        <button class="btn" onclick="stopSession()" id="stop-btn">⏹️ Stop Session</button>
                    </div>
                    
                    <div class="message-log" id="message-log">
                        <h3>💬 Recent Messages</h3>
                        <div class="message">🎯 Welcome to your coding session!</div>
                        <div class="message">💪 I'm here to cheer you on and keep you healthy!</div>
                        <div class="message">🌟 Remember: Every great developer started somewhere!</div>
                    </div>
                </div>
                
                <script>
                    const vscodeApi = acquireVsCodeApi();
                    let timerInterval = null;
                    let sessionStartTime = null;
                    let isTimerRunning = false;
                    
                    function startSession() {
                        vscodeApi.postMessage({ command: 'startSession' });
                    }
                    
                    function stopSession() {
                        vscodeApi.postMessage({ command: 'stopSession' });
                    }
                    
                    function updateTimerDisplay() {
                        if (!sessionStartTime || !isTimerRunning) return;
                        
                        const now = Date.now();
                        const elapsed = now - sessionStartTime;
                        const totalSeconds = Math.floor(elapsed / 1000);
                        
                        const hours = Math.floor(totalSeconds / 3600);
                        const minutes = Math.floor((totalSeconds % 3600) / 60);
                        const seconds = totalSeconds % 60;
                        
                        let timeString;
                        if (hours > 0) {
                            timeString = hours + 'h ' + minutes + 'm ' + seconds + 's';
                        } else {
                            timeString = minutes + 'm ' + seconds + 's';
                        }
                        
                        const timerElement = document.getElementById('session-timer');
                        if (timerElement) {
                            timerElement.textContent = timeString;
                        }
                    }
                    
                    function startTimer() {
                        sessionStartTime = Date.now();
                        isTimerRunning = true;
                        
                        updateTimerDisplay();
                        
                        if (timerInterval) {
                            clearInterval(timerInterval);
                        }
                        timerInterval = setInterval(updateTimerDisplay, 1000);
                        
                        const startBtn = document.getElementById('start-btn');
                        const stopBtn = document.getElementById('stop-btn');
                        if (startBtn) startBtn.disabled = true;
                        if (stopBtn) stopBtn.disabled = false;
                    }
                    
                    function stopTimer() {
                        isTimerRunning = false;
                        
                        if (timerInterval) {
                            clearInterval(timerInterval);
                            timerInterval = null;
                        }
                        
                        const startBtn = document.getElementById('start-btn');
                        const stopBtn = document.getElementById('stop-btn');
                        if (startBtn) startBtn.disabled = false;
                        if (stopBtn) stopBtn.disabled = true;
                    }
                    
                    function addWaterMessage(message) {
                        const messageLog = document.getElementById('message-log');
                        if (messageLog) {
                            const newMessage = document.createElement('div');
                            newMessage.className = 'message water-message';
                            newMessage.textContent = message;
                            
                            const messages = messageLog.querySelectorAll('.message');
                            if (messages.length > 0) {
                                messageLog.insertBefore(newMessage, messages);
                            } else {
                                messageLog.appendChild(newMessage);
                            }
                            
                            const allMessages = messageLog.querySelectorAll('.message');
                            if (allMessages.length > 10) {
                                allMessages[allMessages.length - 1].remove();
                            }
                        }
                    }
                    
                    window.addEventListener('message', function(event) {
                        const message = event.data;
                        switch (message.command) {
                            case 'startTimer':
                                startTimer();
                                break;
                            case 'stopTimer':
                                stopTimer();
                                break;
                            case 'waterReminder':
                                addWaterMessage(message.message);
                                break;
                        }
                    });
                    
                    document.addEventListener('DOMContentLoaded', function() {
                        const startBtn = document.getElementById('start-btn');
                        const stopBtn = document.getElementById('stop-btn');
                        if (startBtn) startBtn.disabled = false;
                        if (stopBtn) stopBtn.disabled = true;
                    });
                </script>
            </body>
            </html>
        `;
  }

  private getBotEmoji(): string {
    const emojiMap: { [key: string]: string } = {
      happy: "😊",
      frustrated: "😤",
      concerned: "😟",
    };
    return emojiMap[this.currentEmotion] || "🤖";
  }

  public dispose(): void {
    this.stopWaterReminder();
    
    if (this.panel) {
      this.panel.dispose();
    }
  }
}