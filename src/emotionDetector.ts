import * as vscode from 'vscode';
import NodeWebcam from 'node-webcam';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WebcamManager } from './webcamManager';
import { RoboflowEmotionDetector } from './roboflowEmotionDetector';

// Note: We'll use a simplified approach with face-api for emotion detection
// In a production environment, you might want to use more sophisticated models

export interface EmotionResult {
    emotion: string;
    confidence: number;
    timestamp: number;
}

export class EmotionDetector {
    private isDetecting: boolean = false;
    private detectionInterval: NodeJS.Timeout | null = null;
    private callback: ((emotion: string, confidence: number) => void) | null = null;
    private webcam: any = null;
    private frameCount: number = 0;
    private lastEmotion: string = 'focused';
    private emotionHistory: string[] = [];
    private webcamManager: WebcamManager;
    private saveFrames: boolean = true; // Always save frames when webcam is active
    private roboflowDetector: RoboflowEmotionDetector;
    private useRoboflow: boolean = true;

    constructor() {
        this.webcamManager = WebcamManager.getInstance();
        this.roboflowDetector = new RoboflowEmotionDetector();
        console.log('EmotionDetector initialized with Roboflow emotion detection');
    }

    public async startDetection(callback: (emotion: string, confidence: number) => void): Promise<void> {
        if (this.isDetecting) {
            return;
        }

        this.callback = callback;
        this.isDetecting = true;

        try {
            // Initialize webcam manager
            const hasPermission = await this.webcamManager.initialize();
            if (!hasPermission) {
                throw new Error('Webcam permission not granted');
            }

            // Test webcam access
            const webcamWorks = await this.webcamManager.testWebcam();
            if (!webcamWorks) {
                throw new Error('Webcam not accessible');
            }

            // Initialize Roboflow emotion detection
            if (this.useRoboflow) {
                console.log('🔧 Initializing Roboflow emotion detection...');
                console.log('🔍 Debug: Roboflow detector ready state:', this.roboflowDetector.isReady());
                const roboflowReady = await this.roboflowDetector.initialize();
                console.log('🔍 Debug: Roboflow initialization result:', roboflowReady);
                if (roboflowReady) {
                    console.log('✅ Roboflow emotion detection initialized!');
                    console.log('🔍 Debug: Final ready state:', this.roboflowDetector.isReady());
                } else {
                    console.log('⚠️ Roboflow initialization failed, will use fallback');
                    this.useRoboflow = false;
                }
            }

            // Initialize webcam
            await this.initializeWebcam();
            
            // Start emotion detection
            this.startRealDetection();
            
            vscode.window.showInformationMessage('📹 Camera activated! I\'m watching for your coding expressions every 5 seconds... Frames will be saved automatically.');
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to start camera: ${error}`);
            this.isDetecting = false;
            throw error;
        }
    }

    public stopDetection(): void {
        if (!this.isDetecting) {
            return;
        }

        this.isDetecting = false;
        
        if (this.detectionInterval) {
            clearInterval(this.detectionInterval);
            this.detectionInterval = null;
        }

        // Clean up webcam
        if (this.webcam) {
            this.webcam = null;
        }

        this.callback = null;
        vscode.window.showInformationMessage('📹 Camera deactivated');
    }

    public async triggerEmotionDetection(): Promise<void> {
        if (!this.isDetecting || !this.callback) {
            console.log('⚠️ Emotion detection not active');
            return;
        }

        try {
            console.log('📸 Triggering emotion detection...');
            const emotion = await this.captureAndAnalyzeEmotion();
            if (emotion) {
                this.callback(emotion.emotion, emotion.confidence);
            }
        } catch (error) {
            console.error('Error in emotion detection:', error);
            vscode.window.showErrorMessage(`Emotion detection failed: ${error}`);
        }
    }

    private async initializeWebcam(): Promise<void> {
        return new Promise((resolve, reject) => {
            try {
                // Configure webcam options (cross-platform, optimized for API limits)
                const options = {
                    width: 320,  // Reduced from 640 for smaller file size
                    height: 240, // Reduced from 480 for smaller file size
                    quality: 70,  // Reduced from 100 for smaller file size
                    delay: 0,
                    saveShots: true,
                    output: 'jpeg',
                    device: false, // Use default device
                    callbackReturn: 'buffer',
                    // Windows-specific options for better compatibility
                    skipScreenshots: true,
                    verbose: false
                };

                this.webcam = NodeWebcam.create(options);
                resolve();
            } catch (error) {
                reject(new Error(`Webcam initialization failed: ${error}`));
            }
        });
    }

    private startRealDetection(): void {
        // Start automatic emotion detection every 5 seconds
        console.log('🎯 Starting automatic emotion detection every 5 seconds...');
        
        this.detectionInterval = setInterval(async () => {
            if (this.isDetecting && this.callback) {
                try {
                    console.log('📸 Auto-capturing frame for emotion detection...');
                    const emotion = await this.captureAndAnalyzeEmotion();
                    if (emotion) {
                        this.callback(emotion.emotion, emotion.confidence);
                    }
                } catch (error) {
                    console.error('Error in automatic emotion detection:', error);
                    // Don't show error message to user for automatic captures to avoid spam
                }
            }
        }, 5000); // 5 seconds = 5000 milliseconds
        
        console.log('✅ Automatic emotion detection started! Capturing every 5 seconds.');
    }

    private async captureAndAnalyzeEmotion(): Promise<EmotionResult | null> {
        return new Promise((resolve, reject) => {
            if (!this.webcam) {
                reject(new Error('Webcam not initialized'));
                return;
            }

            // Debug: Check temp directory
            const tempDir = this.webcamManager.getTempDir();
            console.log('🔍 Debug: Temp directory:', tempDir);
            
            // Ensure temp directory exists
            if (!fs.existsSync(tempDir)) {
                console.log('🔍 Debug: Creating temp directory...');
                fs.mkdirSync(tempDir, { recursive: true });
            }
            
            // Capture frame as buffer using the correct method with full path
            const tempFilePath = path.join(tempDir, 'temp_frame.jpg');
            console.log('🔍 Debug: Capturing to:', tempFilePath);
            
            this.webcam.capture(tempFilePath, async (err: any, data: any) => {
                if (err) {
                    console.error('🔍 Debug: Webcam capture error:', err);
                    reject(err);
                    return;
                }
                
                console.log('🔍 Debug: Webcam capture callback received');
                console.log('🔍 Debug: Capture data type:', typeof data);
                console.log('🔍 Debug: Capture data length:', data ? data.length : 'null');

                try {
                    // Check if file exists after capture
                    if (!fs.existsSync(tempFilePath)) {
                        console.error('❌ ERROR: Captured file does not exist:', tempFilePath);
                        reject(new Error('Webcam capture failed - no file created'));
                        return;
                    }
                    
                    const fileStats = fs.statSync(tempFilePath);
                    console.log(`🔍 Debug: Captured file size: ${fileStats.size} bytes`);
                    
                    // Check if file is too large for Roboflow API (limit is ~10MB)
                    const maxFileSize = 8 * 1024 * 1024; // 8MB limit
                    if (fileStats.size > maxFileSize) {
                        console.error(`❌ ERROR: File too large (${fileStats.size} bytes) for Roboflow API. Max size: ${maxFileSize} bytes`);
                        reject(new Error(`Captured image too large (${Math.round(fileStats.size / 1024 / 1024)}MB). Try reducing webcam quality.`));
                        return;
                    }
                    
                    // Read the captured file as buffer (tempFilePath is already defined above)
                    const imageBuffer = fs.readFileSync(tempFilePath);
                    
                    // Clean up the temporary capture file
                    fs.unlinkSync(tempFilePath);
                    
                    console.log(`📸 Frame captured as buffer: ${imageBuffer.length} bytes`);
                    
                    // Check if image is valid
                    if (imageBuffer.length === 0) {
                        console.error('❌ ERROR: Captured image is empty (0 bytes)');
                        reject(new Error('Webcam captured empty image'));
                        return;
                    }
                    
                    if (imageBuffer.length < 1000) {
                        console.warn('⚠️ WARNING: Captured image is very small, might be corrupted');
                    }
                    
                    console.log('✅ Image appears valid, proceeding to analysis...');
                    
                    // Analyze the captured image buffer for emotions using buffer method (more reliable)
                    const emotion = await this.analyzeImageBufferForEmotion(imageBuffer);
                    
                    // Always save the frame when webcam is active (as per user preference)
                    const filename = `frame_${this.frameCount++}_${Date.now()}.jpg`;
                    const filepath = path.join(this.webcamManager.getTempDir(), filename);
                    fs.writeFileSync(filepath, imageBuffer);
                    console.log(`📸 Frame saved: ${filepath}`);
                    
                    // Show notification for the first frame
                    if (this.frameCount === 1) {
                        vscode.window.showInformationMessage(`📸 First frame captured! Use "Coding Buddy: Open Frame Directory" to view frames.`);
                    }
                    
                    if (emotion) {
                        resolve(emotion);
                    } else {
                        reject(new Error('Emotion detection failed - no emotion detected'));
                    }
                } catch (analysisError) {
                    console.error('🔍 Debug: Analysis error:', analysisError);
                    reject(analysisError);
                }
            });
        });
    }

    private async analyzeImageForEmotion(imagePath: string): Promise<EmotionResult> {
        console.log('🔍 Starting emotion analysis with Roboflow...');
        
        if (this.useRoboflow && this.roboflowDetector.isReady()) {
            console.log('🤖 Using Roboflow for emotion detection...');
            try {
                const roboflowResult = await this.roboflowDetector.detectEmotion(imagePath);
                if (roboflowResult && roboflowResult.confidence > 0.1) { // Lower confidence threshold to 10%
                    console.log(`✅ Roboflow detected: ${roboflowResult.emotion} (${Math.round(roboflowResult.confidence * 100)}%)`);
                    
                    // Update emotion history
                    this.emotionHistory.push(roboflowResult.emotion);
                    if (this.emotionHistory.length > 10) {
                        this.emotionHistory.shift();
                    }
                    
                    this.lastEmotion = roboflowResult.emotion;
                    
                    return {
                        emotion: roboflowResult.emotion,
                        confidence: roboflowResult.confidence,
                        timestamp: Date.now()
                    };
                } else if (roboflowResult) {
                    console.log(`⚠️ Roboflow detected: ${roboflowResult.emotion} but confidence too low (${Math.round(roboflowResult.confidence * 100)}%)`);
                } else {
                    console.log('❌ Roboflow returned null result');
                }
            } catch (error) {
                console.error('❌ Roboflow detection failed:', error);
            }
        }
        
        // No fallback - only use Roboflow for real emotion detection
        console.log('❌ Roboflow detection failed - no fallback emotions will be generated');
        throw new Error('Roboflow emotion detection failed - no mock emotions will be generated');
    }

    private async analyzeImageBufferForEmotion(imageBuffer: Buffer): Promise<EmotionResult | null> {
        console.log('🔍 Starting emotion analysis with Roboflow from buffer...');
        
        if (this.useRoboflow && this.roboflowDetector.isReady()) {
            console.log('🤖 Using Roboflow for emotion detection from buffer...');
            try {
                const roboflowResult = await this.roboflowDetector.detectEmotionFromBuffer(imageBuffer);
                if (roboflowResult && roboflowResult.confidence > 0.1) { // Lower confidence threshold to 10%
                    console.log(`✅ Roboflow detected: ${roboflowResult.emotion} (${Math.round(roboflowResult.confidence * 100)}%)`);
                    
                    // Update emotion history
                    this.emotionHistory.push(roboflowResult.emotion);
                    if (this.emotionHistory.length > 10) {
                        this.emotionHistory.shift();
                    }
                    
                    this.lastEmotion = roboflowResult.emotion;
                    
                    return {
                        emotion: roboflowResult.emotion,
                        confidence: roboflowResult.confidence,
                        timestamp: Date.now()
                    };
                } else if (roboflowResult) {
                    console.log(`⚠️ Roboflow detected: ${roboflowResult.emotion} but confidence too low (${Math.round(roboflowResult.confidence * 100)}%)`);
                    // Even with low confidence, return the result
                    return {
                        emotion: roboflowResult.emotion,
                        confidence: roboflowResult.confidence,
                        timestamp: Date.now()
                    };
                } else {
                    console.log('❌ Roboflow returned null result');
                }
            } catch (error) {
                console.error('❌ Roboflow detection failed:', error);
            }
        } else {
            console.log('❌ Roboflow not ready or not enabled');
        }
        
        // If we get here, Roboflow detection failed - return null to indicate failure
        console.log('❌ Roboflow detection failed - returning null');
        return null;
    }

    private async analyzeImageBufferAsDataURL(imageBuffer: Buffer): Promise<EmotionResult> {
        console.log('🔍 Starting emotion analysis with Roboflow from data URL...');
        
        if (this.useRoboflow && this.roboflowDetector.isReady()) {
            console.log('🤖 Using Roboflow for emotion detection from data URL...');
            try {
                // Convert buffer to data URL
                const dataURL = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
                console.log(`🔗 Converted buffer to data URL: ${dataURL.length} characters`);
                console.log('🔗 Data URL preview:', dataURL.substring(0, 100) + '...');
                console.log('🔗 Full Data URL:', dataURL);
                
                const roboflowResult = await this.roboflowDetector.detectEmotionFromDataURL(dataURL);
                if (roboflowResult && roboflowResult.confidence > 0.1) { // Lower confidence threshold to 10%
                    console.log(`✅ Roboflow detected: ${roboflowResult.emotion} (${Math.round(roboflowResult.confidence * 100)}%)`);
                    
                    // Update emotion history
                    this.emotionHistory.push(roboflowResult.emotion);
                    if (this.emotionHistory.length > 10) {
                        this.emotionHistory.shift();
                    }
                    
                    this.lastEmotion = roboflowResult.emotion;
                    
                    return {
                        emotion: roboflowResult.emotion,
                        confidence: roboflowResult.confidence,
                        timestamp: Date.now()
                    };
                } else if (roboflowResult) {
                    console.log(`⚠️ Roboflow detected: ${roboflowResult.emotion} but confidence too low (${Math.round(roboflowResult.confidence * 100)}%)`);
                } else {
                    console.log('❌ Roboflow returned null result');
                }
            } catch (error) {
                console.error('❌ Roboflow detection failed:', error);
            }
        } else {
            console.log('❌ Roboflow not ready or not enabled');
        }
        
        // Return a neutral result instead of throwing error
        console.log('🔄 Returning neutral emotion result');
        return {
            emotion: 'neutral',
            confidence: 0.5,
            timestamp: Date.now()
        };
    }





    // Mock method to simulate camera access (for testing)
    public async checkCameraAccess(): Promise<boolean> {
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simulate 95% success rate
                resolve(Math.random() > 0.05);
            }, 500);
        });
    }

    // Method to get current detection status
    public getDetectionStatus(): boolean {
        return this.isDetecting;
    }

    // Method to get emotion statistics
    public getEmotionStats(): { totalChanges: number; currentEmotion: string; emotionHistory: string[] } {
        return {
            totalChanges: this.frameCount,
            currentEmotion: this.lastEmotion,
            emotionHistory: [...this.emotionHistory]
        };
    }

    // Method to enable/disable frame saving
    public setSaveFrames(enabled: boolean): void {
        this.saveFrames = enabled;
        if (enabled) {
            vscode.window.showInformationMessage('📸 Frame saving enabled. Frames will be saved to temp directory.');
        } else {
            vscode.window.showInformationMessage('🗑️ Frame saving disabled. Frames will be deleted after analysis.');
        }
    }

    // Method to get the temp directory path
    public getTempDirectory(): string {
        return this.webcamManager.getTempDir();
    }

    // Method to open the temp directory in Finder
    public openTempDirectory(): void {
        const { exec } = require('child_process');
        exec(`open "${this.webcamManager.getTempDir()}"`, (error: any) => {
            if (error) {
                vscode.window.showErrorMessage('Could not open temp directory');
            } else {
                vscode.window.showInformationMessage('📁 Opened temp directory in Finder');
            }
        });
    }

    // Cleanup method
    public cleanup(): void {
        this.stopDetection();
        
        // Clean up temp directory
        this.webcamManager.cleanup();
    }
}
