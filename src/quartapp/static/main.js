import ChatUI from './ChatUI.js';
import ChatClient from './ChatClient.js';

function initChat() {
    const chatUI = new ChatUI();
    const chatClient = new ChatClient(chatUI);

    const form = document.getElementById("chat-form");
    chatClient.startKeepAlive(30000, "/keep-alive");

    form.addEventListener("submit", async function(e) {
        e.preventDefault();
        const threadName = await chatClient.sendMessage("/chat");
        if (threadName) {
            chatClient.listenToServer("/stream", threadName);
        }
        chatClient.messageInput.value = "";
    });

    window.onbeforeunload = function() {
        chatClient.stopKeepAlive();
        chatClient.closeEventSource();
    };
}

document.addEventListener("DOMContentLoaded", initChat);
