import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class WebcamManager {
    private static instance: WebcamManager;
    private isInitialized: boolean = false;
    private permissionGranted: boolean = false;
    private tempDir: string = '';

    private constructor() {
        this.tempDir = path.join(os.tmpdir(), 'coding-buddy-webcam');
    }

    public static getInstance(): WebcamManager {
        if (!WebcamManager.instance) {
            WebcamManager.instance = new WebcamManager();
        }
        return WebcamManager.instance;
    }

    public async initialize(): Promise<boolean> {
        if (this.isInitialized) {
            return this.permissionGranted;
        }

        try {
            // Create temp directory
            if (!fs.existsSync(this.tempDir)) {
                fs.mkdirSync(this.tempDir, { recursive: true });
            }

            // Check if we can access the webcam
            const hasAccess = await this.checkWebcamAccess();
            
            if (hasAccess) {
                this.permissionGranted = true;
                this.isInitialized = true;
                vscode.window.showInformationMessage('✅ Webcam access granted! Ready to detect emotions.');
                return true;
            } else {
                await this.requestWebcamPermission();
                return false;
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to initialize webcam: ${error}`);
            return false;
        }
    }

    private async checkWebcamAccess(): Promise<boolean> {
        return new Promise((resolve) => {
            // Cross-platform webcam access check
            const os = require('os');
            const platform = os.platform();
            
            if (platform === 'darwin') {
                // macOS - check for imagesnap
                const { exec } = require('child_process');
                exec('which imagesnap', (error: any) => {
                    if (error) {
                        vscode.window.showErrorMessage('❌ imagesnap not found. Please install it with: brew install imagesnap');
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                });
            } else if (platform === 'win32') {
                // Windows - node-webcam should work without additional dependencies
                console.log('✅ Windows detected - using node-webcam for webcam access');
                resolve(true);
            } else {
                // Linux and other platforms - node-webcam should work
                console.log('✅ Cross-platform webcam access using node-webcam');
                resolve(true);
            }
        });
    }

    private async requestWebcamPermission(): Promise<void> {
        const os = require('os');
        const platform = os.platform();
        
        let settingsButton = 'Open Settings';
        if (platform === 'darwin') {
            settingsButton = 'Open System Preferences';
        }
        
        const result = await vscode.window.showWarningMessage(
            'Camera access is required for emotion detection. Please grant camera permissions in your system settings.',
            settingsButton,
            'Cancel'
        );

        if (result === settingsButton) {
            const { exec } = require('child_process');
            
            if (platform === 'darwin') {
                // macOS - open System Preferences
                exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera"', (error: any) => {
                    if (error) {
                        vscode.window.showErrorMessage('Could not open System Preferences. Please manually grant camera permissions.');
                    }
                });
            } else if (platform === 'win32') {
                // Windows - open Camera privacy settings
                exec('start ms-settings:privacy-webcam', (error: any) => {
                    if (error) {
                        vscode.window.showErrorMessage('Could not open Camera settings. Please manually grant camera permissions in Windows Settings > Privacy & Security > Camera.');
                    }
                });
            } else {
                // Linux and other platforms
                vscode.window.showInformationMessage('Please manually grant camera permissions in your system settings.');
            }
        }
    }

    public getTempDir(): string {
        return this.tempDir;
    }

    public isPermissionGranted(): boolean {
        return this.permissionGranted;
    }

    public async testWebcam(): Promise<boolean> {
        try {
            const NodeWebcam = require('node-webcam');
            const options = {
                width: 320,
                height: 240,
                quality: 70,  // Reduced for smaller file size
                delay: 0,
                saveShots: true,
                output: 'jpeg',
                device: false,
                skipScreenshots: true,
                verbose: false
            };

            const webcam = NodeWebcam.create(options);
            
            return new Promise((resolve) => {
                const testFile = path.join(this.tempDir, 'test.jpg');
                webcam.capture(testFile, (err: any, data: any) => {
                    if (err) {
                        console.error('Webcam test failed:', err);
                        resolve(false);
                    } else {
                        // Clean up test file
                        fs.unlink(testFile, () => {});
                        resolve(true);
                    }
                });
            });
        } catch (error) {
            console.error('Webcam test error:', error);
            return false;
        }
    }

    public cleanup(): void {
        // Clean up temp directory
        if (fs.existsSync(this.tempDir)) {
            fs.readdir(this.tempDir, (err, files) => {
                if (!err) {
                    files.forEach(file => {
                        fs.unlink(path.join(this.tempDir, file), () => {});
                    });
                }
            });
        }
    }
}
