const axios = require('axios');
const FormData = require('form-data');

async function testRoboflowURL() {
    console.log('🔧 Testing Roboflow API with Sample Image URL...');
    
    const apiKey = 'NoMXRSSJhGJKdfEGXlaI';
    const modelId = 'emotions-detection-x0xuc/3';
    const imageURL = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face';
    
    console.log('🤖 Model:', modelId);
    console.log('🔑 Using API key:', apiKey.substring(0, 10) + '...');
    console.log('🚀 Making API call with image URL...');
    console.log('📡 URL:', `https://detect.roboflow.com/${modelId}`);
    console.log('🖼️ Image URL:', imageURL);
    
    try {
        // Download image from URL
        const imageResponse = await axios({
            method: 'GET',
            url: imageURL,
            responseType: 'arraybuffer'
        });
        
        const imageBuffer = Buffer.from(imageResponse.data);
        console.log(`📦 Downloaded image: ${imageBuffer.length} bytes`);
        
        // Send to Roboflow
        const formData = new FormData();
        formData.append('file', imageBuffer, {
            filename: 'test-image.jpg',
            contentType: 'image/jpeg'
        });
        
        const response = await axios({
            method: "POST",
            url: `https://detect.roboflow.com/${modelId}?api_key=${apiKey}`,
            data: formData,
            headers: formData.getHeaders()
        });
        
        console.log('✅ SUCCESS! Roboflow API call worked!');
        console.log('📊 Full response:', JSON.stringify(response.data, null, 2));
        
        // Display results in clean format
        console.log('🎯 Emotion Detection Results:');
        if (response.data.predictions && response.data.predictions.length > 0) {
            response.data.predictions.forEach((pred, index) => {
                console.log(`  ${index + 1}. Emotion: ${pred.class}`);
                console.log(`     Confidence: ${Math.round(pred.confidence * 100)}%`);
                console.log(`     Position: x=${pred.x}, y=${pred.y}, w=${pred.width}, h=${pred.height}`);
            });
        } else {
            console.log('  No emotions detected');
        }
        
    } catch (error) {
        console.error('❌ FAILED! Error:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
}

testRoboflowURL();
