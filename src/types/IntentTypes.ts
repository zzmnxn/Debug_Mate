export interface ParsedIntent { tool: 'loopCheck'|'traceVar'|'afterDebugFromCode'; target?: string; details?: any; }
export interface MultipleIntents { intents: ParsedIntent[]; isMultiple: boolean; }
