const STORAGE_KEY = "jarvis_conversations_v1";
const messagesElement = document.getElementById("messages");
const chatListElement = document.getElementById("chatList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const loadingIndicator = document.getElementById("loadingIndicator");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const voiceStatus = document.getElementById("voiceStatus");
const micButton = document.getElementById("micButton");

let conversations = loadConversations();
let activeConversationId = null;

function loadConversations() {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);
    return savedData ? JSON.parse(savedData) : [];
  } catch (e) { return []; }
}

function saveConversations() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

function renderMessages() {
  const conversation = conversations.find(c => c.id === activeConversationId);
  if (!conversation || conversation.messages.length === 0) {
    messagesElement.innerHTML = `
      <div class="welcome-card">
        <div class="core">J</div>
        <h2>JARVIS Ready</h2>
        <p>Main online hoon. Mujhse kuch bhi puchiye.</p>
      </div>`;
    return;
  }
  messagesElement.innerHTML = conversation.messages.map(m => `
    <div class="message-row ${m.role}">
      <div class="message-bubble">
        <div class="message-label">${m.role === 'user' ? 'YOU' : 'JARVIS'}</div>
        ${m.content}
      </div>
    </div>`).join("");
  messagesElement.scrollTop = messagesElement.scrollHeight;
}

async function handleSubmit(event) {
  event.preventDefault();
  const content = messageInput.value.trim();
  if (!content) return;

  const conv = conversations.find(c => c.id === activeConversationId);
  conv.messages.push({ role: "user", content });
  messageInput.value = "";
  renderMessages();

  loadingIndicator.classList.remove("hidden");
  voiceStatus.innerText = "JARVIS is thinking...";

  // JARVIS jawab dete waqt mic ko band rakhein taaki khud ki awaaz na sune
  if (recognition && isListening) {
    recognition.stop();
  }

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: conv.messages })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    conv.messages.push({ role: "assistant", content: data.content });
    speakText(data.content);
  } catch (err) {
    conv.messages.push({ role: "assistant", content: "Error: " + err.message });
    voiceStatus.innerText = "Connection Error";
    // Error ke baad bhi agar mic ON tha to fir se sunna shuru kar dein
    if (isListening) {
      try { recognition.start(); } catch (e) {}
    }
  } finally {
    loadingIndicator.classList.add("hidden");
    saveConversations();
    renderMessages();
  }
}

// Basic Setup
function startNewChat() {
  const id = Date.now().toString();
  conversations.unshift({ id, title: "New Chat", messages: [] });
  activeConversationId = id;
  saveConversations();
  renderMessages();
}

messageForm.addEventListener("submit", handleSubmit);
document.getElementById("newChatButton").addEventListener("click", startNewChat);

// ---- Voice Input (Toggle On/Off, Always Listening while ON) ----
let recognition;
let isListening = false;
let isSpeaking = false; // JARVIS jab bol raha ho tab true rahega

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'hi-IN';
  recognition.interimResults = false;
  recognition.continuous = true;

  recognition.onresult = (event) => {
    const lastResult = event.results[event.results.length - 1];
    const transcript = lastResult[0].transcript.trim();
    if (transcript) {
      messageInput.value = transcript;
      messageForm.requestSubmit();
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
  };

  recognition.onend = () => {
    // Sirf tabhi dobara start karo jab mic ON ho AUR JARVIS bol na raha ho
    if (isListening && !isSpeaking) {
      try { recognition.start(); } catch (e) {}
    }
  };

  function startRecognition() {
    isListening = true;
    micButton.classList.add("mic-active");
    voiceStatus.innerText = "JARVIS is listening...";
    try { recognition.start(); } catch (e) {}
  }

  function stopRecognition() {
    isListening = false;
    micButton.classList.remove("mic-active");
    voiceStatus.innerText = "Mic is off";
    recognition.stop();
  }

  micButton.addEventListener('click', () => {
    if (isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  });

} else {
  console.warn('Speech recognition not supported in this browser.');
  micButton.disabled = true;
}

// ---- Voice Output (Text to Speech) ----
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'hi-IN';
    utterance.rate = 1;

    isSpeaking = true; // bolna shuru, mic band rakhein

    utterance.onend = () => {
      isSpeaking = false; // bolna khatam
      if (isListening) {
        try { recognition.start(); } catch (e) {}
        voiceStatus.innerText = "JARVIS is listening...";
      } else {
        voiceStatus.innerText = "Mic is off";
      }
    };

    utterance.onerror = () => {
      isSpeaking = false;
      if (isListening) {
        try { recognition.start(); } catch (e) {}
      }
    };

    window.speechSynthesis.speak(utterance);
  }
}

// Initialize
if (conversations.length === 0) startNewChat();
else { activeConversationId = conversations[0].id; renderMessages(); }