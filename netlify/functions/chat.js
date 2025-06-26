const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = 'asst_xH9oYbV2GEzxpL7SmX3pfBQq';
const MAX_WAIT_SECONDS = 9;

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { message, threadId: clientThreadId } = JSON.parse(event.body);
        let threadId = clientThreadId;

        // 1. Create a thread if it doesn't exist
        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
        }

        // 2. Add a message to the thread
        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message,
        });

        // 3. Create a run
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
        });

        // 4. Poll for the run to complete
        let runStatus;
        let waitTime = 0;
        do {
            if (waitTime >= MAX_WAIT_SECONDS) {
                console.error(`Run timed out for thread ${threadId} and run ${run.id}`);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'The assistant is taking too long to respond. Please try again.' }),
                };
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            waitTime++;
            const runCheck = await openai.beta.threads.runs.retrieve(threadId, run.id);
            runStatus = runCheck.status;

            if (['failed', 'cancelled', 'expired'].includes(runStatus)) {
                console.error(`Run failed with status ${runStatus} for thread ${threadId} and run ${run.id}`);
                 return {
                    statusCode: 500,
                    body: JSON.stringify({ error: `The assistant run failed with status: ${runStatus}` }),
                };
            }

        } while (runStatus !== 'completed');

        // 5. Get the latest messages
        const messages = await openai.beta.threads.messages.list(threadId);
        const lastMessageForRun = messages.data
            .filter(
                (msg) => msg.run_id === run.id && msg.role === "assistant"
            )
            .pop();


        if (lastMessageForRun && lastMessageForRun.content[0].type === "text") {
            const reply = lastMessageForRun.content[0].text.value;
            return {
                statusCode: 200,
                body: JSON.stringify({ reply, threadId }),
            };
        } else {
            console.error(`No assistant message found for thread ${threadId} and run ${run.id}`);
             return {
                statusCode: 200, // Still a success from the function's perspective
                body: JSON.stringify({ reply: "The assistant did not provide a text response.", threadId }),
            };
        }

    } catch (error) {
        console.error('Error in chat function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred processing your message.' }),
        };
    }
};