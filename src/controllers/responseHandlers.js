// responseHandlers.js
import { chatProcessStream, chatProcess } from '../lib/chatProcess.js';
import { documentProcessStream, documentProcess } from '../lib/documentProcess.js';
import { imageProcessStream, imageProcess } from '../lib/imageProcess.js';
import { cleanupFiles } from '../utils/file.utils.js';

export const handleStreamingResponse = async (res, processedMessages, organizedFiles, shouldProcessDocuments, shouldProcessImages, filesToCleanup) => {
    let fullResponse = '';

    try {
        sendInitialMetadata(res, organizedFiles, shouldProcessDocuments, shouldProcessImages);

        if (shouldProcessDocuments) {
            fullResponse = await handleDocumentStreaming(res, processedMessages);
        } else if (shouldProcessImages) {
            fullResponse = await handleImageStreaming(res, processedMessages);
        } else {
            fullResponse = await handleChatStreaming(res, processedMessages);
        }

        sendCompletionMessage(res, fullResponse, processedMessages, shouldProcessDocuments, shouldProcessImages);
        res.end();

        console.log("streaming ends");
        cleanupFiles(filesToCleanup);

    } catch (streamError) {
        console.error('Streaming error:', streamError);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            error: 'Streaming failed',
            message: streamError.message
        })}\n\n`);
        res.end();
        cleanupFiles(filesToCleanup);
    }
};

export const handleRegularResponse = async (processedMessages, organizedFiles, shouldProcessDocuments, shouldProcessImages) => {
    let response;

    if (shouldProcessDocuments) {
        response = await documentProcess(processedMessages);
    } else if (shouldProcessImages) {
        response = await imageProcess(processedMessages);
    } else {
        response = await chatProcess(processedMessages);
    }

    processedMessages.push({ role: 'assistant', content: response });

    return {
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
        processType: shouldProcessDocuments ? 'document_processing'
            : shouldProcessImages ? 'image_processing'
            : 'chat_processing'
    };
};

const sendInitialMetadata = (res, organizedFiles, shouldProcessDocuments, shouldProcessImages) => {
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
        processDocuments: shouldProcessDocuments,
        processImages: shouldProcessImages
    })}\n\n`);
};

const handleDocumentStreaming = async (res, processedMessages) => {
    const lastMessage = processedMessages[processedMessages.length - 1].content;
    let finalResponse = '';

    for await (const chunk of documentProcessStream(lastMessage)) {
        const data = typeof chunk === 'string' ? JSON.parse(chunk) : chunk;

        if (data.type === 'final_response_chunk') {
            finalResponse += data.content;
        }

        res.write(`data: ${JSON.stringify({
            type: 'document_processing',
            ...data
        })}\n\n`);

        if (data.type === 'completion') {
            finalResponse = data.final_response || finalResponse;
        }
    }

    processedMessages.push({
        role: 'assistant',
        content: finalResponse || 'Document processing completed.'
    });

    return finalResponse;
};

const handleImageStreaming = async (res, processedMessages) => {
    let fullResponse = '';

    for await (const chunk of imageProcessStream(processedMessages)) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: chunk
        })}\n\n`);
    }

    processedMessages.push({ role: 'assistant', content: fullResponse });
    return fullResponse;
};

const handleChatStreaming = async (res, processedMessages) => {
    let fullResponse = '';

    for await (const chunk of chatProcessStream(processedMessages)) {
        fullResponse += chunk;
        res.write(`data: ${JSON.stringify({
            type: 'chunk',
            content: chunk
        })}\n\n`);
    }

    processedMessages.push({ role: 'assistant', content: fullResponse });
    return fullResponse;
};

const sendCompletionMessage = (res, fullResponse, processedMessages, shouldProcessDocuments, shouldProcessImages) => {
    res.write(`data: ${JSON.stringify({
        type: 'end',
        fullResponse: fullResponse,
        messages: processedMessages,
        messageCount: processedMessages.length,
        processType: shouldProcessDocuments ? 'document_processing'
            : shouldProcessImages ? 'image_processing'
                : 'regular_chat'
    })}\n\n`);
};