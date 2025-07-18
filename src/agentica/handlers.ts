import { SGlobal } from "../SGlobal";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || ""); 

export async function diagnoseError({ errorMessage }: { errorMessage: string }) {
  const prompt = `Explain the cause of the following compiler error message and suggest the reason and a fix.\n\n${errorMessage}`; 
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return { explanation: result.response.text() };
}

export async function debugHint({ output }: { output: string }) {
  const prompt = `Analyze the following program output, infer what might be wrong, and suggest a debugging hint.\n\n${output}`;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return { hint: result.response.text() };
}

// uuyeong's hw
export async function loopCheck({ code }: { code: string }) {
  const prompt = `Analyze the following loop and determine if the termination condition is valid.
  If it's not valid, explain the issue briefly and suggest how to fix it. Respond in Korean. Keep the explanation short and intuitive. \`\`\`${code}\`\`\``;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return { result: result.response.text() };
}