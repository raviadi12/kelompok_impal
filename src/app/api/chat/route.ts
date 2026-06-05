import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(req: Request) {
  try {
    const { chatId, message, history, imageBase64 } = await req.json();

    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set in environment variables" },
        { status: 500 }
      );
    }

    // Convert history to Gemini format
    const formattedHistory = history.map((msg: any) => {
      const parts: any[] = [{ text: msg.text }];
      // If history had images we could include them, but for simplicity we only process current image
      return {
        role: msg.role === "user" ? "user" : "model",
        parts: parts,
      };
    });

    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-latest",
      systemInstruction: 'You are a medicine reminder agent that reads images or just text and returns a response with optionally an action response.\n\nAction response are defined by exactly this format at the very end of your response, wrapped in a JSON array:\n[{"action":"add to reminder database","frequency":"3x_every_day","description":"string","side_effect":"string"}]\n\nAlso you are a helpful and empathetic health assistant. You can answer questions about medicines, healthy habits, and general wellness. Do NOT give formal medical diagnoses. Always recommend consulting a real doctor for serious conditions.'
    });

    // Start chat with history
    const chat = model.startChat({
      history: formattedHistory,
    });

    const messageParts: any[] = [{ text: message }];
    if (imageBase64) {
      const mimeType = imageBase64.substring(5, imageBase64.indexOf(";base64,"));
      const base64Data = imageBase64.split(";base64,")[1];
      messageParts.push({
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      });
    }

    const result = await chat.sendMessage(messageParts);
    let responseText = result.response.text();

    // Parse the JSON array action if exists
    let extractedActions = null;
    const jsonMatch = responseText.match(/\[\s*\{\s*"action"\s*:\s*"add to reminder database"[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      try {
        extractedActions = JSON.parse(jsonMatch[0]);
        // Remove the json string from the responseText to not clutter the chat
        responseText = responseText.replace(jsonMatch[0], '').trim();
      } catch (e) {
        console.error("Failed to parse action JSON", e);
      }
    }

    return NextResponse.json({ text: responseText, extractedActions });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate response", details: error.message },
      { status: 500 }
    );
  }
}
