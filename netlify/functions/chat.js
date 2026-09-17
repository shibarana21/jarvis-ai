exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { messages, userApiKey, userProvider, userModel, customEndpoint } = JSON.parse(event.body);
  const hasUserKey = userApiKey && userApiKey.trim();
  const provider = hasUserKey ? (userProvider || "gemini") : "gemini";
  const API_KEY = hasUserKey ? userApiKey : process.env.GEMINI_API_KEY;
  const model = (userModel && userModel.trim()) ? userModel.trim() : null;

  if (!API_KEY) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Koi API key nahi mili" })
    };
  }

  try {
    let aiMessage;

    if (provider === "gemini") {
      aiMessage = await callGemini(API_KEY, messages, model || "gemini-3.6-flash");
    } else if (provider === "openai") {
      aiMessage = await callOpenAICompatible(
        "https://api.openai.com/v1/chat/completions",
        API_KEY, messages, model || "gpt-4o-mini"
      );
    } else if (provider === "groq") {
      aiMessage = await callOpenAICompatible(
        "https://api.groq.com/openai/v1/chat/completions",
        API_KEY, messages, model || "llama-3.3-70b-versatile"
      );
    } else if (provider === "openrouter") {
      aiMessage = await callOpenAICompatible(
        "https://openrouter.ai/api/v1/chat/completions",
        API_KEY, messages, model || "meta-llama/llama-3.3-70b-instruct:free"
      );
    } else if (provider === "custom") {
      if (!customEndpoint || !customEndpoint.trim()) {
        throw new Error("Custom provider ke liye endpoint URL chahiye");
      }
      if (!model) {
        throw new Error("Custom provider ke liye model name chahiye");
      }
      aiMessage = await callOpenAICompatible(customEndpoint.trim(), API_KEY, messages, model);
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
      body: JSON.stringify({ error: error.message })
    };
  }
};

// ---- Google Gemini (apna alag format hai) ----
async function callGemini(apiKey, messages, model) {
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    }
  );
  const data = await response.json();
  if (!response.ok || !data.candidates || !data.candidates[0]) {
    throw new Error(data.error?.message || `Gemini error (model: ${model})`);
  }
  return data.candidates[0].content.parts[0].text;
}

// ---- Ek hi function OpenAI, Groq, OpenRouter, aur Custom (sab OpenAI-compatible) ke liye ----
async function callOpenAICompatible(endpointUrl, apiKey, messages, model) {
  const chatMessages = messages.map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content
  }));

  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: chatMessages
    })
  });

  const data = await response.json();

  if (!response.ok || !data.choices || !data.choices[0]) {
    throw new Error(data.error?.message || `API error (model: ${model}, endpoint: ${endpointUrl})`);
  }

  return data.choices[0].message.content;
}