// chatHandlers.js
import { organizeFilesByType, cleanupFiles } from '../utils/file.utils.js';
import { chatProcessStream, chatProcess } from '../lib/chatProcess.js';
import { documentProcessStream, documentProcess } from '../lib/documentProcess.js';
import { handleStreamingResponse, handleRegularResponse } from './responseHandlers.js';

export const handleStreamingChat = async (req, res) => {
  let filesToCleanup = [];
  
  try {
    const { messages, processDocuments = false, processImages = false } = req.body;
    const { processedMessages, organizedFiles, shouldProcessDocuments, shouldProcessImages } = prepareRequestData(messages, req.files, processDocuments, processImages);
    filesToCleanup = collectFilesForCleanup(req.files);
    // console.log(req.body)

    // Check if both document and image files are provided
    if (organizedFiles.documents.length > 0 && organizedFiles.images.length > 0) {
      throw new Error('Please provide only one type of file at a time. Either documents OR images, not both.');
    }

    setupStreamingHeaders(res);
    
    await handleStreamingResponse(res, processedMessages, organizedFiles, shouldProcessDocuments, shouldProcessImages, filesToCleanup);

  } catch (error) {
    handleError(error, res, filesToCleanup, true);
  }
};

export const handleNonStreamingChat = async (req, res) => {
  let filesToCleanup = [];
  
  try {
    const { messages, processDocuments = false, processImages = false } = req.body;
    const { processedMessages, organizedFiles, shouldProcessDocuments, shouldProcessImages } = prepareRequestData(messages, req.files, processDocuments, processImages);
    filesToCleanup = collectFilesForCleanup(req.files);

    // Check if both document and image files are provided
    if (organizedFiles.documents.length > 0 && organizedFiles.images.length > 0) {
      throw new Error('Please provide only one type of file at a time. Either documents OR images, not both.');
    }

    const responseData = await handleRegularResponse(processedMessages, organizedFiles, shouldProcessDocuments, shouldProcessImages);
    res.status(200).json(responseData);

    cleanupFiles(filesToCleanup);

  } catch (error) {
    handleError(error, res, filesToCleanup, false);
  }
};

const prepareRequestData = (messages, files, processDocuments, processImages) => {
  const processedMessages = Array.isArray(messages) ? messages : [{ role: 'user', content: messages }];
  const organizedFiles = organizeFilesByType(files);
  
  // Determine processing type based on files present or explicit flags
  const hasDocuments = organizedFiles.documents.length > 0;
  const hasImages = organizedFiles.images.length > 0;
  
  const shouldProcessDocuments = processDocuments || hasDocuments;
  const shouldProcessImages = processImages || hasImages;

  return { processedMessages, organizedFiles, shouldProcessDocuments, shouldProcessImages };
};

const collectFilesForCleanup = (files) => {
  const filesToCleanup = [];
  if (files) {
    if (files.documents) filesToCleanup.push(...files.documents);
    if (files.files) filesToCleanup.push(...files.files);
    if (files.images) filesToCleanup.push(...files.images);
  }
  return filesToCleanup;
};

const setupStreamingHeaders = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
};

const handleError = (error, res, filesToCleanup, isStreaming) => {
  console.error('Error in chat handler:', error.message);

  if (filesToCleanup.length > 0) {
    cleanupFiles(filesToCleanup);
  }

  if (isStreaming) {
    if (!res.headersSent) {
      setupStreamingHeaders(res);
    }
    
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: 'Failed to process chat request',
      message: error.message
    })}\n\n`);
    res.end();
  } else {
    res.status(400).json({
      success: false,
      error: 'Failed to process chat request',
      message: error.message
    });
  }
};