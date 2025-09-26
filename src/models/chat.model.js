import mongoose from "mongoose";

const chatSchema = new mongoose.Schema({
    chatId: {
        type: String,
        required: true,
    },
    chatTopic: {
        type: String,
        required: true,
    },
    cconversation: [
        {
            role: {
                type: String,
                required: true,
            },
            content: {
                type: String,
                required: true,
            },
        },
    ],
    files: [
        {
            filename: {
                type: String,
            },
            url: {
                type: String,
            },
        },
    ],
});

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;