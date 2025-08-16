# Webcam Setup Guide for Coding Buddy Bot

## Prerequisites

### 1. Install Required Dependencies

On macOS, you need to install `imagesnap` for webcam access:

```bash
brew install imagesnap
```

### 2. Grant Camera Permissions

1. Open **System Preferences** → **Security & Privacy** → **Camera**
2. Make sure **Visual Studio Code** is checked/enabled
3. If VS Code is not listed, try running the extension first and it will prompt for permissions

## Testing Your Webcam

### Method 1: Use the Extension Command
1. Open VS Code Command Palette (`Cmd+Shift+P`)
2. Type "Coding Buddy: Test Webcam"
3. Click the command to test

### Method 2: Manual Test
Run this command in your terminal:
```bash
imagesnap -w 1 test.jpg
```

If successful, you should see a `test.jpg` file created.

## Troubleshooting

### Issue: "imagesnap: command not found"
**Solution**: Install imagesnap with `brew install imagesnap`

### Issue: "Camera permission denied"
**Solution**: 
1. Go to System Preferences → Security & Privacy → Camera
2. Enable VS Code
3. Restart VS Code

### Issue: "Webcam not accessible"
**Solutions**:
1. Make sure no other app is using the camera
2. Check if your camera is working in other applications
3. Try restarting your computer

### Issue: "File too small" or "File not created"
**Solutions**:
1. Check camera permissions
2. Make sure camera is not being used by another application
3. Try a different webcam device (if you have multiple cameras)

## Using the Extension

1. **Start a Session**: `Cmd+Shift+P` → "Coding Buddy: Start Coding Buddy Session"
2. **Enable Camera**: `Cmd+Shift+P` → "Coding Buddy: Toggle Camera"
3. **Test Webcam**: `Cmd+Shift+P` → "Coding Buddy: Test Webcam"

## Viewing Captured Frames

Frames are automatically saved when the webcam is active!

1. **Start a session and enable camera** (frames will be saved every 5 seconds automatically)
2. **Open Frame Directory**: `Cmd+Shift+P` → "Coding Buddy: Open Frame Directory"
3. **View the captured images** in the opened Finder window

**Note**: Frames are saved automatically when the camera is on. You'll get a notification when the first frame is captured.

## How It Works

- The extension captures frames from your webcam every 5 seconds
- Each frame is analyzed for facial expressions and emotions
- The bot provides motivational feedback based on detected emotions
- All captured images are stored temporarily and automatically deleted for privacy

## Privacy Notes

- All webcam images are stored in temporary directories
- Images are automatically deleted after analysis
- No images are sent to external servers
- Camera access can be toggled on/off at any time
