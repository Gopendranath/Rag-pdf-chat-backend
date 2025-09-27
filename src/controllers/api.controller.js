// api.controller.js - Updated controller
import { handleStreamingChat, handleNonStreamingChat } from './chatHandlers.js';

export const handleChat = async (req, res) => {
  const { stream = false } = req.body;
  
  if (stream) {
    await handleStreamingChat(req, res);
  } else {
    await handleNonStreamingChat(req, res);
  }
};

export const getChatHistory = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Chat history endpoint',
      data: []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history',
      message: error.message
    });
  }
};

export const deleteChat = async (req, res) => {
  try {
    const { chatId } = req.params;

    res.status(200).json({
      success: true,
      message: `Chat ${chatId} deleted successfully`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat',
      message: error.message
    });
  }
};