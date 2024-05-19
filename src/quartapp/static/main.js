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

    // Attach closeDocumentViewer function to the close button
    const closeButton = document.getElementById("close-button");
    if (closeButton) {
        closeButton.addEventListener("click", window.closeDocumentViewer);
    }
}

// Function to show the document in the split view
window.showDocument = function(content) {
    console.log("showDocument:", content);
    const docViewerSection = document.getElementById("document-viewer-section");
    const chatColumn = document.getElementById("chat-container");

    // Load the document content into the iframe
    const iframe = document.getElementById("document-viewer");
    iframe.srcdoc = content;

    // Check if the iframe content is loaded correctly
    iframe.onload = function() {
        console.log("Iframe loaded successfully.");
    };
    iframe.onerror = function() {
        console.error("Error loading iframe content.");
    };

    // Update Bootstrap grid classes for splitting the screen
    chatColumn.classList.remove("col-full");
    chatColumn.classList.add("col-half");
    docViewerSection.classList.add("visible");
    docViewerSection.classList.remove("hidden");

    // Make the document viewer and the close button visible
    docViewerSection.style.display = 'block';
    document.getElementById("close-button").style.display = 'block';
}

// Function to close the document viewer and restore full chat view
window.closeDocumentViewer = function() {
    const docViewerSection = document.getElementById("document-viewer-section");
    const chatColumn = document.getElementById("chat-container");

    // Hide the document viewer and the close button
    docViewerSection.style.display = 'none';
    docViewerSection.classList.add("hidden");
    docViewerSection.classList.remove("visible");
    document.getElementById("close-button").style.display = 'none';

    // Restore the chat column to full width
    chatColumn.classList.remove("col-half");
    chatColumn.classList.add("col-full");
}

document.addEventListener("DOMContentLoaded", initChat);
