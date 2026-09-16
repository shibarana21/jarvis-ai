
// netlify/functions/chat.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
  // Security: Sirf POST requests allow karein
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { messages } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    // Gemini API calling logic
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }]
        })),
        systemInstruction: {
          parts: [{ text: "You are JARVIS, a helpful AI. Respond in Hindi/Hinglish if asked." }]
        }
      })
    });

    const data = await response.json();
    const aiMessage = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      body: JSON.stringify({ content: aiMessage })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "JARVIS error: " + error.message })
    };
  }
};
