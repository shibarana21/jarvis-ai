async function handleSubmit(event) {
  event.preventDefault();
  const message = messageInput.value.trim();
  if (!message) return;

  addMessage("user", message);
  messageInput.value = "";
  showLoading(true);

  try {
    const activeConv = getActiveConversation();
    
    // Hamare backend bridge ko call karein
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: activeConv.messages })
    });

    const data = await response.json();
    
    if (data.error) throw new Error(data.error);
    
    addMessage("assistant", data.content);
  } catch (error) {
    addMessage("assistant", "Maaf kijiye, connection mein problem hai: " + error.message);
  } finally {
    showLoading(false);
  }
}  }

  conversations = conversations.filter(item => item.id !== id);

  if (activeConversationId === id) {
    activeConversationId = conversations[0]?.id || null;
  }

  saveConversations();

  if (conversations.length === 0) {
    createNewChat();
    return;
  }

  renderApp();
}

function addMessage(role, content) {
  const conversation = getActiveConversation();

  if (!conversation) {
    return;
  }

  conversation.messages.push({
    id: createId(),
    role,
    content,
    createdAt: Date.now()
  });

  if (
    role === "user" &&
    conversation.title === "New Conversation"
  ) {
    conversation.title =
      content.length > 32
        ? `${content.slice(0, 32)}...`
        : content;
  }

  saveConversations();
  renderApp();
}

function showLoading(show) {
  loadingIndicator.classList.toggle("hidden", !show);
}

async function handleSubmit(event) {
  event.preventDefault();

  const message = messageInput.value.trim();

  if (!message) {
    alert("कृपया पहले कोई message लिखें।");
    return;
  }

  addMessage("user", message);

  messageInput.value = "";
  messageInput.style.height = "44px";

  showLoading(true);

  await new Promise(resolve => setTimeout(resolve, 700));

  showLoading(false);

  addMessage(
    "assistant",
    "UI test successful. आपका message local chat history में save हो गया है। Gemini AI अभी connected नहीं है।"
  );
}

function openSidebar() {
  sidebar.classList.add("open");
  sidebarOverlay.classList.add("open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  sidebarOverlay.classList.remove("open");
}

messageForm.addEventListener("submit", handleSubmit);

messageInput.addEventListener("input", () => {
  messageInput.style.height = "44px";
  messageInput.style.height =
    `${Math.min(messageInput.scrollHeight, 120)}px`;
});

document
  .getElementById("menuButton")
  .addEventListener("click", openSidebar);

document
  .getElementById("closeSidebarButton")
  .addEventListener("click", closeSidebar);

sidebarOverlay.addEventListener("click", closeSidebar);

document
  .getElementById("newChatButton")
  .addEventListener("click", createNewChat);

document
  .getElementById("sidebarNewChatButton")
  .addEventListener("click", createNewChat);

chatListElement.addEventListener("click", event => {
  const openButton = event.target.closest("[data-open-chat]");
  const deleteButton = event.target.closest("[data-delete-chat]");

  if (openButton) {
    openConversation(openButton.dataset.openChat);
  }

  if (deleteButton) {
    deleteConversation(deleteButton.dataset.deleteChat);
  }
});

if (conversations.length === 0) {
  createNewChat();
} else {
  activeConversationId = conversations[0].id;
  renderApp();
}
