import { SGlobal } from "../config/SGlobal";

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
  const prompt = `Review the following loop code and determine if its termination condition is valid. If there is an issue, provide a concise explanation and a corrected example snippet. Respond in Korean, focusing on the core insights.
  \`\`\`${code}\`\`\``;

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

// jimin's hw
export async function testBreak({ codeSnippet }: { codeSnippet: string }) {
  const prompt = buildPrompt(codeSnippet);

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
  return `
You are a static analysis expert specializing in detecting undefined behavior and runtime bugs in C/C++ code.

Analyze the following code snippet or function and determine whether it is likely to cause any critical issue during execution.

The issues you must consider include (but are not limited to):

- Null pointer dereference
- Division by zero
- Out-of-bound memory access
- Use of uninitialized variables
- Use-after-free
- Memory leaks (e.g., missing free or delete)
- Infinite or non-terminating loops
- Recursion with no base case
- Dangerous type coercion or overflow
- Dead code or unreachable branches

If the code is buggy, explain the reason and how to fix it.
If the code is safe, explain why it does not cause any problem.

⚠️ Your response must strictly follow this JSON format:

{
  "isBuggy": true or false,
  "reason": "string (describe why the code is buggy or safe)",
  "suggestion": "string (how to fix, or null if safe)"
}

❗ Do not include anything outside this JSON object.
Do not add comments, explanations, markdown formatting, or any additional prose.

Now analyze the following code:

${codeSnippet}
  `.trim();
}