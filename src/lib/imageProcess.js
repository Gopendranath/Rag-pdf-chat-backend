// imageProcess.js
import { OpenAI } from "openai";
import fs from 'fs';
import path from "path";

const imageClient = new OpenAI({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: process.env.MISTRAL_API_URL,
});

const pathOfImages = path.join(`${process.cwd()}/uploads/images`);

// Helper function to encode image to base64
function encodeImage(imagePath) {
    try {
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');
        return base64Image;
    } catch (error) {
        console.error(`Error encoding image: ${error}`);
        return null;
    }
}

// Helper function to get available images from uploads directory
function getAvailableImages() {
    try {
        if (!fs.existsSync(pathOfImages)) {
            return [];
        }
        
        const imageFiles = fs.readdirSync(pathOfImages)
            .filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
            .map(file => path.join(pathOfImages, file));
            
        return imageFiles;
    } catch (error) {
        console.error(`Error reading images directory: ${error}`);
        return [];
    }
}

// Helper function to prepare messages with images
function prepareMessagesWithImages(messages) {
    const availableImages = getAvailableImages();
    
    if (availableImages.length === 0) {
        return messages;
    }

    // For Mistral API, we need to format the content differently
    const imageContents = availableImages.map(imagePath => {
        const base64Image = encodeImage(imagePath);
        return {
            type: "image_url",
            image_url: `data:image/jpeg;base64,${base64Image}`
        };
    }).filter(item => item.image_url !== null);

    return messages.map((message, index) => {
        // Only add images to the last user message
        if (message.role === 'user' && index === messages.length - 1) {
            return {
                ...message,
                content: [
                    { type: "text", text: message.content },
                    ...imageContents
                ]
            };
        }
        return message;
    });
}

export async function* imageProcessStream(messages) {
    try {
        const enhancedMessages = prepareMessagesWithImages(messages);
        
        console.log("Sending to Mistral API with images:", {
            messageCount: enhancedMessages.length,
            hasImages: enhancedMessages.some(msg => 
                Array.isArray(msg.content) && 
                msg.content.some(item => item.type === "image_url")
            )
        });

        const stream = await imageClient.chat.completions.create({
            model: "pixtral-12b-2409",
            messages: enhancedMessages,
            temperature: 0.7,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
                yield content;
            }
        }
    } catch (error) {
        console.error("Error in imageProcessStream:", error);
        throw new Error(`Image streaming processing failed: ${error.message}`);
    }
}

export async function imageProcess(messages) {
    try {
        const enhancedMessages = prepareMessagesWithImages(messages);
        
        console.log("Sending to Mistral API with images:", {
            messageCount: enhancedMessages.length,
            hasImages: enhancedMessages.some(msg => 
                Array.isArray(msg.content) && 
                msg.content.some(item => item.type === "image_url")
            )
        });

        const response = await imageClient.chat.completions.create({
            model: "pixtral-12b-2409",
            messages: enhancedMessages,
            temperature: 0.7,
        });

        return response.choices[0]?.message?.content || "No response generated";
    } catch (error) {
        console.error("Error in imageProcess - Full error details:", {
            status: error.status,
            message: error.message,
            code: error.code,
            type: error.type
        });
        
        // Check if it's an image format issue
        if (error.status === 400) {
            throw new Error(`Image processing failed: Invalid image format or size. Please ensure images are in supported formats (JPEG, PNG, GIF, WebP) and not too large.`);
        }
        
        throw new Error(`Image processing failed: ${error.message}`);
    }
}