# Coding Buddy Bot 🚀

A VS Code extension that acts as your personal coding companion, using computer vision to track your coding sessions and provide motivational feedback to help overcome impostor syndrome!

## ✨ Features

### 🎯 **Emotion Detection & Motivation**
- **Webcam Integration**: Tracks your facial expressions and posture using computer vision
- **Real-time Feedback**: Provides encouraging messages based on your emotional state
- **Breakthrough Detection**: Celebrates when you solve problems or understand concepts
- **Impostor Syndrome Support**: Gives you the confidence boost you need while coding

### 🏥 **Health & Wellness Monitoring**
- **Stretch Reminders**: Gentle prompts to stretch your arms, neck, and fingers
- **Hydration Alerts**: Reminds you to stay hydrated for optimal brain performance
- **Posture Checks**: Encourages good sitting posture to prevent back pain
- **Eye Care**: 20-20-20 rule reminders to reduce eye strain
- **Micro-breaks**: Suggests short breaks to maintain productivity

### 📊 **Session Analytics**
- **Focus Tracking**: Monitors your concentration levels during coding
- **Breakthrough Counter**: Tracks your problem-solving victories
- **Session Summaries**: Provides insights into your coding patterns
- **Health Statistics**: Shows your wellness activity during sessions

## 🚀 Getting Started

### Installation

1. **Clone this repository**:
   ```bash
   git clone <repository-url>
   cd coding-buddy-bot
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Compile the extension**:
   ```bash
   npm run compile
   ```

4. **Open in VS Code**:
   ```bash
   code .
   ```

5. **Press F5** to run the extension in a new Extension Development Host window

### Usage

#### Starting a Session
1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type "Start Coding Buddy Session"
3. Click the command to begin

#### Camera Control
- **Toggle Camera**: Use the command "Toggle Camera" to turn webcam on/off
- **Status Bar**: Click the status bar item to see current status and options

#### Commands Available
- `coding-buddy-bot.startSession` - Start a new coding session
- `coding-buddy-bot.stopSession` - End the current session
- `coding-buddy-bot.toggleCamera` - Turn camera on/off

## 🔧 Configuration

### Camera Permissions
The extension requires webcam access to function. Make sure to:
- Allow camera permissions when prompted
- Ensure your webcam is working and accessible
- Check that no other applications are using the camera

### Health Reminder Timing
Health reminders are automatically scheduled:
- **Stretches**: Every 20-30 minutes
- **Water**: Every 45 minutes
- **Posture**: Every 35 minutes
- **Eye Care**: Every 40 minutes
- **Micro-breaks**: Every hour

## 🎭 How It Works

### Emotion Detection
The extension uses computer vision to detect:
- **Focused/Concentrated**: Deep thinking and problem-solving
- **Happy/Confident**: Successful moments and understanding
- **Frustrated/Confused**: When you're working through challenges
- **Surprised**: Discovery and "aha!" moments

### Motivational Feedback
Based on detected emotions, the bot provides:
- **Encouragement** during challenging moments
- **Celebration** of breakthroughs and successes
- **Support** for maintaining focus and productivity
- **Recognition** of your growth and progress

### Health Monitoring
The health system tracks:
- **Physical activity** through stretch reminders
- **Hydration** with water break suggestions
- **Posture** maintenance for long-term health
- **Eye care** to prevent digital eye strain

## 🛠️ Technical Details

### Architecture
- **Main Extension** (`extension.ts`): Orchestrates all components
- **CodingBuddyBot** (`codingBuddyBot.ts`): Core bot logic and session management
- **EmotionDetector** (`emotionDetector.ts`): Computer vision and emotion recognition
- **MotivationalFeedback** (`motivationalFeedback.ts`): Context-aware encouragement system
- **HealthMonitor** (`healthMonitor.ts`): Wellness tracking and reminders
- **StatusBarManager** (`statusBarManager.ts`): VS Code UI integration

### Dependencies
- **OpenCV**: Computer vision processing
- **MediaPipe**: Face detection and tracking
- **Face-API.js**: Emotion recognition
- **VS Code API**: Extension development

### Mock Mode
Currently, the extension runs in mock mode for development purposes. This simulates:
- Emotion detection without requiring actual camera hardware
- Realistic emotion transitions during coding sessions
- All feedback and health monitoring features

## 🚧 Future Enhancements

### Real Computer Vision Integration
- [ ] OpenCV integration for real-time video processing
- [ ] MediaPipe face mesh detection
- [ ] Emotion classification models
- [ ] Posture detection algorithms

### Advanced Features
- [ ] Machine learning for personalized feedback
- [ ] Integration with productivity tools
- [ ] Team collaboration features
- [ ] Analytics dashboard
- [ ] Customizable reminder schedules

### Health Improvements
- [ ] Heart rate monitoring (if hardware available)
- [ ] Stress level detection
- [ ] Personalized health recommendations
- [ ] Integration with fitness trackers

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit your changes**: `git commit -m 'Add amazing feature'`
4. **Push to the branch**: `git push origin feature/amazing-feature`
5. **Open a Pull Request**

### Development Guidelines
- Follow TypeScript best practices
- Add tests for new features
- Update documentation for changes
- Ensure VS Code extension guidelines compliance

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **VS Code Extension API** for the development platform
- **OpenCV community** for computer vision tools
- **MediaPipe team** for face detection technology
- **All developers** who struggle with impostor syndrome - you're not alone!

## 📞 Support

- **Issues**: Report bugs and feature requests on GitHub
- **Discussions**: Join community discussions
- **Documentation**: Check the wiki for detailed guides

---

**Remember**: Every great developer started somewhere. You're not an impostor - you're learning and growing! 🌟

*Built with ❤️ for the developer community*
