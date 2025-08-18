/**
 * 변수 추적을 위한 프롬프트 생성
 */
export function buildTraceVarPrompt(code: string, userQuery: string): string {
  return `
  // Analyze the following C code and the user's question to trace the flow of variables.
  Analyze the following C code and the user's question to trace the flow of variables.

  **User Question:**
  "${userQuery}"

  **Code:**
  \`\`\`
  ${code}
  \`\`\`

  **Instructions:**
  1. Analyze the user's natural language query to understand their intent. If there are typos, infer the most likely correct variable or function name.
  2. **Only trace the flow of the variable(s) explicitly mentioned in the user's question.** If no specific variable is mentioned in the query, then analyze all key variables in the code.
  3. If the query mentions a **struct, union, or enum** variable, analyze it as follows:
    - **struct/union (by variable name)**: If the user asks to trace the entire struct or union variable (e.g., "trace myStruct"), analyze and present the flow of **all of its member variables together**.
    - **struct/union (by specific member)**: If the user asks to trace a specific member (e.g., "trace myStruct.age"), trace the flow of **only that member**.
    - **enum**: Trace the flow of the enum variable and specify which constant value it holds at each point.
  4. For all pointer-to-pointer variables (e.g., int **ptr), analyze its value (the address it holds) and the value of the variable it points to.
  5. If the user's question is not related to variable tracing, respond with "The question is not related to variable tracing."
  6. Respond in Korean.

  Format your response in the following structure:

  Variable Name: variable_name (in function_name function)
  For each variable, include the following section headers, **and you must output them with the brackets exactly as they are**:
   [Initial Value] Describe the initial value of the variable(Output only the numeric or literal value (no explanation))
   [Update Process] Summarize the changes step-by-step using short bullet points (use "-" at the beginning of each line, avoid long sentences)
   [Final Value] Indicate the final value stored in the variable(Output only the final value (no explanation))
  
  Do not add anything outside this format.
  Write all section titles in English (Variable Name, Initial Value, Update Process, Final Value), and provide the explanations in Korean.
`.trim();
}
