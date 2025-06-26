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
            const response = await fetch('/.netlify/functions/chat', {
                method: 'POST',
                body: JSON.stringify({ message, threadId }),
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            if (data.threadId) {
                threadId = data.threadId;
            }

            if (data.reply) {
                addMessage(data.reply, 'assistant');
            } else {
                addMessage('An error occurred.', 'assistant');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage('An error occurred while connecting to the assistant.', 'assistant');
        }
    };

    chatSend.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    addMessage("Hello! How can I help you today?", "assistant");
});