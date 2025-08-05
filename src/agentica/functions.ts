import { CompilerError, CompilerWarning } from "../parsing/compilerResultParser";
import { loopCheck, testBreak, traceVar, afterDebug, markErrors, afterDebugFromCode } from "./handlers";
import typia from "typia";

export class ErrorDiagnosisService {
  
  async loopCheck({ code }: { code: string }) {
    return loopCheck({ code });
  }
  async traceVar({ code }: { code: string }) {
    return traceVar({ code });
  }
  async testBreak({ codeSnippet }: { codeSnippet: string }) {
    return testBreak({ codeSnippet });
  }
  async afterDebugFromCode({ code, userQuery }: { code: string, userQuery: string }) {
    const analysis = await afterDebugFromCode(code, userQuery);
    const markedFilePath = await markErrors("input.c", code, [], []);
    return { analysis, markedFilePath };
  }
  async markErrors({ originalFilePath, code, errors, warnings }: { originalFilePath: string, code: string, errors: CompilerError[], warnings: CompilerWarning[] }) {
    return markErrors(originalFilePath, code, errors, warnings);
  }
}