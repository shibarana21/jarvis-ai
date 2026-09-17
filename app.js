const STORAGE_KEY = "jarvis_conversations_v1";
const USER_API_KEY_STORAGE = "jarvis_user_api_key";
const USER_PROVIDER_STORAGE = "jarvis_user_provider";

const messagesElement = document.getElementById("messages");
const chatListElement = document.getElementById("chatList");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");
const loadingIndicator = document.getElementById("loadingIndicator");
const sidebar = document.getElementById("sidebar");
const sidebarOverlay = document.getElementById("sidebarOverlay");
const voiceStatus = document.getElementById("voiceStatus");
const micButton = document.getElementById("micButton");
const langToggleButton = document.getElementById("langToggleButton");

const settingsButton = document.getElementById("settingsButton");
const settingsPanel = document.getElementById("settingsPanel");
const apiKeyInput = document.getElementById("apiKeyInput");
const providerSelect = document.getElementById("providerSelect");
const saveApiKeyButton = document.getElementById("saveApiKeyButton");
const clearApiKeyButton = document.getElementById("clearApiKeyButton");
const closeSettingsButton = document.getElementById("closeSettingsButton");

let currentLang = "hi-IN";
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

function loadUserApiKey() {
  return localStorage.getItem(USER_API_KEY_STORAGE) || "";
}

function loadUserProvider() {
  return localStorage.getItem(USER_PROVIDER_STORAGE) || "gemini";
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

  pauseRecognitionForSpeaking();

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: conv.messages,
        userApiKey: loadUserApiKey(),
        userProvider: loadUserProvider()
      })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    conv.messages.push({ role: "assistant", content: data.content });
    speakText(data.content);
  } catch (err) {
    conv.messages.push({ role: "assistant", content: "Error: " + err.message });
    voiceStatus.innerText = "Connection Error";
    resumeRecognitionAfterSpeaking();
  } finally {
    loadingIndicator.classList.add("hidden");
    saveConversations();
    renderMessages();
  }
}

function startNewChat() {
  const id = Date.now().toString();
  conversations.unshift({ id, title: "New Chat", messages: [] });
  activeConversationId = id;
  saveConversations();
  renderMessages();
}

messageForm.addEventListener("submit", handleSubmit);
document.getElementById("newChatButton").addEventListener("click", startNewChat);

// ---- Settings / User's own API key + Provider ----
settingsButton.addEventListener('click', () => {
  apiKeyInput.value = loadUserApiKey();
  providerSelect.value = loadUserProvider();
  settingsPanel.classList.remove("hidden");
});

closeSettingsButton.addEventListener('click', () => {
  settingsPanel.classList.add("hidden");
});

saveApiKeyButton.addEventListener('click', () => {
  const key = apiKeyInput.value.trim();
  const provider = providerSelect.value;
  localStorage.setItem(USER_PROVIDER_STORAGE, provider);
  if (key) {
    localStorage.setItem(USER_API_KEY_STORAGE, key);
    voiceStatus.innerText = "Aapki API key save ho gayi";
  }
  settingsPanel.classList.add("hidden");
});

clearApiKeyButton.addEventListener('click', () => {
  localStorage.removeItem(USER_API_KEY_STORAGE);
  apiKeyInput.value = "";
  voiceStatus.innerText = "Default key use hogi";
});

// ---- Voice Input (Toggle On/Off, Always Listening while ON) ----
let recognition;
let isListening = false;
let isSpeaking = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = currentLang;
  recognition.interimResults = false;
  recognition.continuous = true;

  recognition.onresult = (event) => {
    if (isSpeaking) return;
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
    try { recognition.abort(); } catch (e) {}
  }

  function pauseRecognitionForSpeaking() {
    if (recognition) {
      try { recognition.abort(); } catch (e) {}
    }
  }

  function resumeRecognitionAfterSpeaking() {
    if (isListening) {
      setTimeout(() => {
        if (isListening && !isSpeaking) {
          try { recognition.start(); } catch (e) {}
          voiceStatus.innerText = "JARVIS is listening...";
        }
      }, 600);
    } else {
      voiceStatus.innerText = "Mic is off";
    }
  }

  function toggleLanguage() {
    if (currentLang === "hi-IN") {
      currentLang = "en-IN";
      langToggleButton.innerText = "EN";
    } else {
      currentLang = "hi-IN";
      langToggleButton.innerText = "हिं";
    }
    recognition.lang = currentLang;

    if (isListening) {
      try { recognition.abort(); } catch (e) {}
      setTimeout(() => {
        try { recognition.start(); } catch (e) {}
      }, 300);
    }
  }

  langToggleButton.addEventListener('click', toggleLanguage);

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
  function pauseRecognitionForSpeaking() {}
  function resumeRecognitionAfterSpeaking() {}
}

// ---- Voice Output (Text to Speech) - Best available voice chuno ----
let availableVoices = [];

function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
}

if ('speechSynthesis' in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickBestVoice(langCode) {
  if (!availableVoices || availableVoices.length === 0) return null;

  // langCode jaise "hi-IN" ya "en-IN" ke exact match dhoondo
  let matches = availableVoices.filter(v => v.lang === langCode);

  // Agar exact match nahi mila, to language ka base match dhoondo (jaise "hi")
  if (matches.length === 0) {
    const baseLang = langCode.split('-')[0];
    matches = availableVoices.filter(v => v.lang.startsWith(baseLang));
  }

  if (matches.length === 0) return null;

  // Google/Natural/Premium jaisi behtar quality wali voice ko priority do
  const preferredKeywords = ["Google", "Natural", "Premium", "Neural", "Wavenet"];
  for (const keyword of preferredKeywords) {
    const found = matches.find(v => v.name.includes(keyword));
    if (found) return found;
  }

  // Kuch na mile to jo bhi pehli match mili wahi use karo
  return matches[0];
}

function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const cleanText = text.replace(/<[^>]*>/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = currentLang;

    const bestVoice = pickBestVoice(currentLang);
    if (bestVoice) {
      utterance.voice = bestVoice;
    }

    utterance.rate = 1;
    utterance.pitch = 1;

    isSpeaking = true;

    utterance.onend = () => {
      isSpeaking = false;
      resumeRecognitionAfterSpeaking();
    };

    utterance.onerror = () => {
      isSpeaking = false;
      resumeRecognitionAfterSpeaking();
    };

    window.speechSynthesis.speak(utterance);
  }
}

// Initialize
if (conversations.length === 0) startNewChat();
else { activeConversationId = conversations[0].id; renderMessages(); }