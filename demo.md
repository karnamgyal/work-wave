# 🚀 Coding Buddy Bot Demo Guide

## Quick Start Demo

### 1. **Install Dependencies**

```bash
npm install
```

### 2. **Compile the Extension**

```bash
npm run compile
```

### 3. **Run in VS Code**

- Open the project in VS Code
- Press `F5` to launch the Extension Development Host
- A new VS Code window will open with your extension loaded

### 4. **Test the Extension**

#### Start a Session

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type: `Start Coding Buddy Session`
3. Click the command
4. You'll see: 🚀 Coding Buddy Bot session started! Let's code together!

#### Toggle Camera (Mock Mode)

1. In Command Palette, type: `Toggle Camera`
2. Click the command
3. You'll see: 📹 Camera turned on - I'm watching for your awesome moments!
4. The extension will simulate emotion detection every 2-5 seconds

#### Check Status Bar

- Look at the bottom-right status bar
- You'll see the Coding Buddy Bot status indicator
- Click it to toggle camera or start sessions

### 5. **Watch for Feedback**

During your "coding session," you'll see messages like:

- 🎉 BREAKTHROUGH ALERT! You just solved something that was puzzling you!
- 💪 Great focus! You're building momentum.
- 💧 Hydration check! Take a sip of water.
- 💪 Time for a quick arm stretch!

### 6. **Health Reminders**

The bot will automatically remind you to:

- Stretch every 20-30 minutes
- Drink water every 45 minutes
- Check posture every 35 minutes
- Rest your eyes every 40 minutes

### 7. **End Session**

1. Command Palette: `Stop Coding Buddy Session`
2. You'll get a session summary showing:
   - Session duration
   - Emotions detected
   - Breakthroughs
   - Focus time
   - Health activities

## 🎯 What You'll Experience

### Mock Emotion Detection

Since we're in development mode, the extension simulates:

- **Focused** → **Frustrated** → **Happy** (Breakthrough!)
- **Concentrated** → **Confused** → **Confident** (Another breakthrough!)
- Realistic emotion transitions every 2-5 seconds

### Motivational Messages

- Context-aware encouragement
- Celebration of "breakthroughs"
- Support during "frustration"
- Recognition of focus and progress

### Health Monitoring

- Timed reminders for wellness
- Session health summaries
- Encouragement for healthy habits

## 🔧 Development Notes

### Current Status: Mock Mode

- No real camera required
- Simulated emotion detection
- All features work for testing
- Perfect for development and demonstration

### Next Steps for Production

1. Integrate real OpenCV/MediaPipe
2. Add actual webcam support
3. Implement real emotion classification
4. Deploy to VS Code Marketplace

## 🎉 Demo Tips

1. **Let it run**: Keep the session active for 10+ minutes to see all features
2. **Watch the console**: Check the Developer Console for emotion change logs
3. **Try commands**: Experiment with all three commands
4. **Observe timing**: Notice how health reminders appear at different intervals

## 🚨 Troubleshooting

### Extension Not Loading?

- Check console for errors
- Ensure `npm run compile` completed successfully
- Restart VS Code if needed

### No Messages Appearing?

- Make sure a session is started
- Check that camera is toggled on
- Wait 2-5 seconds for first emotion detection

### Health Reminders Not Working?

- Health monitoring starts automatically with sessions
- First reminders appear after their respective cooldown periods
- Check console for health tip logs

---

**Enjoy your coding session with your new AI buddy! 🎯✨**
