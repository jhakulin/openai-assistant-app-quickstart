// ChatUI.js

class ChatUI {
    constructor() {
        this.targetContainer = document.getElementById("messages");
        this.userTemplate = document.querySelector('#message-template-user');
        this.assistantTemplate = document.querySelector('#message-template-assistant');
        if (!this.assistantTemplate) {
            console.error("Assistant template not found!");
        }
        console.log("Assistant Template Content:", this.assistantTemplate.content);
        console.log("ChatUI.js loaded!");
    }

    appendUserMessage(message) {
        const userTemplateClone = this.userTemplate.content.cloneNode(true);
        userTemplateClone.querySelector(".message-content").textContent = message;
        this.targetContainer.appendChild(userTemplateClone);
        this.scrollToBottom();
    }

    appendAssistantMessage(messageDiv, accumulatedContent) {
        const converter = new showdown.Converter();
        messageDiv.innerHTML = converter.makeHtml(accumulatedContent);
        this.scrollToBottom();
    }

    createAssistantMessageDiv() {
        console.log("Creating assistant message div...");
        console.log("Assistant Template Content:", this.assistantTemplate.content);
    
        const assistantTemplateClone = this.assistantTemplate.content.cloneNode(true);
        if (!assistantTemplateClone) {
            console.error("Failed to clone assistant template.");
            return null;
        }
    
        // Append the clone to the target container
        this.targetContainer.appendChild(assistantTemplateClone);
    
        // Since the content of assistantTemplateClone is now transferred to the DOM,
        // you should query the targetContainer for the elements you want to interact with.
        // Specifically, you look at the last added 'toast' which is where the new content lives.
        const newlyAddedToast = this.targetContainer.querySelector(".toast-container:last-child .toast:last-child");
    
        console.log("Newly added toast:", newlyAddedToast);
    
        if (!newlyAddedToast) {
            console.error("Failed to find the newly added toast element.");
            return null;
        }
    
        // Now, find the .message-content within this newly added toast
        const messageDiv = newlyAddedToast.querySelector(".message-content");
    
        if (!messageDiv) {
            console.error("Message content div not found in the template.");
        } else {
            console.log("Message content div found:", messageDiv);
        }
    
        return messageDiv;
    }
    
    scrollToBottom() {
        this.targetContainer.scrollTop = this.targetContainer.scrollHeight;
    }
}

export default ChatUI;
