import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers"; 
import { RunnableSequence } from "@langchain/core/runnables";       


export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }


  try {
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Get API key from environment variable
    const apiKey = process.env.GOOGLE_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Initialize the LLM with Gemini 1.5 Flash
    const llm = new ChatGoogleGenerativeAI({
      apiKey,
      model: "gemini-1.5-flash",
      maxOutputTokens: 128,
    });

    // Create a prompt template for title generation
    const titlePrompt = PromptTemplate.fromTemplate(`
      You are an AI assistant that generates concise, descriptive titles.
      
      ### INSTRUCTIONS:
      - Create a short, meaningful title for the following note
      - The title should be 2-7 words
      - Capture the main topic or purpose of the note
      - Be specific yet concise
      - Do not use quotes around the title
      - Return just the title, nothing else
      
      ### NOTE:
      {text}
      
      ### TITLE:
    `);

    // Create a chain
    const chain = RunnableSequence.from([
      titlePrompt,
      llm,
      new StringOutputParser(),
    ]);

    // Run the chain with the text
    const title = await chain.invoke({
      text,
    });

    return res.status(200).json({ title: title.trim() });
  } catch (error) {
    console.error('Error in generate-title API:', error);
    return res.status(500).json({ error: 'Failed to generate title' });
  }
}
