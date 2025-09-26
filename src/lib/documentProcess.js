// documentProcess.js
import systemPrompt from "./systemPrompt.js";
import { functionMap } from "./RAGtools.js";
import { client } from "./chatProcess.js";

export async function* documentProcessStream(query) {
    let context = [systemPrompt, { role: "user", content: query }];
    let done = false,
        steps = 0;

    // Send initial processing message
    yield JSON.stringify({
        type: 'status',
        message: 'Starting document processing...',
        step: 'initializing'
    });

    while (!done && steps < 15) {
        await new Promise((res) => setTimeout(res, 2000));
        steps++;

        yield JSON.stringify({
            type: 'status',
            message: `Processing step ${steps}...`,
            step: 'thinking'
        });

        // Streaming implementation
        let raw = "";
        const stream = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: context,
            stream: true,
        });

        // Stream the LLM response
        let llmResponse = "";
        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            raw += content;
            llmResponse += content;
            
            // Stream each chunk as it comes from the LLM
            yield JSON.stringify({
                type: 'llm_chunk',
                content: content,
                step: 'llm_response'
            });
        }

        yield JSON.stringify({
            type: 'status',
            message: 'Analyzing response...',
            step: 'parsing'
        });

        if (raw.startsWith("```")) {
            raw = raw.replace(/```json|```/g, "").trim();
        }
        
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            yield JSON.stringify({
                type: 'error',
                message: 'Invalid JSON from LLM',
                error: e.message,
                step: 'error'
            });
            break;
        }

        const fnName = parsed.function;
        const fn = functionMap[fnName];
        if (!fn) {
            yield JSON.stringify({
                type: 'error',
                message: `Unknown function: ${fnName}`,
                step: 'error'
            });
            break;
        }

        // Send function execution start
        yield JSON.stringify({
            type: 'function_start',
            function: fnName,
            args: parsed.args,
            step: 'executing_function'
        });

        // Run chosen function
        try {
            const result = await fn(...Object.values(parsed.args));
            
            yield JSON.stringify({
                type: 'function_result',
                function: fnName,
                result: result,
                step: 'function_complete'
            });

            // Push results back into context
            context.push({ role: "assistant", content: raw });
            context.push({
                role: "user",
                content: result?.context || JSON.stringify(result),
            });

            if (fnName === "retrieveSimilar") {
                if (result.context && result.context.length > 0) {
                    context.push({ role: "user", content: "Context found. Please summarize." });
                } else {
                    context.push({
                        role: "user",
                        content: `No docs found. Use createThenRetrive(query, topK) to create PDF vectors and then retrieve similar chunks based on query.`,
                    });
                }
            }

            if (fnName === "retrieveAllDocs" && result.length === 0) {
                context.push({
                    role: "user",
                    content: `No PDFs found in database. Use createThenRetrive(query) to load and process PDFs.`,
                });
            }

            if (parsed.status === "done") {
                yield JSON.stringify({
                    type: 'completion',
                    message: 'Document processing complete',
                    step: 'done',
                    final_context: context
                });
                done = true;
            } else {
                yield JSON.stringify({
                    type: 'status',
                    message: 'Continuing to next step...',
                    step: 'continuing',
                    next_function: fnName
                });
            }

        } catch (error) {
            yield JSON.stringify({
                type: 'error',
                message: `Function ${fnName} execution failed`,
                error: error.message,
                step: 'function_error'
            });
            break;
        }
    }

    if (!done) {
        yield JSON.stringify({
            type: 'warning',
            message: 'Maximum steps reached without completion',
            step: 'max_steps_reached'
        });
    }
}

// Non-streaming version for compatibility
export async function documentProcess(query) {
    let fullResponse = '';
    
    for await (const chunk of documentProcessStream(query)) {
        const data = JSON.parse(chunk);
        
        if (data.type === 'llm_chunk') {
            fullResponse += data.content;
        } else if (data.type === 'completion') {
            break;
        }
    }
    
    return fullResponse;
}