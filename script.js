document.addEventListener('DOMContentLoaded', () => {
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMessages = document.getElementById('chat-messages');
    const chatWidget = document.getElementById('chat-widget');
    const chatMinimize = document.getElementById('chat-minimize');
    const chatHeader = document.getElementById('chat-header');

    let threadId = null;

    const addMessage = (message, sender, id = null) => {
        const li = document.createElement('li');
        if (id) {
            li.id = id;
        }
        li.textContent = message;
        li.classList.add(sender === 'user' ? 'user-message' : 'assistant-message');
        if (sender === 'typing') {
            li.classList.add('typing-indicator');
        }
        chatMessages.appendChild(li);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return li;
    };

    const pollForStatus = async (threadId, runId) => {
        const typingIndicator = addMessage("Assistenten skriver...", 'typing', 'typing-indicator');

        const interval = setInterval(async () => {
            try {
                const response = await fetch('/api/status', {
                    method: 'POST',
                    body: JSON.stringify({ threadId, runId }),
                    headers: { 'Content-Type': 'application/json' }
                });

                if (!response.ok) {
                    // Stop polling on error
                    clearInterval(interval);
                    typingIndicator.remove();
                    const errorText = await response.text();
                    addMessage(`Error checking status: ${errorText}`, 'assistant');
                    return;
                }

                const data = await response.json();

                if (data.status === 'completed') {
                    clearInterval(interval);
                    typingIndicator.remove();
                    addMessage(data.reply, 'assistant');
                } else if (data.status === 'failed') {
                    clearInterval(interval);
                    typingIndicator.remove();
                    addMessage(data.error || 'An error occurred.', 'assistant');
                }
                // If status is 'in_progress', do nothing and let the polling continue.

            } catch (error) {
                clearInterval(interval);
                typingIndicator.remove();
                addMessage(`Error: ${error.message}`, 'assistant');
            }
        }, 2000); // Poll every 2 seconds
    };

    const sendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message) return;

        addMessage(message, 'user');
        chatInput.value = '';

        try {
            // This now just starts the run
            const response = await fetch('/api/chat', {
                method: 'POST',
                body: JSON.stringify({ message, threadId }),
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to start chat.');
            }

            const data = await response.json();
            threadId = data.threadId; // Update threadId for the session
            pollForStatus(data.threadId, data.runId);

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

    const toggleMinimize = () => {
        chatWidget.classList.toggle('minimized');
        chatMinimize.textContent = chatWidget.classList.contains('minimized') ? '+' : '-';
    };

    chatMinimize.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent header click from firing
        toggleMinimize();
    });

    chatHeader.addEventListener('click', () => {
        if (chatWidget.classList.contains('minimized')) {
            toggleMinimize();
        }
    });
});