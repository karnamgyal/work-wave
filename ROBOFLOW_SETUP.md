# Roboflow Emotion Detection Setup

## Overview

This extension now integrates with the [Roboflow Human Face Emotions model](https://universe.roboflow.com/emotions-dectection/human-face-emotions) for real emotion detection instead of simulated emotions.

## Setup Steps

### 1. Get a Roboflow API Key

1. Go to [Roboflow](https://roboflow.com) and create an account
2. Navigate to your **Account Settings** → **API Keys**
3. Click **"Generate New API Key"**
4. Copy the generated API key (it will look like: `xxxxxxxxxxxxxxxxxxxxxxxx`)
5. **Important**: This is your personal API key, not a public one

### 2. Set Environment Variable

Set the API key as an environment variable:

```bash
export ROBOFLOW_API_KEY="your_api_key_here"
```

Or add it to your shell profile (~/.zshrc, ~/.bash_profile, etc.):
```bash
echo 'export ROBOFLOW_API_KEY="your_api_key_here"' >> ~/.zshrc
source ~/.zshrc
```

**Security Note**: 
- Keep your API key private and don't share it
- The API key is used to authenticate your requests to Roboflow
- Each API call counts toward your Roboflow usage quota

### 3. Test the Integration

1. Start a coding session
2. Toggle camera on
3. The extension will automatically try to use Roboflow
4. If successful, you'll see "✅ Roboflow emotion detection initialized!"

## How It Works

### Emotion Mapping

The Roboflow model detects these emotions and maps them to our categories:

| Roboflow Emotion | Extension Emotion | Description |
|------------------|-------------------|-------------|
| `happy` | `happy` | You're smiling and enjoying coding |
| `sad` | `frustrated` | You look down or frustrated |
| `angry` | `frustrated` | You look angry or annoyed |
| `disgust` | `frustrated` | You look disgusted or frustrated |
| `fear` | `confused` | You look scared or confused |
| `surprise` | `surprised` | You look surprised or shocked |
| `neutral` | `focused` | You look neutral/focused |
| `content` | `focused` | You look content/focused |

### Fallback System

- **Primary**: Roboflow AI emotion detection
- **Fallback**: Mock detection (if Roboflow fails or API key missing)
- **Toggle**: Use "Coding Buddy: Toggle Roboflow Emotion Detection" to switch

## Commands

- **Toggle Roboflow**: `Cmd+Shift+P` → "Coding Buddy: Toggle Roboflow Emotion Detection"
- **Test Webcam**: `Cmd+Shift+P` → "Coding Buddy: Test Webcam"
- **Open Frame Directory**: `Cmd+Shift+P` → "Coding Buddy: Open Frame Directory"

## Troubleshooting

### Issue: "Roboflow API key not found"
**Solution**: Set the `ROBOFLOW_API_KEY` environment variable

### Issue: "Roboflow not available, falling back to mock detection"
**Solutions**:
1. Check your internet connection
2. Verify your API key is correct
3. Check Roboflow service status

### Issue: Low confidence detections
**Solutions**:
1. Ensure good lighting
2. Face the camera directly
3. Make sure your face is clearly visible

## Privacy & Data

- **Local Processing**: Images are processed locally before sending to Roboflow
- **Temporary Storage**: Images are stored temporarily and automatically deleted
- **No Persistent Storage**: No images are permanently stored
- **API Usage**: Each emotion detection uses one API call to Roboflow
- **API Key**: Your personal API key is used for authentication (keep it secure)

## Model Information

- **Source**: [Roboflow Human Face Emotions](https://universe.roboflow.com/emotions-dectection/human-face-emotions)
- **Model Type**: YOLO-based object detection
- **Classes**: 8 emotion categories
- **Dataset**: 9.4k images
- **License**: CC BY 4.0

## Performance

- **Detection Frequency**: Every 5 seconds
- **API Response Time**: ~1-3 seconds
- **Confidence Threshold**: 0.5 (50%)
- **Fallback**: Automatic if confidence is too low
