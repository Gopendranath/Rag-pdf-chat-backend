import { OpenAI } from "openai";

export const Describeclient = new OpenAI({
    apiKey: process.env.MISTRAL_API_KEY,
    baseURL: process.env.MISTRAL_API_URL,
});

