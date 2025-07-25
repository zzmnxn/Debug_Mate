import { CompilerError, CompilerWarning } from "../parsing/compilerResultParser";
import { loopCheck, testBreak, traceVar, afterDebug } from "./handlers";
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
  async afterDebug({ logSummary, errors, warnings }: { logSummary: string, errors: CompilerError[], warnings: CompilerWarning[] }) {
    return afterDebug(logSummary, errors, warnings);
  }
}