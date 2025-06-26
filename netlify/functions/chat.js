const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const assistantId = 'asst_xH9oYbV2GEzxpL7SmX3pfBQq';
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

        // 3. Create a run and return the IDs immediately
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
        });

        return {
            statusCode: 200,
            body: JSON.stringify({ threadId: threadId, runId: run.id }),
        };

    } catch (error) {
        console.error('Error in chat start function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred starting the chat.' }),
        };
    }
};