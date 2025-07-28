import { GoogleGenerativeAI } from "@google/generative-ai";
import { SGlobal } from "../config/SGlobal";

const genAI = new GoogleGenerativeAI(SGlobal.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function diagnoseError({ errorMessage }: { errorMessage: string }) {
  const prompt = `
  Explain the cause of the following compiler error message and suggest the reason and a fix.
  Respond in Korean. Keep the explanation short and intuitive, but clearly explain how to fix the error.
  
  ${errorMessage}
  `;
  const result = await model.generateContent(prompt);
  return { explanation: result.response.text() };
}

export async function debugHint({ output }: { output: string }) {
  const prompt = `\nAnalyze the following program output, infer what might be wrong, and suggest a debugging hint.\nRespond in Korean. Keep the explanation short and intuitive, but clearly explain the likely cause and how to proceed with debugging.\n\n${output}\n`;
  const result = await model.generateContent(prompt);
  return { hint: result.response.text() };
}

export async function loopCheck({ code }: { code: string }) {
  const prompt = `Review the following loop code and determine if its termination condition is valid. If there is an issue, provide a concise explanation and a corrected example snippet. Respond in Korean, focusing on the core insights.\n\n${code}`;
  const result = await model.generateContent(prompt);
  return { result: result.response.text() };
}

export async function suggestFix({ code }: { code: string }) {
  const prompt = `Analyze the following code and explain what is wrong and suggest a way to fix it.\nIf code is correct, answer that there is no particular problem. Respond in Korean. Keep the explanation short and intuitive, but clearly explain.\n\n${code}`;
  const result = await model.generateContent(prompt);
  return { suggestion: result.response.text() };
}

export async function traceVar({ code }: { code: string }) {
  const prompt = `Analyze the following code snippet and trace the flow of variables. For each variable, explain how its value changes throughout the code execution.\nIf a variable is not used, state that. Respond in Korean. Keep the explanation short and intuitive, but clearly explain.\n\n${code}`;
  const result = await model.generateContent(prompt);
  return { variableTrace: result.response.text() };
}

export async function testBreak({ codeSnippet }: { codeSnippet: string }) {
  const prompt = buildPrompt(codeSnippet);
  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();
  try {
    const parsed = JSON.parse(responseText);
    return parsed;
  } catch (err) {
    throw new Error(`Failed to parse model output as JSON:\n${responseText}`);
  }
}

function buildPrompt(codeSnippet: string): string {
  return `\nYou are a static analysis expert specializing in detecting undefined behavior and runtime bugs in C/C++ code.\n\nAnalyze the following code snippet or function and determine whether it is likely to cause any critical issue during execution.\n\nThe issues you must consider include (but are not limited to):\n\n- Null pointer dereference\n- Division by zero\n- Out-of-bound memory access\n- Use of uninitialized variables\n- Use-after-free\n- Memory leaks (e.g., missing free or delete)\n- Infinite or non-terminating loops\n- Recursion with no base case\n- Dangerous type coercion or overflow\n- Dead code or unreachable branches\n\nIf the code is buggy, explain the reason and how to fix it.\nIf the code is safe, explain why it does not cause any problem.\n\n⚠️ Your response must strictly follow this JSON format:\n\n{\n  "isBuggy": true or false,\n  "reason": "string (describe why the code is buggy or safe)",\n  "suggestion": "string (how to fix, or null if safe)"\n}\n\n❗ Do not include anything outside this JSON object.\nDo not add comments, explanations, markdown formatting, or any additional prose.\n\nNow analyze the following code:\n\n${codeSnippet}`;
}