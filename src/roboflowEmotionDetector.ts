import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import FormData from 'form-data';

export interface RoboflowEmotionResult {
    emotion: string;
    confidence: number;
    boundingBox?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
}

export class RoboflowEmotionDetector {
    private apiKey: string | null = null;
    private modelId: string = 'emotions-detection-x0xuc/3';
    private isInitialized: boolean = false;

    constructor() {
        // Use the working API key
        this.apiKey = 'NoMXRSSJhGJKdfEGXlaI';
        console.log('🔧 Using Roboflow with API key');
    }

    public async initialize(): Promise<boolean> {
        console.log('🔧 RoboflowDetector.initialize() called');
        
        try {
            console.log('🔧 Initializing Roboflow client...');
            this.isInitialized = true;
            console.log('✅ Roboflow client initialized successfully');
            vscode.window.showInformationMessage('✅ Roboflow emotion detection initialized!');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Roboflow client:', error);
            vscode.window.showErrorMessage('❌ Failed to initialize Roboflow client');
            return false;
        }
    }

    public async detectEmotion(imagePath: string): Promise<RoboflowEmotionResult | null> {
        if (!this.isInitialized) {
            throw new Error('Roboflow detector not initialized');
        }

        try {
            console.log('🔍 Starting Roboflow emotion detection...');
            console.log('📁 Image path:', imagePath);
            console.log('🔑 API Key:', this.apiKey ? 'Present' : 'Missing');
            console.log('🤖 Model ID:', this.modelId);
            
            // Check if image file exists
            if (!fs.existsSync(imagePath)) {
                console.error('❌ Image file does not exist:', imagePath);
                return null;
            }
            
            console.log('✅ Image file exists, making Roboflow API call...');
            
            console.log('📡 Making Roboflow API call with:');
            console.log('  - Model ID:', this.modelId);
            console.log('  - API Key:', this.apiKey ? 'Present' : 'None');
            console.log('  - Image size:', fs.statSync(imagePath).size, 'bytes');
            
            console.log('🚀 Sending image to Roboflow AI...');
            
            // Use the correct detect endpoint with file upload
            const formData = new FormData();
            formData.append('file', fs.createReadStream(imagePath));
            
            const response = await axios({
                method: "POST",
                url: `https://detect.roboflow.com/${this.modelId}?api_key=${this.apiKey || ''}`,
                data: formData,
                headers: formData.getHeaders()
            });
            
            console.log('✅ Roboflow AI response received!');
            console.log('📊 AI Response:', JSON.stringify(response.data, null, 2));
            
            return this.processRoboflowResult(response.data);

        } catch (error) {
            console.error('❌ Error detecting emotion with Roboflow:', error);
            console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    public async detectEmotionFromBuffer(imageBuffer: Buffer): Promise<RoboflowEmotionResult | null> {
        if (!this.isInitialized) {
            throw new Error('Roboflow detector not initialized');
        }

        try {
            console.log('🔍 Starting Roboflow emotion detection from buffer...');
            console.log('🔑 API Key:', this.apiKey ? 'Present' : 'Missing');
            console.log('🤖 Model ID:', this.modelId);
            console.log('📦 Buffer size:', imageBuffer.length, 'bytes');
            
            console.log('🚀 Sending image buffer to Roboflow AI...');
            
            // Use the correct detect endpoint with buffer upload
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: 'frame.jpg',
                contentType: 'image/jpeg'
            });
            
            const response = await axios({
                method: "POST",
                url: `https://detect.roboflow.com/${this.modelId}?api_key=${this.apiKey || ''}`,
                data: formData,
                headers: formData.getHeaders()
            });
            
            console.log('✅ Roboflow AI response received!');
            console.log('📊 AI Response:', JSON.stringify(response.data, null, 2));
            
            return this.processRoboflowResult(response.data);

        } catch (error) {
            console.error('❌ Error detecting emotion with Roboflow from buffer:', error);
            console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    public async detectEmotionFromDataURL(dataURL: string): Promise<RoboflowEmotionResult | null> {
        if (!this.isInitialized) {
            throw new Error('Roboflow detector not initialized');
        }

        try {
            console.log('🔍 Starting Roboflow emotion detection from data URL...');
            console.log('🔑 API Key:', this.apiKey ? 'Present' : 'Missing');
            console.log('🤖 Model ID:', this.modelId);
            console.log('🔗 Data URL length:', dataURL.length, 'characters');
            
            // Convert data URL to buffer
            const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            console.log('🚀 Sending image from data URL to Roboflow AI...');
            
            // Use the correct detect endpoint with buffer upload
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: 'frame.jpg',
                contentType: 'image/jpeg'
            });
            
            const response = await axios({
                method: "POST",
                url: `https://detect.roboflow.com/${this.modelId}?api_key=${this.apiKey || ''}`,
                data: formData,
                headers: formData.getHeaders()
            });
            
            console.log('✅ Roboflow AI response received!');
            console.log('📊 AI Response:', JSON.stringify(response.data, null, 2));
            
            return this.processRoboflowResult(response.data);

        } catch (error) {
            console.error('❌ Error detecting emotion with Roboflow from data URL:', error);
            console.error('❌ Error details:', error instanceof Error ? error.message : String(error));
            return null;
        }
    }

    private processRoboflowResult(roboflowResult: any): RoboflowEmotionResult | null {
        try {
            // Roboflow returns predictions in this format:
            // {
            //   "predictions": [
            //     {
            //       "x": 100,
            //       "y": 100,
            //       "width": 50,
            //       "height": 50,
            //       "confidence": 0.95,
            //       "class": "happy"
            //     }
            //   ]
            // }

            if (!roboflowResult.predictions || roboflowResult.predictions.length === 0) {
                console.log('❌ AI found no objects/faces in the image');
                console.log('📊 Full AI response:', JSON.stringify(roboflowResult, null, 2));
                return null;
            }

            // Get the prediction with highest confidence
            const bestPrediction = roboflowResult.predictions.reduce((best: any, current: any) => {
                return current.confidence > best.confidence ? current : best;
            });

            // Map Roboflow emotions to our emotion categories
            const emotionMap: { [key: string]: string } = {
                'happy': 'happy',
                'sad': 'frustrated',
                'angry': 'frustrated',
                'disgust': 'frustrated',
                'fear': 'confused',
                'surprise': 'surprised',
                'neutral': 'focused',
                'content': 'focused'
            };

            console.log('🎯 AI Detection Results:');
            console.log('  - Detected class:', bestPrediction.class);
            console.log('  - Confidence:', Math.round(bestPrediction.confidence * 100) + '%');
            console.log('  - Bounding box:', bestPrediction.x, bestPrediction.y, bestPrediction.width, bestPrediction.height);
            
            const mappedEmotion = emotionMap[bestPrediction.class] || 'No AI detection';
            console.log('  - Mapped emotion:', mappedEmotion);

            return {
                emotion: mappedEmotion,
                confidence: bestPrediction.confidence,
                boundingBox: {
                    x: bestPrediction.x,
                    y: bestPrediction.y,
                    width: bestPrediction.width,
                    height: bestPrediction.height
                }
            };

        } catch (error) {
            console.error('Error processing Roboflow result:', error);
            return null;
        }
    }

    public isReady(): boolean {
        return this.isInitialized;
    }

    public hasApiKey(): boolean {
        return this.apiKey !== null;
    }

    public getSupportedEmotions(): string[] {
        return ['happy', 'focused', 'frustrated', 'confused', 'surprised'];
    }
}
