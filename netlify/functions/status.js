const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { threadId, runId } = JSON.parse(event.body);

        if (!threadId || !runId) {
            return { statusCode: 400, body: JSON.stringify({ error: 'Missing threadId or runId' }) };
        }

        const runCheck = await openai.beta.threads.runs.retrieve(threadId, runId);
        const runStatus = runCheck.status;

        if (runStatus === 'completed') {
            const messages = await openai.beta.threads.messages.list(threadId);
            const lastMessageForRun = messages.data
                .filter(msg => msg.run_id === runId && msg.role === "assistant")
                .pop();

            if (lastMessageForRun && lastMessageForRun.content[0].type === "text") {
                const reply = lastMessageForRun.content[0].text.value;
                return {
                    statusCode: 200,
                    body: JSON.stringify({ status: 'completed', reply }),
                };
            } else {
                return {
                    statusCode: 200,
                    body: JSON.stringify({ status: 'completed', reply: "The assistant did not provide a text response." }),
                };
            }
        } else if (['failed', 'cancelled', 'expired'].includes(runStatus)) {
            return {
                statusCode: 200,
                body: JSON.stringify({ status: 'failed', error: `The assistant run failed with status: ${runStatus}` }),
            };
        } else {
            // Still in progress
            return {
                statusCode: 200,
                body: JSON.stringify({ status: 'in_progress' }),
            };
        }
    } catch (error) {
        console.error('Error in status function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'An internal server error occurred checking status.' }),
        };
    }
};