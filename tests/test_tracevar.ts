import { traceVar } from "../src/agentica/handlers"; 

export async function runTraceVar(code: string) {
    const { variableTrace } = await traceVar({ code });
    console.log("🔍 [traceVar 결과]");
    console.log(variableTrace);
}