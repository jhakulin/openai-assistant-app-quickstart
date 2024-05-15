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

    // Handle clicks on document links within the chat
    document.addEventListener('click', function (e) {
        if (e.target.tagName === 'A' && e.target.classList.contains('document-link')) {
            e.preventDefault();
            const docUrl = e.target.href;
            showDocument(docUrl);
        }
    });

    window.onbeforeunload = function() {
        chatClient.stopKeepAlive();
        chatClient.closeEventSource();
    };
}

// Function to show the document in the split view
function showDocument(url) {
    const docViewerSection = document.getElementById("document-viewer-section");
    const chatColumn = document.getElementById("chat-container");

    // Load the document URL into the iframe
    document.getElementById("document-viewer").src = url;

    // Update Bootstrap grid classes for splitting the screen
    chatColumn.classList.remove("col-12");
    chatColumn.classList.add("col-6");
    docViewerSection.classList.remove("col-0");
    docViewerSection.classList.add("col-6");

    // Make the document viewer visible
    docViewerSection.style.display = 'block';
}

// Function to close the document viewer and restore full chat view
function closeDocumentViewer() {
    const docViewerSection = document.getElementById("document-viewer-section");
    const chatColumn = document.getElementById("chat-container");

    // Hide the document viewer
    docViewerSection.style.display = 'none';
    docViewerSection.classList.remove("col-6");
    docViewerSection.classList.add("col-0");

    // Restore the chat column to full width
    chatColumn.classList.remove("col-6");
    chatColumn.classList.add("col-12");
}

document.addEventListener("DOMContentLoaded", initChat);
