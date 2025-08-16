import * as vscode from 'vscode';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

export interface MultiModelEmotionResult {
    emotion: string;
    confidence: number;
    modelAgreement: number;
    modelVotes: { [emotion: string]: number };
    individualResults: ModelResult[];
}

interface ModelResult {
    modelName: string;
    emotion: string;
    confidence: number;
    modelId: string;
}

export class MultiModelEmotionDetector {
    private models: Array<{
        name: string;
        id: string;
        emotions: string[];
        weight: number;
    }> = [
        {
            name: 'Human Face Emotions (Current)',
            id: 'emotions-detection-x0xuc/3',
            emotions: ['happy', 'sad', 'angry', 'disgust', 'fear', 'surprise', 'neutral', 'content'],
            weight: 1.0
        },
        {
            name: 'Facial Emotion Recognition',
            id: 'uni-o612z/facial-emotion-recognition',
            emotions: ['angry', 'happy', 'sad'],
            weight: 0.8
        },
        {
            name: 'Emotion Detector',
            id: 'emotions/emotion-detector-ev1to',
            emotions: ['Happy', 'Neutral', 'Sad'],
            weight: 0.7
        },
        {
            name: 'Emotions Detection',
            id: 'emotion-zryzf/emotions-detection-x0xuc',
            emotions: ['angry', 'disgust', 'happy', 'neutral', 'sad', 'surprise'],
            weight: 0.9
        },
        {
            name: 'Emotion Detection YOLO',
            id: 'computer-vision-projects-zhogq/emotion-detection-y0svj',
            emotions: ['Angry', 'Fearful', 'Happy', 'Neutral', 'Sad'],
            weight: 0.8
        }
    ];

    private apiKey: string = 'NoMXRSSJhGJKdfEGXlaI';
    private isEnabled: boolean = true;

    constructor() {
        console.log('🎯 MultiModelEmotionDetector initialized with', this.models.length, 'models');
    }

    public async detectEmotion(imageBuffer: Buffer): Promise<MultiModelEmotionResult | null> {
        if (!this.isEnabled) {
            console.log('🎯 Multi-model detection disabled');
            return null;
        }

        console.log('🎯 Starting multi-model emotion detection...');
        
        const results: ModelResult[] = [];
        const promises = this.models.map(model => this.queryModel(model, imageBuffer));
        
        try {
            const modelResults = await Promise.allSettled(promises);
            
            modelResults.forEach((result, index) => {
                if (result.status === 'fulfilled' && result.value) {
                    results.push(result.value);
                    console.log(`✅ ${this.models[index].name}: ${result.value.emotion} (${Math.round(result.value.confidence * 100)}%)`);
                } else {
                    console.log(`❌ ${this.models[index].name}: Failed to get result`);
                }
            });

            if (results.length === 0) {
                console.log('❌ No models returned valid results');
                return null;
            }

            return this.combineResults(results);
        } catch (error) {
            console.error('❌ Error in multi-model detection:', error);
            return null;
        }
    }

    private async queryModel(model: any, imageBuffer: Buffer): Promise<ModelResult | null> {
        try {
            const formData = new FormData();
            formData.append('file', imageBuffer, {
                filename: 'frame.jpg',
                contentType: 'image/jpeg'
            });

            const response = await axios({
                method: "POST",
                url: `https://detect.roboflow.com/${model.id}?api_key=${this.apiKey}`,
                data: formData,
                headers: formData.getHeaders(),
                timeout: 10000
            });

            if (response.data && response.data.predictions && response.data.predictions.length > 0) {
                const bestPrediction = response.data.predictions.reduce((best: any, current: any) => {
                    return current.confidence > best.confidence ? current : best;
                });

                return {
                    modelName: model.name,
                    emotion: bestPrediction.class,
                    confidence: bestPrediction.confidence,
                    modelId: model.id
                };
            }
        } catch (error) {
            console.error(`❌ Error querying ${model.name}:`, error);
        }
        return null;
    }

    private combineResults(results: ModelResult[]): MultiModelEmotionResult {
        // Normalize emotion names to our standard format
        const normalizedResults = results.map(result => ({
            ...result,
            emotion: this.normalizeEmotion(result.emotion)
        }));

        // Count votes for each emotion
        const emotionVotes: { [emotion: string]: number } = {};
        const emotionConfidences: { [emotion: string]: number[] } = {};

        normalizedResults.forEach(result => {
            if (!emotionVotes[result.emotion]) {
                emotionVotes[result.emotion] = 0;
                emotionConfidences[result.emotion] = [];
            }
            emotionVotes[result.emotion]++;
            emotionConfidences[result.emotion].push(result.confidence);
        });

        // Find the emotion with the most votes
        const maxVotes = Math.max(...Object.values(emotionVotes));
        const winningEmotions = Object.keys(emotionVotes).filter(emotion => emotionVotes[emotion] === maxVotes);

        let finalEmotion: string;
        let finalConfidence: number;

        if (winningEmotions.length === 1) {
            // Clear winner
            finalEmotion = winningEmotions[0];
            finalConfidence = Math.max(...emotionConfidences[finalEmotion]);
        } else {
            // Tie - use highest confidence among tied emotions
            let bestConfidence = 0;
            finalEmotion = winningEmotions[0];
            
            winningEmotions.forEach(emotion => {
                const maxConf = Math.max(...emotionConfidences[emotion]);
                if (maxConf > bestConfidence) {
                    bestConfidence = maxConf;
                    finalEmotion = emotion;
                }
            });
            finalConfidence = bestConfidence;
        }

        // Calculate model agreement percentage
        const modelAgreement = (maxVotes / results.length) * 100;

        console.log(`🎯 Multi-model result: ${finalEmotion} (${Math.round(finalConfidence * 100)}% confidence, ${Math.round(modelAgreement)}% agreement)`);
        console.log(`🎯 Model votes:`, emotionVotes);

        return {
            emotion: finalEmotion,
            confidence: finalConfidence,
            modelAgreement: modelAgreement,
            modelVotes: emotionVotes,
            individualResults: normalizedResults
        };
    }

    private normalizeEmotion(emotion: string): string {
        const emotionMap: { [key: string]: string } = {
            'Happy': 'happy',
            'Sad': 'sad',
            'Angry': 'angry',
            'Fearful': 'fear',
            'Neutral': 'neutral',
            'Disgust': 'disgust',
            'Surprise': 'surprise',
            'Content': 'content'
        };
        return emotionMap[emotion] || emotion.toLowerCase();
    }

    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        console.log(`🎯 Multi-model detection ${enabled ? 'enabled' : 'disabled'}`);
    }

    public isDetectionEnabled(): boolean {
        return this.isEnabled;
    }

    public getModelCount(): number {
        return this.models.length;
    }

    public getModelInfo(): Array<{ name: string; emotions: string[] }> {
        return this.models.map(model => ({
            name: model.name,
            emotions: model.emotions
        }));
    }
}
