// chatProcess.js - Updated for streaming
import { OpenAI } from "openai";

export const client = new OpenAI({
    apiKey: process.env.GROQ_API_KEY,
    baseURL: process.env.GROQ_API_URL,
});

export async function* chatProcessStream(messages) {
    const stream = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages,
        stream: true, // Enable streaming
    });

    for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
            yield content;
        }
    }
}

// Keep the original function for non-streaming requests
export async function chatProcess(messages) {
    const response = await client.chat.completions.create({
        model: "openai/gpt-oss-120b",
        messages,
    });
    return response.choices[0].message.content;
}