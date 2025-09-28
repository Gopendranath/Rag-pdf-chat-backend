// api.controller.js - Updated controller
import { handleStreamingChat, handleNonStreamingChat } from './chatHandlers.js';
import Conversation from '../models/chat.model.js';

export const handleChat = async (req, res) => {
  const { stream = false } = req.body;

  if (stream) {
    await handleStreamingChat(req, res);
  } else {
    await handleNonStreamingChat(req, res);
  }
};


export const saveChatHistory = async (req, res) => {
  try {
    const { messages, conversationId } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Messages array is required and cannot be empty'
      });
    }

    let conversation;
    
    if (conversationId) {
      // Update existing conversation
      conversation = await Conversation.findOne({ conversationId });
      
      if (!conversation) {
        return res.status(404).json({
          success: false,
          error: 'Conversation not found',
          message: `No conversation found with ID: ${conversationId}`
        });
      }
      
      // Add new messages to the existing conversation
      conversation.messages = messages;
      conversation.updatedAt = new Date();
      
      await conversation.save();
    } else {
      // Create new conversation
      const newConversationId = `conv_${Date.now()}`;
      conversation = new Conversation({
        conversationId: newConversationId,
        messages,
        updatedAt: new Date()
      });
      
      await conversation.save();
    }
    
    res.status(200).json({
      success: true,
      message: 'Chat history saved successfully',
      conversationId: conversation.conversationId
    });
  } catch (error) {
    console.error('Error saving chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save chat history',
      message: error.message
    });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    // Find all conversations, sort by updatedAt descending, and project only needed fields
    const conversations = await Conversation.find()
      .sort({ updatedAt: -1 })
      .select('conversationId updatedAt lastMessage metadata');
    
    res.status(200).json({
      success: true,
      message: 'Chat history retrieved successfully',
      data: conversations
    });
  } catch (error) {
    console.error('Error retrieving chat history:', error);
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
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Chat ID is required'
      });
    }
    
    const deletedConversation = await Conversation.findOneAndDelete({ conversationId: chatId });
    
    if (!deletedConversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        message: `No conversation found with ID: ${chatId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: `Chat ${chatId} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting chat:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete chat',
      message: error.message
    });
  }
};


export const getChatbyID = async (req, res) => {
  try {
    const { chatId } = req.params;
    
    if (!chatId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        message: 'Chat ID is required'
      });
    }
    
    const conversation = await Conversation.findOne({ conversationId: chatId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        message: `No conversation found with ID: ${chatId}`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Chat history retrieved successfully',
      data: conversation
    });
  } catch (error) {
    console.error('Error retrieving chat history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve chat history',
      message: error.message
    });
  }
};