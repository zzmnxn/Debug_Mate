import { SGlobal } from "../SGlobal";

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY || ""); 

export async function diagnoseError({ errorMessage }: { errorMessage: string }) {
  const prompt = `
  Explain the cause of the following compiler error message and suggest the reason and a fix.
  Respond in Korean. Keep the explanation short and intuitive, but clearly explain how to fix the error.
  
  ${errorMessage}
  `;
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return { explanation: result.response.text() };
}

export async function debugHint({ output }: { output: string }) {
  const prompt = `
Analyze the following program output, infer what might be wrong, and suggest a debugging hint.
Respond in Korean. Keep the explanation short and intuitive, but clearly explain the likely cause and how to proceed with debugging.

${output}
`;

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


// moonjeong's hw
export async function suggestFix({ code }: { code: string }) {
  const prompt = `Analyze the following code and explain what is wrong and suggest a way to fix it.
  If code is correct, answer that there is no particular problem. Respond in Korean. Keep the explanation short and intuitive, but clearly explain. \`\`\`${code}\`\`\``;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return { suggestion: result.response.text() };
}

// sohyeon's hw
export async function traceVar({ code }: { code: string }) {
  const prompt = `Analyze the following code snippet and trace the flow of variables. For each variable, explain how its value changes throughout the code execution.
  If a variable is not used, state that. Respond in Korean. Keep the explanation short and intuitive, but clearly explain. \`\`\`${code}\`\`\``;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  const result = await model.generateContent(prompt);
  return { variableTrace: result.response.text() };
}