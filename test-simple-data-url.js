const axios = require('axios');
const FormData = require('form-data');

// Test Roboflow API with a simple valid test image using data URL
async function testSimpleDataURL() {
    console.log('🧪 Testing Roboflow API with simple test image using data URL...');
    
    const apiKey = 'NoMXRSSJhGJKdfEGXlaI';
    const modelId = 'emotions-detection-x0xuc/3';
    
    try {
        // Create a simple valid JPEG image (1x1 pixel)
        const testImageBuffer = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
            0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
            0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
            0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x00,
            0xFF, 0xD9
        ]);
        
        console.log(`📦 Created test image buffer: ${testImageBuffer.length} bytes`);
        
        // Convert to data URL
        const dataURL = `data:image/jpeg;base64,${testImageBuffer.toString('base64')}`;
        console.log(`🔗 Created data URL: ${dataURL.length} characters`);
        
        console.log('🚀 Sending to Roboflow API...');
        console.log('🔑 API Key:', apiKey ? 'Present' : 'Missing');
        console.log('🤖 Model ID:', modelId);
        
        // Convert data URL back to buffer and send to Roboflow
        const base64Data = dataURL.replace(/^data:image\/[a-z]+;base64,/, '');
        const convertedBuffer = Buffer.from(base64Data, 'base64');
        
        console.log(`🔄 Converted back to buffer: ${convertedBuffer.length} bytes`);
        
        const formData = new FormData();
        formData.append('file', convertedBuffer, {
            filename: 'test-image-dataurl.jpg',
            contentType: 'image/jpeg'
        });
        
        const response = await axios({
            method: "POST",
            url: `https://detect.roboflow.com/${modelId}?api_key=${apiKey}`,
            data: formData,
            headers: formData.getHeaders()
        });
        
        console.log('✅ Roboflow API response:');
        console.log(JSON.stringify(response.data, null, 2));
        
        if (response.data.predictions && response.data.predictions.length > 0) {
            console.log('\n🎭 Detected Emotions:');
            response.data.predictions.forEach((pred, index) => {
                console.log(`  ${index + 1}. ${pred.class} (${Math.round(pred.confidence * 100)}%)`);
            });
        } else {
            console.log('\n❌ No emotions detected in the test image (expected for 1x1 pixel)');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
    }
    
    console.log('\n🎯 Simple data URL test completed!');
}

// Run the test
testSimpleDataURL();
