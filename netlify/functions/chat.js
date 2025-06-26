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

        if (!threadId) {
            const thread = await openai.beta.threads.create();
            threadId = thread.id;
        }

        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message,
        });

        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
        });

        let runStatus;
        do {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const runCheck = await openai.beta.threads.runs.retrieve(threadId, run.id);
            runStatus = runCheck.status;
        } while (runStatus !== 'completed');

        const messages = await openai.beta.threads.messages.list(threadId);
        const lastMessageForRun = messages.data
            .filter(
                (message) => message.run_id === run.id && message.role === "assistant"
            )
            .pop();


        if (lastMessageForRun) {
            const reply = lastMessageForRun.content[0].text.value;
            return {
                statusCode: 200,
                body: JSON.stringify({ reply, threadId }),
            };
        } else {
             return {
                statusCode: 200,
                body: JSON.stringify({ reply: "I am unable to provide a response at this time.", threadId }),
            };
        }


    } catch (error) {
        console.error('Error in chat function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred.' }),
        };
    }
};