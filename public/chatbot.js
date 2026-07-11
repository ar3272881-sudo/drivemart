(() => {
    "use strict";

    const root = document.getElementById("driveMartChat");
    if (!root) return;

    const toggle = document.getElementById("dmChatToggle");
    const panel = document.getElementById("dmChatPanel");
    const closeButton = document.getElementById("dmChatClose");
    const form = document.getElementById("dmChatForm");
    const input = document.getElementById("dmChatInput");
    const messages = document.getElementById("dmChatMessages");
    const suggestions = document.getElementById("dmChatSuggestions");
    const submitButton = form?.querySelector("button[type='submit']");

    const endpoint = root.dataset.endpoint || "/api/chatbot";
    const csrfToken = root.dataset.csrf || "";
    let busy = false;

    const setOpen = (open) => {
        panel.hidden = !open;
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "Close Drive Mart AI assistant" : "Open Drive Mart AI assistant");
        toggle.querySelector("i")?.classList.toggle("fa-comments", !open);
        toggle.querySelector("i")?.classList.toggle("fa-xmark", open);
        if (open) window.setTimeout(() => input.focus(), 80);
    };

    const addMessage = (text, type = "bot") => {
        const message = document.createElement("div");
        message.className = `dm-message ${type === "user" ? "dm-user-message" : "dm-bot-message"}`;
        if (type === "error") message.classList.add("dm-error-message");
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
        return message;
    };

    const addTyping = () => {
        const typing = document.createElement("div");
        typing.className = "dm-message dm-bot-message dm-typing";
        typing.setAttribute("aria-label", "AI is typing");
        typing.innerHTML = "<span></span><span></span><span></span>";
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;
        return typing;
    };

    const setBusy = (state) => {
        busy = state;
        input.disabled = state;
        submitButton.disabled = state;
    };

    const sendMessage = async (rawMessage) => {
        const message = String(rawMessage || "").trim();
        if (!message || busy) return;

        setOpen(true);
        addMessage(message, "user");
        input.value = "";
        suggestions.hidden = true;
        setBusy(true);
        const typing = addTyping();

        try {
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {"Content-Type": "application/json", "Accept": "application/json"},
                credentials: "same-origin",
                body: JSON.stringify({message, csrf_token: csrfToken})
            });

            const data = await response.json().catch(() => ({}));
            typing.remove();

            if (!response.ok || !data.ok) {
                throw new Error(data.error || "AI assistant is unavailable right now.");
            }

            addMessage(data.reply || "Sorry, mujhe response nahi mila.");
        } catch (error) {
            typing.remove();
            addMessage(error instanceof Error ? error.message : "AI assistant is unavailable right now.", "error");
        } finally {
            setBusy(false);
            input.focus();
        }
    };

    toggle?.addEventListener("click", () => setOpen(panel.hidden));
    closeButton?.addEventListener("click", () => setOpen(false));

    form?.addEventListener("submit", (event) => {
        event.preventDefault();
        void sendMessage(input.value);
    });

    suggestions?.addEventListener("click", (event) => {
        const button = event.target.closest("button[data-question]");
        if (button) void sendMessage(button.dataset.question);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !panel.hidden) setOpen(false);
    });
})();
