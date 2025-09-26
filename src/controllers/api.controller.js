// handleChat.js - Updated controller
import { organizeFilesByType, cleanupFiles } from '../utils/file.utils.js';
import { chatProcessStream, chatProcess } from '../lib/chatProcess.js';

export const handleChat = async (req, res) => {
  try {
    const { messages, stream = false } = req.body; // Add stream parameter
    const processedMessages = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];
    const organizedFiles = organizeFilesByType(req.files);

    const filesCount = organizedFiles.documents.length
    const imagesCount = organizedFiles.images.length
    const othersCount = organizedFiles.others.length
    console.log(`filesCount: ${filesCount}, imagesCount: ${imagesCount}, othersCount: ${othersCount}`);

    if (stream) {
      // Handle streaming response
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

      let fullResponse = '';

      try {
        // Send initial metadata
        console.log("streaming starts")
        res.write(`data: ${JSON.stringify({
          type: 'start',
          timestamp: new Date().toISOString(),
          files: {
            images: organizedFiles.images,
            documents: organizedFiles.documents,
            others: organizedFiles.others
          },
          fileCounts: {
            total: organizedFiles.images.length + organizedFiles.documents.length + organizedFiles.others.length,
            images: organizedFiles.images.length,
            documents: organizedFiles.documents.length,
            others: organizedFiles.others.length
          }
        })}\n\n`);

        // Stream the chat response
        for await (const chunk of chatProcessStream(processedMessages)) {
          fullResponse += chunk;
          res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: chunk
          })}\n\n`);
        }

        // Add the complete assistant message to processed messages
        processedMessages.push({ role: 'assistant', content: fullResponse });

        // Send completion message
        res.write(`data: ${JSON.stringify({
          type: 'end',
          fullResponse,
          messages: processedMessages,
          messageCount: processedMessages.length
        })}\n\n`);

        res.end();

      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'Streaming failed',
          message: streamError.message
        })}\n\n`);
        res.end();
      }

    } else {
      // Handle regular non-streaming response (existing logic)
      const response = await chatProcess(processedMessages);
      processedMessages.push({ role: 'assistant', content: response });

      const responseData = {
        success: true,
        message: 'Chat request processed successfully',
        timestamp: new Date().toISOString(),
        messages: processedMessages,
        messageCount: processedMessages.length,
        files: {
          images: organizedFiles.images,
          documents: organizedFiles.documents,
          others: organizedFiles.others
        },
        fileCounts: {
          total: organizedFiles.images.length + organizedFiles.documents.length + organizedFiles.others.length,
          images: organizedFiles.images.length,
          documents: organizedFiles.documents.length,
          others: organizedFiles.others.length
        }
      };

      res.status(200).json(responseData);
    }

  } catch (error) {
    console.error('Error in handleChat:', error);

    // Clean up any uploaded files in case of error
    if (req.files) {
      const allFiles = [];
      if (req.files.images) allFiles.push(...req.files.images);
      if (req.files.documents) allFiles.push(...req.files.documents);
      if (req.files.files) allFiles.push(...req.files.files);
      cleanupFiles(allFiles);
    }

    if (req.body.stream) {
      // Send error in streaming format
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: 'Failed to process chat request',
        message: error.message
      })}\n\n`);
      res.end();
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to process chat request',
        message: error.message
      });
    }
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

    // This is a placeholder for chat deletion functionality
    // You can implement database deletion later
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
