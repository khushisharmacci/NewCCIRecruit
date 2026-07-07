import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  try {
    console.log("BODY:", req.body);

    const { prompt } = req.body;

    console.log("PROMPT:", prompt);

    if (!prompt) {
      return res.status(400).json({
        error: "No prompt received",
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent({
  contents: [
    {
      role: "user",
      parts: [
        {
          text: prompt,
        },
      ],
    },
  ],
});
    const text = result.response.text();

    return res.status(200).json({
      result: text,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: error.message,
    });
  }
}