document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMessages = document.getElementById('chat-messages');

    let threadId = null;

    const addMessage = (message, sender) => {
        const li = document.createElement('li');
        li.textContent = message;
        li.classList.add(sender === 'user' ? 'user-message' : 'assistant-message');
        chatMessages.appendChild(li);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        chatInput.value = '';

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: JSON.stringify({ message, threadId }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorText = await response.text();
                try {
                    // Try to parse it as JSON
                    const errorData = JSON.parse(errorText);
                    throw new Error(errorData.error || 'An unknown error occurred.');
                } catch (e) {
                    // If it's not JSON, use the raw text
                    throw new Error(errorText || 'An unknown error occurred.');
                }
            }

            const data = await response.json();

            if (data.threadId) {
                threadId = data.threadId;
            }

            if (data.reply) {
                addMessage(data.reply, 'assistant');
            } else {
                addMessage(data.error || 'The assistant did not provide a response.', 'assistant');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage(`Error: ${error.message}`, 'assistant');
        }
    };

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    addMessage("Hei, gi meg postnummeret ditt så kan jeg hjelpe meg med tips, triks og tilbud :)", "assistant");
});