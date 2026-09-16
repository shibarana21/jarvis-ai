const STORAGE_KEY = "jarvis_conversations_v1";

const messagesElement = document.getElementById("messages");
const chatListElement = document.getElementById("chatList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const loadingIndicator = document.getElementById("loadingIndicator");

const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");

let conversations = loadConversations();
let activeConversationId = null;

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadConversations() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : [];
  } catch (error) {
    console.error("Could not load chat history:", error);
    return [];
  }
}

function saveConversations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function createNewChat() {
  const conversation = {
    id: createId(),
    title: "New Conversation",
    createdAt: Date.now(),
    messages: []
  };

  conversations.unshift(conversation);
  activeConversationId = conversation.id;

  saveConversations();
  renderApp();
  closeSidebar();
  messageInput.focus();
}

function getActiveConversation() {
  return conversations.find(
    conversation => conversation.id === activeConversationId
  );
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function renderMessages() {
  const conversation = getActiveConversation();

  if (!conversation || conversation.messages.length === 0) {
    messagesElement.innerHTML = `
      <div class="welcome-card">
        <div class="core">J</div>
        <h2>JARVIS UI Ready</h2>
        <p>Namaste! Main aapka personal AI assistant banne ke liye taiyar hoon.</p>
        <p>Hindi, Hinglish ya English mein message likhkar UI test karein.</p>
        <p><strong>Note:</strong> Gemini backend अगले चरण में connect होगा।</p>
      </div>
    `;
    return;
  }

  messagesElement.innerHTML = conversation.messages
    .map(message => {
      const label = message.role === "user" ? "YOU" : "JARVIS";

      return `
        <div class="message-row ${message.role}">
          <div class="message-bubble">
            <div class="message-label">${label}</div>
            ${escapeHTML(message.content)}
          </div>
        </div>
      `;
    })
    .join("");

  requestAnimationFrame(() => {
    messagesElement.scrollTop = messagesElement.scrollHeight;
  });
}

function renderChatList() {
  if (conversations.length === 0) {
    chatListElement.innerHTML = `
      <p style="color:#8ba6b3; text-align:center;">
        No conversations yet
      </p>
    `;
    return;
  }

  chatListElement.innerHTML = conversations
    .map(conversation => `
      <div
        class="chat-item ${
          conversation.id === activeConversationId ? "active" : ""
        }"
      >
        <button
          class="chat-title"
          type="button"
          data-open-chat="${conversation.id}"
          style="border:0; color:inherit; background:transparent;"
        >
          ${escapeHTML(conversation.title)}
        </button>

        <button
          class="delete-button"
          type="button"
          data-delete-chat="${conversation.id}"
          aria-label="Delete chat"
        >
          🗑
        </button>
      </div>
    `)
    .join("");
}

function renderApp() {
  renderMessages();
  renderChatList();
}

function openConversation(id) {
  activeConversationId = id;
  renderApp();
  closeSidebar();
}

function deleteConversation(id) {
  const conversation = conversations.find(item => item.id === id);

  if (!conversation) {
    return;
  }

  const shouldDelete = confirm(
    `"${conversation.title}" chat delete करनी है?`
  );

  if (!shouldDelete) {
    return;
  }

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