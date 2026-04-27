require('dotenv').config();
const { HfInference } = require('@huggingface/inference');
const fs = require('fs');
const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);

async function test() {
    try {
        console.log('Testing imageToImage with SDXL');
        // generate a quick dummy image or use an existing one
        const imgBlob = await hf.textToImage({ model: 'stabilityai/stable-diffusion-xl-base-1.0', inputs: 'a red circle' });
        console.log('Generated base image');
        
        const editedBlob = await hf.imageToImage({
            model: 'stabilityai/stable-diffusion-xl-base-1.0',
            inputs: imgBlob,
            parameters: { prompt: 'a blue square', strength: 0.8 }
        });
        console.log('Success!', editedBlob.type);
    } catch(e) {
        console.error('Error:', e.message);
    }
}
test();
