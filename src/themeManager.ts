import * as vscode from 'vscode';

export interface ThemeMapping {
    emotion: string;
    theme: string;
    description: string;
    icon: string;
}

export class ThemeManager {
    private static instance: ThemeManager;
    private currentTheme: string = '';
    private lastEmotion: string = '';
    private themeChangeCooldown: number = 5000; // 5 seconds cooldown for demo
    private lastThemeChange: number = 0;
    private isEnabled: boolean = true;

    // Emotion to theme mappings
    private themeMappings: ThemeMapping[] = [
        {
            emotion: 'frustrated',
            theme: 'Default Dark+',
            description: 'Calming dark theme for when you\'re feeling frustrated',
            icon: '😤'
        },
        {
            emotion: 'confused',
            theme: 'Light+ (default light)',
            description: 'Bright, clear theme to help clear your mind',
            icon: '🤔'
        },
        {
            emotion: 'happy',
            theme: 'Abyss',
            description: 'Deep dark theme for when you\'re feeling great',
            icon: '😊'
        },
        {
            emotion: 'focused',
            theme: 'High Contrast',
            description: 'Maximum contrast theme for deep focus',
            icon: '🎯'
        },
        {
            emotion: 'surprised',
            theme: 'Light (Visual Studio)',
            description: 'BRIGHT WHITE EXPLOSION! Super bright theme for surprise!',
            icon: '😲'
        },
        {
            emotion: 'sad',
            theme: 'Abyss',
            description: 'Deepest dark theme for sad mood',
            icon: '😢'
        },
        {
            emotion: 'disgusted',
            theme: 'High Contrast',
            description: 'Maximum contrast theme for disgust',
            icon: '🤢'
        },
        {
            emotion: 'content',
            theme: 'Light+ (default light)',
            description: 'Bright theme for content mood',
            icon: '😌'
        }
    ];

    private constructor() {
        // Get current theme
        this.currentTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme') as string;
        console.log('🎨 ThemeManager initialized with current theme:', this.currentTheme);
    }

    public static getInstance(): ThemeManager {
        if (!ThemeManager.instance) {
            ThemeManager.instance = new ThemeManager();
        }
        return ThemeManager.instance;
    }

    public async handleEmotionChange(emotion: string, confidence: number): Promise<void> {
        console.log(`🎨 ThemeManager: Emotion "${emotion}" detected with ${Math.round(confidence * 100)}% confidence`);
        
        if (!this.isEnabled) {
            console.log('🎨 ThemeManager: Theme switching is disabled');
            return;
        }
        
        if (confidence < 0.4) {
            console.log('🎨 ThemeManager: Confidence too low for theme change');
            return; // Only change themes for high confidence detections
        }

        // Check cooldown to prevent rapid theme changes
        const now = Date.now();
        if (now - this.lastThemeChange < this.themeChangeCooldown) {
            const remainingCooldown = Math.ceil((this.themeChangeCooldown - (now - this.lastThemeChange)) / 1000);
            console.log(`🎨 ThemeManager: Cooldown active, ${remainingCooldown}s remaining`);
            return;
        }

        // Don't change theme if emotion hasn't changed
        if (this.lastEmotion === emotion) {
            console.log(`🎨 ThemeManager: Emotion "${emotion}" hasn't changed, skipping theme change`);
            return;
        }

        const themeMapping = this.themeMappings.find(mapping => mapping.emotion === emotion);
        if (!themeMapping) {
            return; // No theme mapping for this emotion
        }

        // Check if the theme is already active
        const currentTheme = vscode.workspace.getConfiguration('workbench').get('colorTheme') as string;
        if (currentTheme === themeMapping.theme) {
            return; // Theme is already active
        }

        try {
            // Change the theme
            await vscode.workspace.getConfiguration('workbench').update('colorTheme', themeMapping.theme, vscode.ConfigurationTarget.Global);
            
            this.currentTheme = themeMapping.theme;
            this.lastEmotion = emotion;
            this.lastThemeChange = now;

            // Theme changed silently (no notification)

            console.log(`🎨 Theme changed to "${themeMapping.theme}" for emotion: ${emotion}`);
        } catch (error) {
            console.error('❌ Failed to change theme:', error);
            vscode.window.showErrorMessage(`Failed to switch theme: ${error}`);
        }
    }

    public getCurrentTheme(): string {
        return this.currentTheme;
    }

    public getLastEmotion(): string {
        return this.lastEmotion;
    }

    public setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
        if (enabled) {
            vscode.window.showInformationMessage('🎨 Mood-based theme switching enabled');
        } else {
            vscode.window.showInformationMessage('🎨 Mood-based theme switching disabled');
        }
    }

    public isThemeSwitchingEnabled(): boolean {
        return this.isEnabled;
    }

    public getThemeMappings(): ThemeMapping[] {
        return [...this.themeMappings];
    }

    public async resetToDefaultTheme(): Promise<void> {
        try {
            await vscode.workspace.getConfiguration('workbench').update('colorTheme', 'Default Dark+', vscode.ConfigurationTarget.Global);
            this.currentTheme = 'Default Dark+';
            this.lastEmotion = '';
            vscode.window.showInformationMessage('🎨 Theme reset to default');
        } catch (error) {
            console.error('❌ Failed to reset theme:', error);
        }
    }

    public async previewTheme(emotion: string): Promise<void> {
        const themeMapping = this.themeMappings.find(mapping => mapping.emotion === emotion);
        if (!themeMapping) {
            vscode.window.showWarningMessage(`No theme mapping found for emotion: ${emotion}`);
            return;
        }

        try {
            await vscode.workspace.getConfiguration('workbench').update('colorTheme', themeMapping.theme, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `🎨 Preview: "${themeMapping.theme}" - ${themeMapping.description}`
            );
        } catch (error) {
            console.error('❌ Failed to preview theme:', error);
        }
    }
}
