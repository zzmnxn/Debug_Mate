import { loopCheck, diagnoseError } from "./handlers";

export class DebugFunctions {
  /**
   * 코드 내 반복 루프(while/for 등) 문제를 진단합니다.
   */
  async loopCheck({ code }: { code: string }) {
    return loopCheck({ code });
  }

  /**
   * 컴파일/런타임 에러 메시지로 원인을 진단합니다.
   */
  async diagnoseError({ errorMessage }: { errorMessage: string }) {
    return diagnoseError({ errorMessage });
  }
} 