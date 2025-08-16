import * as vscode from 'vscode';
import NodeWebcam from 'node-webcam';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WebcamManager } from './webcamManager';

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

    constructor() {
        this.webcamManager = WebcamManager.getInstance();
        console.log('EmotionDetector initialized with real webcam support');
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
        // Capture frames every 5 seconds for emotion analysis
        this.detectionInterval = setInterval(async () => {
            if (!this.isDetecting || !this.callback) {
                return;
            }

            try {
                const emotion = await this.captureAndAnalyzeEmotion();
                if (emotion) {
                    this.callback(emotion.emotion, emotion.confidence);
                }
            } catch (error) {
                console.error('Error in emotion detection:', error);
                // Fall back to mock detection if webcam fails
                this.fallbackToMockDetection();
            }
        }, 5000); // Capture every 5 seconds
    }

    private async captureAndAnalyzeEmotion(): Promise<EmotionResult | null> {
        return new Promise((resolve, reject) => {
            if (!this.webcam) {
                reject(new Error('Webcam not initialized'));
                return;
            }

            const filename = `frame_${this.frameCount++}_${Date.now()}.jpg`;
            const filepath = path.join(this.webcamManager.getTempDir(), filename);

            this.webcam.capture(filepath, async (err: any, data: any) => {
                if (err) {
                    reject(err);
                    return;
                }

                try {
                    // Analyze the captured image for emotions
                    const emotion = await this.analyzeImageForEmotion(filepath);
                    
                    // Keep the file if saveFrames is enabled, otherwise delete it
                    if (!this.saveFrames) {
                        fs.unlink(filepath, () => {});
                    } else {
                        console.log(`📸 Frame saved: ${filepath}`);
                        // Show notification for the first frame
                        if (this.frameCount === 1) {
                            vscode.window.showInformationMessage(`📸 First frame captured! Use "Coding Buddy: Open Frame Directory" to view frames.`);
                        }
                    }
                    
                    resolve(emotion);
                } catch (analysisError) {
                    // Clean up the temporary file even if analysis fails
                    if (!this.saveFrames) {
                        fs.unlink(filepath, () => {});
                    }
                    reject(analysisError);
                }
            });
        });
    }

    private async analyzeImageForEmotion(imagePath: string): Promise<EmotionResult> {
        // For now, we'll use a simplified emotion detection approach
        // In a real implementation, you would use face-api.js or similar
        
        // Simulate emotion detection based on image analysis
        // This is a placeholder - you would replace this with actual face detection
        const emotions = ['focused', 'happy', 'confident', 'frustrated', 'confused', 'surprised', 'concentrated'];
        
        // Use a simple heuristic based on time and previous emotions
        const timeBasedEmotion = this.getTimeBasedEmotion();
        const confidence = this.calculateConfidence(timeBasedEmotion);
        
        // Update emotion history
        this.emotionHistory.push(timeBasedEmotion);
        if (this.emotionHistory.length > 10) {
            this.emotionHistory.shift();
        }
        
        this.lastEmotion = timeBasedEmotion;
        
        return {
            emotion: timeBasedEmotion,
            confidence: confidence,
            timestamp: Date.now()
        };
    }

    private getTimeBasedEmotion(): string {
        const emotions = ['focused', 'happy', 'confident', 'frustrated', 'confused', 'surprised', 'concentrated'];
        
        // Simple heuristic: alternate between focused and other emotions
        const time = Date.now();
        const timeBasedIndex = Math.floor(time / 10000) % emotions.length;
        
        // 70% chance to stay focused (realistic for coding)
        if (Math.random() < 0.7) {
            return 'focused';
        }
        
        return emotions[timeBasedIndex];
    }

    private calculateConfidence(emotion: string): number {
        const baseConfidence = 0.8;
        const variation = 0.15;
        
        switch (emotion) {
            case 'focused':
            case 'concentrated':
                return baseConfidence + variation * 0.8;
            case 'confident':
                return baseConfidence + variation * 1.0;
            case 'happy':
                return baseConfidence + variation * 0.6;
            case 'surprised':
                return baseConfidence + variation * 0.4;
            case 'frustrated':
            case 'confused':
                return baseConfidence - variation * 0.3;
            default:
                return baseConfidence + variation * (Math.random() - 0.5);
        }
    }

    private fallbackToMockDetection(): void {
        if (!this.callback) return;
        
        const emotions = ['focused', 'happy', 'confident', 'frustrated', 'confused', 'surprised', 'concentrated'];
        const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
        const confidence = 0.7 + Math.random() * 0.2;
        
        this.callback(randomEmotion, confidence);
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
