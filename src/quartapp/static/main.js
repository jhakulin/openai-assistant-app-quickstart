// main.js

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
        chatClient.messageInput.value = ""; // Clear the input field
    });

    window.onbeforeunload = function() {
        chatClient.stopKeepAlive();
        chatClient.closeEventSource();
    };

    console.log("main.js loaded!");
}

document.addEventListener("DOMContentLoaded", initChat);
