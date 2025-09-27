// documentProcess.js - Final version with unified JSON format
import systemPrompt from "./systemPrompt.js";
import { functionMap } from "./RAGtools.js";
import { client } from "./chatProcess.js";

// Helper function to extract and validate JSON
function extractJSON(text) {
    try {
        // Try to find JSON object in the response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error('No JSON object found in response');
        }
        
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate required structure
        if (!parsed.type || !parsed.response) {
            throw new Error('Missing type or response field');
        }
        
        if (parsed.type !== 'functionCall' && parsed.type !== 'finalResponse') {
            throw new Error(`Invalid type: ${parsed.type}. Must be 'functionCall' or 'finalResponse'`);
        }
        
        return parsed;
    } catch (error) {
        throw new Error(`JSON parsing failed: ${error.message}`);
    }
}

export async function* documentProcessStream(query) {
    // Initialize context with the user's query inserted into the prompt
    const promptWithQuery = {
        ...systemPrompt,
        content: systemPrompt.content.replace('"{query}"', `"${query}"`)
    };
    
    let context = [promptWithQuery];
    let done = false;
    let steps = 0;
    const maxSteps = 10;
    let accumulatedData = "";

    yield JSON.stringify({
        type: 'status',
        message: 'Starting document processing...',
        step: 'initializing',
        query: query
    });

    while (!done && steps < maxSteps) {
        steps++;
        
        yield JSON.stringify({
            type: 'status',
            message: `Processing step ${steps}`,
            step: 'thinking'
        });

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));

        let rawResponse = "";

        try {
            // Get LLM response
            const stream = await client.chat.completions.create({
                model: "openai/gpt-oss-120b",
                messages: context,
                stream: true,
                temperature: 0.5
            });

            // Stream the LLM's thinking process
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || "";
                rawResponse += content;
                
                yield JSON.stringify({
                    type: 'llm_chunk',
                    content: content,
                    step: 'llm_thinking'
                });
            }

            yield JSON.stringify({
                type: 'status',
                message: 'Parsing LLM response...',
                step: 'parsing'
            });

            // Parse the JSON response
            const parsed = extractJSON(rawResponse);

            if (parsed.type === 'functionCall') {
                // Handle function call
                const { function: fnName, args, status } = parsed.response;
                
                if (!functionMap[fnName]) {
                    throw new Error(`Unknown function: ${fnName}. Available functions: ${Object.keys(functionMap).join(', ')}`);
                }

                yield JSON.stringify({
                    type: 'function_call',
                    function: fnName,
                    args: args,
                    status: status,
                    step: 'executing_function'
                });

                // Execute the function
                const result = await functionMap[fnName](...Object.values(args || {}));
                
                // Store results for context
                if (result.context || result.content) {
                    const newData = result.context || result.content;
                    accumulatedData += "\n\n" + newData;
                    
                    yield JSON.stringify({
                        type: 'data_accumulated',
                        new_data_length: newData.length,
                        total_accumulated: accumulatedData.length,
                        step: 'data_collection'
                    });
                }

                yield JSON.stringify({
                    type: 'function_result',
                    function: fnName,
                    result: result,
                    step: 'function_complete'
                });

                // Update context with results for next iteration
                context.push({ 
                    role: "assistant", 
                    content: rawResponse 
                });
                
                let userFeedback = `Function ${fnName} executed successfully. `;
                if (result.context && result.context.length > 0) {
                    userFeedback += `Found ${result.count || 'some'} relevant documents. `;
                } else {
                    userFeedback += `No relevant documents found. `;
                }
                userFeedback += "What should we do next?";
                
                context.push({
                    role: "user",
                    content: userFeedback
                });

                // Check if function indicates we should finish
                if (status === 'done') {
                    yield JSON.stringify({
                        type: 'status',
                        message: 'Function indicated completion, generating final response...',
                        step: 'preparing_final_response'
                    });
                    
                    // Add instruction to generate final response
                    context.push({
                        role: "user",
                        content: "Please provide the final answer to the user based on all the collected information."
                    });
                }

            } else if (parsed.type === 'finalResponse') {
                // Handle final response - stream it to the user
                const finalContent = parsed.response || "I have processed your request.";
                
                yield JSON.stringify({
                    type: 'final_response_start',
                    message: 'Generating final answer',
                    step: 'final_output'
                });

                // Stream the final content word by word for smooth display
                const words = finalContent.split(' ');
                for (let i = 0; i < words.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 30));
                    yield JSON.stringify({
                        type: 'final_response_chunk',
                        content: words[i] + (i < words.length - 1 ? ' ' : ''),
                        step: 'streaming_final'
                    });
                }

                yield JSON.stringify({
                    type: 'completion',
                    message: 'Document processing completed successfully',
                    step: 'done',
                    final_response: finalContent,
                    total_steps: steps,
                    accumulated_data_length: accumulatedData.length
                });
                
                done = true;
            }

        } catch (error) {
            yield JSON.stringify({
                type: 'error',
                message: 'Processing error',
                error: error.message,
                raw_response: rawResponse.substring(0, 300),
                step: 'error',
                step_number: steps
            });

            // Error recovery - add guidance to context
            context.push({
                role: "user",
                content: `Your previous response was invalid. Error: ${error.message}. Please respond with valid JSON format containing type and response fields. Remember: type can be "functionCall" or "finalResponse".`
            });

            // If too many errors, try to provide a fallback response
            if (steps >= 3) {
                yield JSON.stringify({
                    type: 'status',
                    message: 'Too many errors, attempting fallback response',
                    step: 'error_recovery'
                });

                const fallbackResponse = accumulatedData 
                    ? `I found some information in the documents: ${accumulatedData.substring(0, 400)}...` 
                    : "I encountered issues processing the documents. Please ensure PDFs are uploaded and try again.";

                // Stream the fallback response
                yield JSON.stringify({
                    type: 'final_response_start',
                    message: 'Generating fallback response',
                    step: 'fallback_output'
                });

                const words = fallbackResponse.split(' ');
                for (let i = 0; i < words.length; i++) {
                    await new Promise(resolve => setTimeout(resolve, 40));
                    yield JSON.stringify({
                        type: 'final_response_chunk',
                        content: words[i] + (i < words.length - 1 ? ' ' : ''),
                        step: 'streaming_fallback'
                    });
                }

                yield JSON.stringify({
                    type: 'completion',
                    message: 'Processing completed with errors',
                    step: 'done_with_errors',
                    final_response: fallbackResponse,
                    total_steps: steps
                });
                break;
            }
        }
    }

    if (!done) {
        yield JSON.stringify({
            type: 'error',
            message: 'Maximum processing steps reached',
            step: 'max_steps_reached',
            final_response: 'The document processing took too long to complete. Please try a simpler query or check your documents.'
        });
    }
}

// Non-streaming version for compatibility
export async function documentProcess(query) {
    let finalResponse = '';
    
    for await (const chunk of documentProcessStream(query)) {
        const data = JSON.parse(chunk);
        
        if (data.type === 'final_response_chunk') {
            finalResponse += data.content;
        } else if (data.type === 'completion' || data.type === 'error') {
            break;
        }
    }
    
    return finalResponse || 'Document processing completed.';
}

// Utility function to test the JSON parsing
export function testJSONParsing(text) {
    try {
        return extractJSON(text);
    } catch (error) {
        return { error: error.message };
    }
}