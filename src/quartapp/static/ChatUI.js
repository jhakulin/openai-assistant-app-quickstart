// ChatUI.js

class ChatUI {
    constructor() {
        this.targetContainer = document.getElementById("messages");
        this.userTemplate = document.querySelector('#message-template-user');
        this.assistantTemplate = document.querySelector('#message-template-assistant');
        if (!this.assistantTemplate) {
            console.error("Assistant template not found!");
        }
        this.addCitationClickListener();
    }

    preprocessContent(content) {
        // Regular expression to find citations like [n] filename.md
        const citationRegex = /\[(\d+)\] ([^\s]+\.md)/g;
        return content.replace(citationRegex, (match, p1, p2) => {
            return `<a href="#" class="file-citation" data-file-name="${p2}">[${p1}] ${p2}</a>`;
        });
    }

    addCitationClickListener() {
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('file-citation')) {
                event.preventDefault();
                const filename = event.target.getAttribute('data-file-name');
                this.loadDocument(filename);
            }
        });
    }

    async loadDocument(filename) {
        try {
            const response = await fetch(`/fetch-document?filename=${filename}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const markdownContent = await response.text();
            // Use markdown-it to convert Markdown to HTML
            const md = window.markdownit({
                html: true,
                linkify: true,
                typographer: true,
                breaks: true
            });
            const htmlContent = md.render(markdownContent);
            window.showDocument(htmlContent);
        } catch (error) {
            console.error('Error fetching document:', error);
        }
    }

    appendUserMessage(message) {
        const userTemplateClone = this.userTemplate.content.cloneNode(true);
        userTemplateClone.querySelector(".message-content").textContent = message;
        this.targetContainer.appendChild(userTemplateClone);
        this.scrollToBottom();
    }

    appendAssistantMessage(messageDiv, accumulatedContent, isStreaming) {
        //console.log("Accumulated Content before conversion:", accumulatedContent);    
        const md = window.markdownit({
            html: true,
            linkify: true,
            typographer: true,
            breaks: true
        });
    
        try {
            // Preprocess content to convert citations to links
            const preprocessedContent = this.preprocessContent(accumulatedContent);
            // Convert the accumulated content to HTML using markdown-it
            let htmlContent = md.render(preprocessedContent);
            const messageTextDiv = messageDiv.querySelector(".message-text");
            if (!messageTextDiv) {
                throw new Error("Message content div not found in the template.");
            }
    
            // Set the innerHTML of the message text div to the HTML content
            messageTextDiv.innerHTML = htmlContent;
   
            // Use requestAnimationFrame to ensure the DOM has updated before scrolling
            // Only scroll if not streaming
            if (!isStreaming) {
                console.log("Accumulated content:", accumulatedContent);
                console.log("HTML set to messageTextDiv:", messageTextDiv.innerHTML);
                requestAnimationFrame(() => {
                    this.scrollToBottom();
                });
            }
        } catch (error) {
            console.error("Error in appendAssistantMessage:", error);
        }
    }

    clearAssistantMessage(messageDiv) {
        const messageTextDiv = messageDiv.querySelector(".message-text");
        if (messageTextDiv) {
            messageTextDiv.innerHTML = '';
        }
    }

    createAssistantMessageDiv() {
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
       
        if (!newlyAddedToast) {
            console.error("Failed to find the newly added toast element.");
            return null;
        }
    
        // Now, find the .message-content within this newly added toast
        const messageDiv = newlyAddedToast.querySelector(".message-content");
    
        if (!messageDiv) {
            console.error("Message content div not found in the template.");
        }
    
        return messageDiv;
    }
    
    scrollToBottom() {
        const lastChild = this.targetContainer.lastElementChild;
        if (lastChild) {
            // Adjust the scroll to make sure the input box is visible
            lastChild.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
        
        // Ensure the input box remains visible
        const inputBox = document.querySelector('#chat-area');
        if (inputBox) {
            inputBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }
}

export default ChatUI;
