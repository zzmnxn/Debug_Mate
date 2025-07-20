import { diagnoseError, debugHint, loopCheck, suggestFix } from "./handlers";
import typia from "typia";

export class ErrorDiagnosisService {
  async diagnoseError({ errorMessage }: { errorMessage: string }) {
    return diagnoseError({ errorMessage });
  }
  async debugHint({ output }: { output: string }) {
    return debugHint({ output });
  }
  async loopCheck({ code }: { code: string }) {
    return loopCheck({ code });
  }

  async suggestFix({ code }: { code: string }) {
    return suggestFix({ code });
  }

}