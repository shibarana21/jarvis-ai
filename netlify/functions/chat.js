exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { messages } = JSON.parse(event.body);
    const API_KEY = process.env.GEMINI_API_KEY;

    // Gemini API calling using built-in fetch (Node 18+)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`, {
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

    if (!data.candidates || !data.candidates[0]) {
      throw new Error(data.error?.message || "Gemini API Error");
    }

    const aiMessage = data.candidates[0].content.parts[0].text;

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