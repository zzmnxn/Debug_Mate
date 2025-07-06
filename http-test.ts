// Node.js 18+ 에서는 fetch가 내장되어 있습니다

const API_BASE = "http://localhost:3000/api";

async function testErrorDiagnosis() {
  console.log("=== HTTP API 에러 진단 테스트 ===\n");

  // 1. TypeScript 오류 진단 테스트
  console.log("1. TypeScript 오류 진단 테스트");
  try {
    const tsResponse = await fetch(`${API_BASE}/diagnose`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        compilerOutput: `src/index.ts:15:7 - error TS2304: Cannot find name 'undefinedVariable'.
15   console.log(undefinedVariable);
        ~~~~~~~~~~~~~~~`,
        filePath: "src/index.ts",
        language: "typescript"
      })
    });

    const tsResult = await tsResponse.json();
    console.log("✅ TypeScript 진단 결과:");
    console.log(JSON.stringify(tsResult, null, 2));
  } catch (error) {
    console.error("❌ TypeScript 테스트 실패:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // 2. Python 오류 진단 테스트
  console.log("2. Python 오류 진단 테스트");
  try {
    const pythonResponse = await fetch(`${API_BASE}/diagnose`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        compilerOutput: `  File "test.py", line 5
    print("Hello World"
                ^
SyntaxError: invalid syntax`,
        filePath: "test.py",
        language: "python"
      })
    });

    const pythonResult = await pythonResponse.json();
    console.log("✅ Python 진단 결과:");
    console.log(JSON.stringify(pythonResult, null, 2));
  } catch (error) {
    console.error("❌ Python 테스트 실패:", error);
  }

  console.log("\n" + "=".repeat(50) + "\n");

  // 3. 모든 진단 기록 조회
  console.log("3. 모든 진단 기록 조회");
  try {
    const indexResponse = await fetch(`${API_BASE}/diagnoses`);
    const indexResult = await indexResponse.json();
    console.log("✅ 진단 기록 목록:");
    console.log(JSON.stringify(indexResult, null, 2));
  } catch (error) {
    console.error("❌ 진단 기록 조회 실패:", error);
  }
}

// 테스트 실행
testErrorDiagnosis().catch(console.error); 