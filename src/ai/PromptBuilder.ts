import { CompilerError, CompilerWarning } from '../parsers/CompilerResultParser';

export function buildAfterDebugPrompt(
  logSummary: string,
  errors: CompilerError[],
  warnings: CompilerWarning[],
  executionOutput?: string
): string {
  // MAX_ITEMS 제한을 제거하여 모든 에러와 경고를 표시
  const formatError = (e: CompilerError, i: number) => {
    const location = e.file ? ` at ${e.file}:${e.line || '?'}:${e.column || '?'}` : '';
    const code = e.code ? ` (${e.code})` : '';
    return `[Error ${i + 1}] (${e.severity.toUpperCase()} - ${e.type})${code} ${e.message}${location}`;
  };

  const formatWarning = (w: CompilerWarning, i: number) => {
    const location = w.file ? ` at ${w.file}:${w.line || '?'}:${w.column || '?'}` : '';
    const code = w.code ? ` (${w.code})` : '';
    return `[Warning ${i + 1}] (${w.type})${code} ${w.message}${location}`;
  };

  // 에러와 경고를 심각도별로 정렬
  const sortedErrors = [...errors].sort((a, b) => {
    if (a.severity === 'fatal' && b.severity !== 'fatal') return -1;
    if (a.severity !== 'fatal' && b.severity === 'fatal') return 1;
    return 0;
  });
// 모든 에러와 경고를 포함 (제한 없음)
  const errorText = sortedErrors.map(formatError).join('\n');
  const warningText = warnings.map(formatWarning).join('\n');
  return `
You are a senior compiler engineer and static analysis expert with 15+ years of experience in C/C++ development and debugging.
Your task is to analyze the compiler output and runtime log from a C/C++ program and determine whether the code has any critical problems that need to be addressed before deployment.

=== Summary ===
${logSummary}

=== Compiler Errors ===
${errorText || 'None'}

=== Compiler Warnings ===
${warningText || 'None'}

${executionOutput ? `=== Program Execution Output ===
${executionOutput}` : ''}

IMPORTANT NOTES:
- If issues are present: State the most likely cause and suggest a concrete fix (1–2 lines).
- Do NOT guess beyond the given log. If something is unclear, say so briefly.
- Prioritize critical issues that could cause crashes, memory corruption, or undefined behavior.

IMPORTANT: Please respond in Korean, but keep the [Result], [Reason], and [Suggestion] section headers in English.

Format your response in the following structure:

[Result] {Short message: "O" or "X"}
[Reason] {Brief explanation of why - in Korean}
[Suggestion] {Fix or say "Suggestion 없음" if none needed - in Korean}
Do not add anything outside this format.

=== Analysis Rules ===
- If error type is "undeclared" or message contains "undeclared", always treat as critical.
- If a warning or message contains "memory leak", "leaked", "AddressSanitizer", or "LeakSanitizer", treat it as a critical issue.
- For unused variable warnings, if variable name is vague (like 'temp'), suggest renaming or removal.
- If runtime log contains "runtime error", "segmentation fault", "core dumped", or "undefined behavior", treat as critical.
- If runtime log contains "runtime error", check if it follows a dangerous cast (e.g., int to pointer). 
- If the summary or runtime log contains "[Hint] loopCheck() 함수를 사용하여 루프 조건을 검토해보세요.", do NOT analyze the cause. Just output the hint exactly as the Suggestion.
- If execution timed out, suggest using loopCheck() function to analyze loop conditions.
- For memory-related errors, always suggest checking pointer operations and memory allocation/deallocation.


`.trim();
}

export function buildLoopTargetSelectionPrompt(params: {
  code: string;
  loopListText: string; // "Available loops in the code:" 뒤에 들어갈 루프 목록 문자열
  target: string;
  details: any;
  totalLoops: number;
}): string {
  const { code, loopListText, target, details, totalLoops } = params;

  return `You are analyzing C code loops. The user wants to analyze specific loops using natural language.

Full code context:
\`\`\`c
${code.split('\n').map((line, idx) => `${idx + 1}: ${line}`).join('\n')}
\`\`\`

Available loops in the code:
${loopListText}

User requested target: "${target}"
User details: ${JSON.stringify(details)}

**SPECIAL HANDLING FOR POSITION TARGETS:**
- If target is "first": Return [1] (first loop)
- If target is "second": Return [2] (second loop)  
- If target is "third": Return [3] (third loop)
- If target is "fourth": Return [4] (fourth loop)
- If target is "fifth": Return [5] (fifth loop)
- If target is "last": Return [${totalLoops}] (last loop)

Please identify which specific loops the user wants to analyze. Consider various Korean expressions like:
- 첫번째, 첫번쨰, 하나번째, 처음, 1번째, 1st, 맨 앞, 맨앞, 맨 처음, 맨처음, 가장 앞, 가장앞, 앞쪽, 앞쪽에, 앞에, 앞에 있는, 앞에있는 (first loop)
- 두번째, 둘째, 2번째, 2nd (second loop)
- 세번째, 셋째, 3번째, 3rd (third loop)
- 마지막, 끝, last, 맨 뒤, 맨뒤, 맨 끝, 맨끝, 가장 뒤, 가장뒤, 가장 끝, 가장끝, 뒤쪽, 뒤쪽에, 뒤에, 뒤에 있는, 뒤에있는 (last loop)
- for문만, for문, for루프 (ALL for loops)
- while문만, while문, while루프 (ALL while loops)  
- do-while문만, do-while문, dowhile문, 두와일문, 두와일, do while문 (ALL do-while loops)
- testloop21함수, main함수 (loops INSIDE specific function only)
- 23번째 줄, 줄 45, line 30 (loops at specific line number)

IMPORTANT: 
- If the user wants "for문만" or similar, return ALL for loop indices
- If the user wants "while문만" or similar, return ALL while loop indices
- If the user wants "do-while문만", "dowhile문", "두와일문" or similar, return ALL do-while loop indices
- If the user wants a specific position (첫번째, 2번째, 맨 앞, 맨 뒤), return that specific loop
- If the user wants loops in a specific function (함수명함수), return loops in that function by analyzing the full code context
- If the user wants loops at a specific line (N번째 줄), return loops at or near that line by checking line numbers

**CRITICAL**: 
- When identifying for loops, look for ANY line that starts with "for" or contains "for (" pattern. Do not skip any for loops.
- When user requests "함수명함수" (e.g., "testloop21함수"), ONLY return loops that are INSIDE that specific function, not loops with similar names or patterns.
- Analyze the code structure to identify function boundaries and only include loops within the requested function.

Return only a JSON array of loop indices (1-based) that match the user's request:
Example: [1,3,4,5,6,7,8,14,15,18,19,21,22,23] for all for loops (including loop 18 which is "for (i = 0; i < 2;)")
Example: [1] for first loop only
Example: [2,4] for all while loops if loops 2 and 4 are while loops
Example: [3,5,7] for loops inside "testloop21함수" only (if loops 3, 5, 7 are inside that function)
If you cannot determine specific loops, return []`;
}

export function buildLoopBatchAnalysisPrompt(loopAnalysisData: { number: string; code: string }[]): string {
  return `Analyze ONLY the provided loops for termination issues. 

IMPORTANT: You are analyzing ${loopAnalysisData.length} loop(s) only. Do NOT analyze any other loops.

For problems, format your response with proper line breaks and tabs for readability.
For no issues, use "문제가 없습니다." in Korean. 
Respond in Korean only.

Expected output format:
- 반복문 X
\t무한 루프입니다. 조건이 항상 참이므로 종료되지 않습니다.
\t수정 제안 1: 구체적인 수정 방법
\t수정 제안 2: 대안적인 수정 방법 (필요한 경우)

Do NOT include any instruction text in your response. Only provide the analysis results.

CRITICAL REQUIREMENTS:
1. Analyze loops in EXACTLY the order they are provided below
2. Each loop should appear ONLY ONCE in your response
3. Use the exact loop numbers as shown below
4. Do NOT skip any loops or analyze loops not in the list

Loops to analyze (in order):
${loopAnalysisData.map((item, index) => `${index + 1}. Loop ${item.number}:\n${item.code}`).join('\n\n')}

Analyze each loop in the exact order shown above. Do NOT mention any other loops.`;
}

export function buildTraceVarPrompt(code: string, userQuery: string): string {
  return `
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

export function buildBeforeDebugPrompt(slimCode: string, slimLog: string): string {
  return `
You are a C language debugging expert.
The user has provided complete code and gcc compilation/execution logs.

🔹 Code Content:
\`\`\`c
${slimCode}
\`\`\`

🔹 GCC Log:
\`\`\`
${slimLog}
\`\`\`

Based on this information, please analyze in the following format (respond in Korean):

[Result] "문제 있음" or "문제 없음"
[Reason] Main cause or analysis reason
[Suggestion] Core fix suggestion (1-2 lines)
`.trim();
}

export function buildStaticSnippetAnalysisPrompt(codeSnippet: string): string {
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
