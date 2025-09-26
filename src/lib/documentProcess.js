// documentProcess.js
import systemPrompt from "./systemPrompt.js";
import { functionMap } from "./RAGtools.js";
import { client } from "./chatProcess.js";


const run = async (query) => {
    let context = [systemPrompt, { role: "user", content: query }];
    let done = false,
        steps = 0;

    while (!done && steps < 15) {
        await new Promise((res) => setTimeout(res, 2000));
        console.log("waiting...2000ms");
        steps++;

        // Streaming implementation
        let raw = "";
        const stream = await client.chat.completions.create({
            model: "openai/gpt-oss-120b",
            messages: context,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || "";
            raw += content;
            process.stdout.write(content);
        }
        console.log("\n\n⚡ Streaming complete\n");

        if (raw.startsWith("```")) {
            raw = raw.replace(/```json|```/g, "").trim();
        }
        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (e) {
            console.error("❌ Invalid JSON from LLM:", e.message);
            break;
        }

        const fnName = parsed.function;
        const fn = functionMap[fnName];
        if (!fn) {
            console.error("❌ Unknown function:", fnName);
            break;
        }

        // Run chosen function
        const result = await fn(...Object.values(parsed.args));
        console.log(`⚡ Ran ${fnName} ->`, result);

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
            console.log("✅ Workflow complete");
            done = true;

        }

    }
};



run("what are the pdf about").then(() => process.exit(0)).catch((err) => {
    console.error("Pipeline failed:", err);
});