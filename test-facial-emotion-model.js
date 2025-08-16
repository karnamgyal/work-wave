const roboflow = require('roboflow');
const fs = require('fs');
const path = require('path');

async function testFacialEmotionModel() {
    console.log('🔧 Testing Facial Emotion Recognition Model...');
    console.log('🤖 Model: uni-o612z/facial-emotion-recognition');
    console.log('📊 Detects: angry, happy, sad');
    
    // Use the specific model from Roboflow Universe
    const modelId = 'uni-o612z/facial-emotion-recognition';
    const apiKey = process.env.ROBOFLOW_API_KEY;
    
    if (!apiKey) {
        console.log('❌ No API key found! Please set ROBOFLOW_API_KEY');
        return;
    }
    
    console.log('🔑 Using API key:', apiKey.substring(0, 10) + '...');
    
    // Find the temp directory where frames are saved
    const tempDir = path.join(require('os').tmpdir(), 'coding-buddy-bot');
    console.log('📁 Looking for frames in:', tempDir);
    
    // Also check a few other possible locations
    const possiblePaths = [
        tempDir,
        path.join(require('os').tmpdir(), 'coding-buddy-webcam'),
        path.join(process.cwd(), 'temp'),
        path.join(process.cwd(), 'frames'),
        '/tmp/coding-buddy-bot',
        '/tmp/coding-buddy-webcam'
    ];
    
    let actualTempDir = null;
    for (const dir of possiblePaths) {
        if (fs.existsSync(dir)) {
            console.log('✅ Found frame directory:', dir);
            actualTempDir = dir;
            break;
        }
    }
    
    if (!actualTempDir) {
        console.log('❌ Frame directory not found. Please start the camera first.');
        return;
    }
    
    try {
        // Get all jpg files from the found directory
        const files = fs.readdirSync(actualTempDir).filter(f => f.endsWith('.jpg'));
        console.log(`📸 Found ${files.length} image files`);
        
        if (files.length === 0) {
            console.log('❌ No image files found. Please start the camera first.');
            return;
        }
        
        // Test with the first few images
        for (let i = 0; i < Math.min(3, files.length); i++) {
            const testImagePath = path.join(actualTempDir, files[i]);
            console.log(`\n🎯 Testing image ${i + 1}: ${files[i]}`);
            console.log('📏 Image size:', fs.statSync(testImagePath).size, 'bytes');
            
            try {
                console.log('🔑 Making API call to facial-emotion-recognition...');
                const result = await roboflow.detectObject(testImagePath, modelId, apiKey);
                console.log('✅ SUCCESS! Facial emotion detection worked!');
                console.log('📊 Full response:', JSON.stringify(result, null, 2));
                
                // Check if any emotions were detected
                if (result.predictions && result.predictions.length > 0) {
                    console.log('🎯 Emotion Detection Results:');
                    result.predictions.forEach((pred, index) => {
                        console.log(`  ${index + 1}. Emotion: ${pred.class}`);
                        console.log(`     Confidence: ${Math.round(pred.confidence * 100)}%`);
                        if (pred.x && pred.y) {
                            console.log(`     Position: x=${pred.x}, y=${pred.y}, w=${pred.width}, h=${pred.height}`);
                        }
                    });
                    
                    // Map Roboflow emotions to our emotion categories
                    const emotionMap = {
                        'happy': 'happy',
                        'sad': 'frustrated',
                        'angry': 'frustrated'
                    };
                    
                    const bestPrediction = result.predictions.reduce((best, current) => {
                        return current.confidence > best.confidence ? current : best;
                    });
                    
                    const mappedEmotion = emotionMap[bestPrediction.class] || 'focused';
                    console.log(`🎯 Mapped to extension emotion: ${mappedEmotion}`);
                    
                } else {
                    console.log('❌ No emotions detected in the image');
                }
                
            } catch (error) {
                console.log('❌ Failed:', error.message);
                if (error.response) {
                    console.log('   Status:', error.response.status);
                    console.log('   Status Text:', error.response.statusText);
                }
            }
        }
        
        console.log('\n🎉 Facial emotion recognition model test completed!');
        console.log('💡 If successful, you can use this model in your extension.');
        
    } catch (error) {
        console.error('❌ Error in test:', error.message);
    }
}

testFacialEmotionModel();
