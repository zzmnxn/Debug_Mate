import WebSocket from "ws";

const socket = new WebSocket("ws://localhost:3000");

socket.on("open", () => {
  console.log("✅ WebSocket 연결됨");

  console.log("=== 에러 진단 서비스 테스트 ===\n");

  // TypeScript 오류 테스트
  console.log("1. TypeScript 오류 진단 테스트");
  const tsErrorRequest = {
    id: "1",
    method: "errorDiagnosis.diagnoseError",
    params: {
      input: {
        compilerOutput: `src/index.ts:15:7 - error TS2304: Cannot find name 'undefinedVariable'.
15   console.log(undefinedVariable);
        ~~~~~~~~~~~~~~~`,
        filePath: "src/index.ts",
        language: "typescript"
      }
    }
  };

  socket.send(JSON.stringify(tsErrorRequest));
});

let requestCount = 0;
const totalRequests = 4;

socket.on("message", (data) => {
  const response = JSON.parse(data.toString());
  console.log("📨 응답 받음:", response);
  
  requestCount++;
  
  if (requestCount === 1) {
    // Python 오류 테스트
    console.log("\n2. Python 오류 진단 테스트");
    const pythonErrorRequest = {
      id: "2",
      method: "errorDiagnosis.diagnoseError",
      params: {
        input: {
          compilerOutput: `  File "test.py", line 5
    print("Hello World"
                ^
SyntaxError: invalid syntax`,
          filePath: "test.py",
          language: "python"
        }
      }
    };
    socket.send(JSON.stringify(pythonErrorRequest));
  } else if (requestCount === 2) {
    // C++ 오류 테스트
    console.log("\n3. C++ 오류 진단 테스트");
    const cppErrorRequest = {
      id: "3",
      method: "errorDiagnosis.diagnoseError",
      params: {
        input: {
          compilerOutput: `main.cpp: In function 'int main()':
main.cpp:10: error: 'undefinedFunction' was not declared in this scope
     undefinedFunction();
     ^~~~~~~~~~~~~~~~`,
          filePath: "main.cpp",
          language: "cpp"
        }
      }
    };
    socket.send(JSON.stringify(cppErrorRequest));
  } else if (requestCount === 3) {
    // Java 오류 테스트
    console.log("\n4. Java 오류 진단 테스트");
    const javaErrorRequest = {
      id: "4",
      method: "errorDiagnosis.diagnoseError",
      params: {
        input: {
          compilerOutput: `Test.java:5: error: cannot find symbol
        System.out.println(undefinedVariable);
                           ^
  symbol:   variable undefinedVariable
  location: class Test`,
          filePath: "Test.java",
          language: "java"
        }
      }
    };
    socket.send(JSON.stringify(javaErrorRequest));
  } else if (requestCount === 4) {
    // 모든 진단 기록 조회
    console.log("\n5. 모든 진단 기록 조회");
    const indexRequest = {
      id: "5",
      method: "errorDiagnosis.index",
      params: {}
    };
    socket.send(JSON.stringify(indexRequest));
  } else {
    console.log("\n✅ 모든 테스트 완료");
    socket.close();
  }
});

socket.on("error", (err) => {
  console.error("❌ 오류 발생:", err);
});

socket.on("close", () => {
  console.log("🔌 WebSocket 연결 종료");
}); 