// handleChat.js - Updated controller
import { organizeFilesByType, cleanupFiles } from '../utils/file.utils.js';
import { chatProcessStream, chatProcess } from '../lib/chatProcess.js';
import { documentProcessStream, documentProcess } from '../lib/documentProcess.js';

export const handleChat = async (req, res) => {
  // Initialize files cleanup array at the top
  let filesToCleanup = [];
  
  try {
    const { messages, stream = false, processDocuments = false } = req.body;
    const processedMessages = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];
    const organizedFiles = organizeFilesByType(req.files);

    const filesCount = organizedFiles.documents.length;
    const imagesCount = organizedFiles.images.length;
    const othersCount = organizedFiles.others.length;

    // Determine if we should process documents
    const shouldProcessDocuments = processDocuments || organizedFiles.documents.length > 0;

    // Collect files for cleanup
    if (req.files) {
      if (req.files.documents) filesToCleanup.push(...req.files.documents);
      if (req.files.files) filesToCleanup.push(...req.files.files);
      if (req.files.images) filesToCleanup.push(...req.files.images);
    }

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
        console.log("streaming starts");
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
          },
          processDocuments: shouldProcessDocuments
        })}\n\n`);

        if (shouldProcessDocuments) {
          const lastMessage = processedMessages[processedMessages.length - 1].content;
          let finalResponse = '';

          for await (const chunk of documentProcessStream(lastMessage)) {
            const data = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;
            
            // Accumulate final response chunks
            if (data.type === 'final_response_chunk') {
              finalResponse += data.content;
            }
            
            // Send the chunk to client
            res.write(`data: ${JSON.stringify({
              type: 'document_processing',
              ...data
            })}\n\n`);

            // Store the final response when available
            if (data.type === 'completion') {
              finalResponse = data.final_response || finalResponse;
            }
          }

          // Add the human-readable final response to messages
          processedMessages.push({
            role: 'assistant',
            content: finalResponse || 'Document processing completed.'
          });

          // Update fullResponse for the end event
          fullResponse = finalResponse;

        } else {
          // Use regular chat processing with streaming
          for await (const chunk of chatProcessStream(processedMessages)) {
            fullResponse += chunk;
            res.write(`data: ${JSON.stringify({
              type: 'chunk',
              content: chunk
            })}\n\n`);
          }

          // Add the complete assistant message to processed messages
          processedMessages.push({ role: 'assistant', content: fullResponse });
        }

        // Send completion message
        res.write(`data: ${JSON.stringify({
          type: 'end',
          fullResponse: fullResponse,
          messages: processedMessages,
          messageCount: processedMessages.length,
          processType: shouldProcessDocuments ? 'document_processing' : 'regular_chat'
        })}\n\n`);

        res.end();

        console.log("streaming ends");
        
        // Cleanup files after successful streaming
        if (filesToCleanup.length > 0) {
          cleanupFiles(filesToCleanup);
        }

      } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: 'Streaming failed',
          message: streamError.message
        })}\n\n`);
        res.end();
        
        // Cleanup files on streaming error
        if (filesToCleanup.length > 0) {
          cleanupFiles(filesToCleanup);
        }
      }

    } else {
      // Handle regular non-streaming response
      let response;

      if (shouldProcessDocuments) {
        const lastMessage = processedMessages[processedMessages.length - 1].content;
        response = await documentProcess(lastMessage);
      } else {
        response = await chatProcess(processedMessages);
      }

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
        },
        processType: shouldProcessDocuments ? 'document_processing' : 'regular_chat'
      };

      res.status(200).json(responseData);

      // Cleanup files after successful non-streaming response
      if (filesToCleanup.length > 0) {
        cleanupFiles(filesToCleanup);
      }
    }

  } catch (error) {
    console.error('Error in handleChat:', error);

    // Clean up any uploaded files in case of error
    if (filesToCleanup.length > 0) {
      cleanupFiles(filesToCleanup);
    }

    if (req.body && req.body.stream) {
      // Send error in streaming format
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
      }
      
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