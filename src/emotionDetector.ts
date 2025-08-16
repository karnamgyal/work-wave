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
                const roboflowReady = await this.roboflowDetector.initialize();
                if (roboflowReady) {
                    console.log('✅ Roboflow emotion detection initialized!');
                } else {
                    console.log('⚠️ Roboflow initialization failed, will use fallback');
                    this.useRoboflow = false;
                }
            }

            // Initialize webcam
            await this.initializeWebcam();
            
            // Start emotion detection
            this.startRealDetection();
            
            vscode.window.showInformationMessage('📹 Camera activated! I\'m watching for your coding expressions... Frames will be saved automatically.');
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
                // Configure webcam options
                const options = {
                    width: 640,
                    height: 480,
                    quality: 100,
                    delay: 0,
                    saveShots: true,
                    output: 'jpeg',
                    device: false, // Use default device
                    callbackReturn: 'buffer'
                };

                this.webcam = NodeWebcam.create(options);
                resolve();
            } catch (error) {
                reject(new Error(`Webcam initialization failed: ${error}`));
            }
        });
    }

    private startRealDetection(): void {
        // Only capture and analyze when explicitly triggered
        // No automatic interval - frames are captured on-demand
        console.log('🎯 Emotion detection ready - will analyze frames when captured');
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

                try {
                    // Read the captured file as buffer (tempFilePath is already defined above)
                    const imageBuffer = fs.readFileSync(tempFilePath);
                    
                    // Clean up the temporary file immediately
                    fs.unlinkSync(tempFilePath);
                    
                    console.log(`📸 Frame captured as buffer: ${imageBuffer.length} bytes`);
                    
                    // Analyze the captured image buffer for emotions using data URL
                    const emotion = await this.analyzeImageBufferAsDataURL(imageBuffer);
                    
                    // Optionally save the frame if saveFrames is enabled
                    if (this.saveFrames) {
                        const filename = `frame_${this.frameCount++}_${Date.now()}.jpg`;
                        const filepath = path.join(this.webcamManager.getTempDir(), filename);
                        fs.writeFileSync(filepath, imageBuffer);
                        console.log(`📸 Frame saved: ${filepath}`);
                        
                        // Show notification for the first frame
                        if (this.frameCount === 1) {
                            vscode.window.showInformationMessage(`📸 First frame captured! Use "Coding Buddy: Open Frame Directory" to view frames.`);
                        }
                    }
                    
                    resolve(emotion);
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
                if (roboflowResult && roboflowResult.confidence > 0.3) {
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
                } else {
                    console.log('❌ Roboflow result not confident enough, using fallback');
                }
            } catch (error) {
                console.error('❌ Roboflow detection failed:', error);
            }
        }
        
        // No fallback - only use Roboflow for real emotion detection
        console.log('❌ Roboflow detection failed - no fallback emotions will be generated');
        throw new Error('Roboflow emotion detection failed - no mock emotions will be generated');
    }

    private async analyzeImageBufferForEmotion(imageBuffer: Buffer): Promise<EmotionResult> {
        console.log('🔍 Starting emotion analysis with Roboflow from buffer...');
        
        if (this.useRoboflow && this.roboflowDetector.isReady()) {
            console.log('🤖 Using Roboflow for emotion detection from buffer...');
            try {
                const roboflowResult = await this.roboflowDetector.detectEmotionFromBuffer(imageBuffer);
                if (roboflowResult && roboflowResult.confidence > 0.3) {
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
                } else {
                    console.log('❌ Roboflow result not confident enough');
                }
            } catch (error) {
                console.error('❌ Roboflow detection failed:', error);
            }
        }
        
        // No fallback - only use Roboflow for real emotion detection
        console.log('❌ Roboflow detection failed - no fallback emotions will be generated');
        throw new Error('Roboflow emotion detection failed - no mock emotions will be generated');
    }

    private async analyzeImageBufferAsDataURL(imageBuffer: Buffer): Promise<EmotionResult> {
        console.log('🔍 Starting emotion analysis with Roboflow from data URL...');
        
        if (this.useRoboflow && this.roboflowDetector.isReady()) {
            console.log('🤖 Using Roboflow for emotion detection from data URL...');
            try {
                // Convert buffer to data URL
                const dataURL = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;
                console.log(`🔗 Converted buffer to data URL: ${dataURL.length} characters`);
                
                const roboflowResult = await this.roboflowDetector.detectEmotionFromDataURL(dataURL);
                if (roboflowResult && roboflowResult.confidence > 0.3) {
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
                } else {
                    console.log('❌ Roboflow result not confident enough');
                }
            } catch (error) {
                console.error('❌ Roboflow detection failed:', error);
            }
        }
        
        // No fallback - only use Roboflow for real emotion detection
        console.log('❌ Roboflow detection failed - no fallback emotions will be generated');
        throw new Error('Roboflow emotion detection failed - no mock emotions will be generated');
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
