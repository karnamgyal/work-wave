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
            // Check if imagesnap is available (required for macOS)
            const { exec } = require('child_process');
            exec('which imagesnap', (error: any) => {
                if (error) {
                    vscode.window.showErrorMessage('❌ imagesnap not found. Please install it with: brew install imagesnap');
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }

    private async requestWebcamPermission(): Promise<void> {
        const result = await vscode.window.showWarningMessage(
            'Camera access is required for emotion detection. Please grant camera permissions in your system settings.',
            'Open System Preferences',
            'Cancel'
        );

        if (result === 'Open System Preferences') {
            // Open macOS System Preferences for camera permissions
            const { exec } = require('child_process');
            exec('open "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera"', (error: any) => {
                if (error) {
                    vscode.window.showErrorMessage('Could not open System Preferences. Please manually grant camera permissions.');
                }
            });
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
                quality: 100,
                delay: 0,
                saveShots: true,
                output: 'jpeg',
                device: false
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
