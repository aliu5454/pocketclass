import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence } from "@langchain/core/runnables";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: "Text is required" });
    }

    // Get API key from environment variable
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: "API key not configured" });
    }
    // Initialize the LLM with Gemini 1.5 Flash
    const llm = new ChatGoogleGenerativeAI({
      apiKey,
      model: "gemini-1.5-flash",
    });

    // Create a prompt template for summarization
    const summarizePrompt = PromptTemplate.fromTemplate(`
  You are an AI assistant that summarizes rich HTML content.

  ### INSTRUCTIONS:
  - Summarize the following HTML content
  - Keep formatting (like bold, italics, images, lists)
  - Retain all <img> tags as-is
  - Return the result as valid HTML
  - Ensure that you add any Image or iframe tags as they are without altering them 

  ### HTML INPUT(Do not add html at top):
  {text}

  ### SUMMARIZED HTML OUTPUT:
`);

    // Create a chain
    const chain = RunnableSequence.from([
      summarizePrompt,
      llm,
      new StringOutputParser(),
    ]);

    // Run the chain with the text
    const summary = await chain.invoke({
      text,
    });

    // Remove ```html from the start if present and ``` at the end
    const cleanedSummary = summary
      .replace(/^```html\s*/, "")
      .replace(/```[\s\n]*$/, "")
      .trim();
    return res.status(200).json({ summary: cleanedSummary });
  } catch (error) {
    console.error("Error in summarize API:", error);
    return res.status(500).json({ error: "Failed to summarize text" });
  }
}
