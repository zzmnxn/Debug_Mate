import { CompilerError, CompilerWarning } from "../parsing/compilerResultParser";
import { loopCheck, testBreak, traceVar, afterDebugFromCode, markErrors, inProgressDebug, beforeDebug } from "./handlers";
import typia from "typia";

export class ErrorDiagnosisService {
  
  async loopCheck({ code }: { code: string }) {
    return loopCheck({ code });
  }
  async traceVar({ code, userQuery }: { code: string; userQuery: string }) {
    return traceVar({ code, userQuery });
  }
  async testBreak({ codeSnippet }: { codeSnippet: string }) {
    return testBreak({ codeSnippet });
  }
   async afterDebugFromCode({ code, originalFileName }: { code: string, originalFileName?: string }) {
    return afterDebugFromCode(code, originalFileName);
  }
  async markErrors({ originalFilePath, code, errors, warnings }: { originalFilePath: string, code: string, errors: CompilerError[], warnings: CompilerWarning[] }) {
    return markErrors(originalFilePath, code, errors, warnings);
  }
  async beforeDebug({ code }: { code: string }) {
    return beforeDebug({ code });
  }
  async inProgressDebug({ code }: { code: string }) {
    return inProgressDebug(code);
  }


}