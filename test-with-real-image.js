const roboflow = require('roboflow');
const fs = require('fs');
const path = require('path');

async function testWithRealImage() {
    console.log('🔧 Testing Roboflow with your actual captured frame...');
    
    const modelId = 'human-face-emotions/28';
    const apiKey = process.env.ROBOFLOW_API_KEY;
    
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
        console.log('❌ Frame directory not found in any of these locations:');
        possiblePaths.forEach(p => console.log('  -', p));
        console.log('Please start the camera first to capture some frames.');
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
        
        // Use the first image file
        const testImagePath = path.join(actualTempDir, files[0]);
        console.log('🎯 Testing with image:', files[0]);
        console.log('📏 Image size:', fs.statSync(testImagePath).size, 'bytes');
        
        // Check if API key is available
        if (!apiKey) {
            console.log('❌ No Roboflow API key found!');
            console.log('Please set the ROBOFLOW_API_KEY environment variable:');
            console.log('export ROBOFLOW_API_KEY="your_api_key_here"');
            return;
        }
        
        // Test Roboflow with the real image
        console.log('🚀 Sending your image to Roboflow AI...');
        console.log('🤖 Model:', modelId);
        console.log('🔑 API Key:', apiKey ? 'Present' : 'None');
        
        const result = await roboflow.detectObject(testImagePath, modelId, apiKey);
        
        console.log('✅ Roboflow AI response received!');
        console.log('📊 Full response:', JSON.stringify(result, null, 2));
        
        // Check if any objects were detected
        if (result.predictions && result.predictions.length > 0) {
            console.log('🎯 AI Detection Results:');
            result.predictions.forEach((pred, index) => {
                console.log(`  ${index + 1}. Class: ${pred.class}`);
                console.log(`     Confidence: ${Math.round(pred.confidence * 100)}%`);
                console.log(`     Position: x=${pred.x}, y=${pred.y}, w=${pred.width}, h=${pred.height}`);
            });
        } else {
            console.log('❌ AI found no objects/faces in your image');
        }
        
    } catch (error) {
        console.error('❌ Error testing with real image:');
        console.error('Error message:', error.message);
        console.error('Full error:', error);
    }
}

testWithRealImage();
