exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { messages, userApiKey, userProvider } = JSON.parse(event.body);
  const provider = (userApiKey && userApiKey.trim()) ? (userProvider || "gemini") : "gemini";
  const API_KEY = (userApiKey && userApiKey.trim()) || process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Koi API key nahi mili" })
    };
  }

  try {
    let aiMessage;

    if (provider === "gemini") {
      aiMessage = await callGemini(API_KEY, messages);
    } else if (provider === "openai") {
      aiMessage = await callOpenAI(API_KEY, messages);
    } else if (provider === "groq") {
      aiMessage = await callGroq(API_KEY, messages);
    } else if (provider === "openrouter") {
      aiMessage = await callOpenRouter(API_KEY, messages);
    } else {
      throw new Error("Unknown provider: " + provider);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ content: aiMessage })
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "JARVIS error: " + error.message })
    };
  }
};

// ---- Google Gemini ----
async function callGemini(apiKey, messages) {
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    }
  );
  const data = await response.json();
  if (!response.ok || !data.candidates || !data.candidates[0]) {
    throw new Error(data.error?.message || "Gemini API error");
  }
  return data.candidates[0].content.parts[0].text;
}

// ---- OpenAI (ChatGPT) ----
async function callOpenAI(apiKey, messages) {
  const chatMessages = messages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content
  }));

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: chatMessages
    })
  });
  const data = await response.json();
  if (!response.ok || !data.choices || !data.choices[0]) {
    throw new Error(data.error?.message || "OpenAI API error");
  }
  return data.choices[0].message.content;
}

// ---- Groq ----
async function callGroq(apiKey, messages) {
  const chatMessages = messages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content
  }));

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: chatMessages
    })
  });
  const data = await response.json();
  if (!response.ok || !data.choices || !data.choices[0]) {
    throw new Error(data.error?.message || "Groq API error");
  }
  return data.choices[0].message.content;
}

// ---- OpenRouter ----
async function callOpenRouter(apiKey, messages) {
  const chatMessages = messages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content
  }));

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.3-70b-instruct:free",
      messages: chatMessages
    })
  });
  const data = await response.json();
  if (!response.ok || !data.choices || !data.choices[0]) {
    throw new Error(data.error?.message || "OpenRouter API error");
  }
  return data.choices[0].message.content;
}