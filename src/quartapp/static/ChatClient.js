// ChatClient.js

class ChatClient {
    constructor(ui) {
        this.ui = ui;
        this.messageInput = document.getElementById("message");
        this.eventSource = null;
        this.keepAliveInterval = null;
        console.log("ChatClient.js loaded!");
    }

    async sendMessage(url) {
        const message = this.messageInput.value.trim();
        if (!message) return false;

        this.ui.appendUserMessage(message);

        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        return data.thread_name;
    }

    async sendKeepAlive(url) {
        try {
            await fetch(url, { method: "POST" });
            console.log("Keep-alive sent successfully");
        } catch (error) {
            console.error("Error sending keep-alive:", error);
        }
    }

    startKeepAlive(interval, url) {
        this.keepAliveInterval = setInterval(() => this.sendKeepAlive(url), interval);
    }

    stopKeepAlive() {
        if (this.keepAliveInterval) clearInterval(this.keepAliveInterval);
    }

    listenToServer(url, threadName) {
        if (!this.eventSource || this.eventSource.readyState === EventSource.CLOSED) {
            this.eventSource = new EventSource(`${url}/${threadName}`);
            this.handleMessages();
        }
    }

    handleMessages() {
        let messageDiv = null;
        let accumulatedContent = '';

        console.log("handleMessages");
        this.eventSource.onmessage = event => {
            const data = JSON.parse(event.data);

            if (data.content === "StreamEnd") {
                console.log("Streaming ends");
                this.eventSource.close();
                messageDiv = null;
                accumulatedContent = '';
            } else {
                if (!messageDiv) {
                    console.log("Create assistant message box");
                    messageDiv = this.ui.createAssistantMessageDiv();
                    if (!messageDiv) {
                        console.error("Failed to create message div.");
                    }
                }
                accumulatedContent += data.content;
                //console.log(accumulatedContent);
                this.ui.appendAssistantMessage(messageDiv, accumulatedContent);
            }
        };

        this.eventSource.onerror = error => {
            console.error("EventSource failed:", error);
            this.eventSource.close();
        };
    }

    closeEventSource() {
        if (this.eventSource) this.eventSource.close();
    }
}

export default ChatClient;
