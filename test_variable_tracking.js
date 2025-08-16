const { VariableHandler } = require("./lib/handlers/VariableHandler");
const { AnalysisService } = require("./lib/core/AnalysisService");
const { CodeUtils } = require("./lib/utils/CodeUtils");
const { IntentParser } = require("./lib/parsers/IntentParser");
const { QueryParser } = require("./lib/parsers/QueryParser");
const fs = require("fs");

async function testVariableTracking() {
  console.log("🔍 변수 추적 관련 디버깅 함수 테스트 시작\n");

  try {
    // test.c 파일 읽기 (복잡한 변수 구조 포함)
    const testCode = fs.readFileSync("./test.c", "utf8");
    console.log("📁 test.c 파일을 성공적으로 읽었습니다.\n");

    // 1. CodeUtils 변수 추출 테스트
    console.log("1️⃣ CodeUtils 변수 추출 테스트...");
    const variables = CodeUtils.extractVariables(testCode);
    console.log("발견된 변수들:", variables);
    console.log("변수 개수:", variables.length);

    const functions = CodeUtils.extractFunctionNames(testCode);
    console.log("발견된 함수들:", functions);
    console.log("");

    // 2. QueryParser 변수 쿼리 파싱 테스트
    console.log("2️⃣ QueryParser 변수 쿼리 파싱 테스트...");
    const testQueries = [
      "변수 i 어떻게 변하는지 봐줘",
      "전역 변수 분석해줘",
      "포인터 변수 추적해줘",
      "배열 변수 사용 패턴 분석해줘",
    ];

    testQueries.forEach((query) => {
      const parsed = QueryParser.parseQuery(query);
      console.log(`쿼리: "${query}"`);
      console.log(`  타입: ${parsed.type}`);
      console.log(`  타겟: ${parsed.target || "없음"}`);
      console.log(`  상세:`, parsed.details);
      console.log("");
    });

    // 3. IntentParser 변수 의도 파싱 테스트
    console.log("3️⃣ IntentParser 변수 의도 파싱 테스트...");
    const intentContexts = [
      { code: testCode, userQuery: "변수 i를 추적해줘" },
      { code: testCode, userQuery: "전역 변수 사용 패턴 분석" },
      { code: testCode, userQuery: "포인터 변수 흐름 추적" },
    ];

    for (const context of intentContexts) {
      try {
        const intentResult = await IntentParser.parseIntent(context);
        console.log(`쿼리: "${context.userQuery}"`);
        console.log(`  성공: ${intentResult.success}`);
        console.log(`  도구: ${intentResult.intent.tool}`);
        console.log(`  신뢰도: ${intentResult.confidence}`);
        console.log("");
      } catch (error) {
        console.log(`쿼리: "${context.userQuery}" - 오류: ${error.message}`);
        console.log("");
      }
    }

    // 4. AnalysisService 변수 추적 테스트
    console.log("4️⃣ AnalysisService 변수 추적 테스트...");
    const analysisService = new AnalysisService();

    const variableQueries = [
      "변수 i의 사용 패턴을 분석해줘",
      "전역 변수들의 초기화와 사용을 추적해줘",
      "포인터 변수들의 메모리 관리 분석",
    ];

    for (const query of variableQueries) {
      try {
        const result = await analysisService.traceVariables(testCode, query);
        console.log(`쿼리: "${query}"`);
        console.log(`결과: ${result.substring(0, 100)}...`);
        console.log("");
      } catch (error) {
        console.log(`쿼리: "${query}" - 오류: ${error.message}`);
        console.log("");
      }
    }

    // 5. VariableHandler 통합 테스트
    console.log("5️⃣ VariableHandler 통합 테스트...");

    const handlerQueries = [
      { code: testCode, userQuery: "변수 추적 테스트" },
      { code: testCode, userQuery: "전역 변수 분석" },
      { code: testCode, userQuery: "포인터 변수 흐름" },
    ];

    for (const input of handlerQueries) {
      try {
        const result = await VariableHandler.traceVar(input);
        console.log(`입력: ${input.userQuery}`);
        console.log(`결과: ${result.substring(0, 100)}...`);
        console.log("");
      } catch (error) {
        console.log(`입력: ${input.userQuery} - 오류: ${error.message}`);
        console.log("");
      }
    }

    // 6. 메모리 분석 테스트
    console.log("6️⃣ 메모리 분석 테스트...");
    try {
      const memoryAnalysis = await analysisService.analyzeMemory(
        testCode,
        "메모리 사용 패턴 분석"
      );
      console.log(
        "메모리 분석 결과:",
        memoryAnalysis.substring(0, 100) + "..."
      );
      console.log("");
    } catch (error) {
      console.log("메모리 분석 오류:", error.message);
      console.log("");
    }

    console.log("✅ 변수 추적 관련 디버깅 함수 테스트 완료!");
  } catch (error) {
    console.error("❌ 테스트 중 오류 발생:", error.message);
    console.error(error.stack);
  }
}

// 테스트 실행
testVariableTracking();
