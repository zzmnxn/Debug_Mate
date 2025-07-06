import WebSocket from "ws";

const socket = new WebSocket("ws://localhost:3001");

socket.on("open", () => {
  console.log("✅ WebSocket 연결됨");

  // 간단한 TypeScript 오류 테스트만 실행
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

  console.log("📤 요청 전송:", JSON.stringify(tsErrorRequest, null, 2));
  socket.send(JSON.stringify(tsErrorRequest));
});

socket.on("message", (data) => {
  console.log("📨 응답 받음:");
  console.log("Raw data:", data.toString());
  
  try {
    const response = JSON.parse(data.toString());
    console.log("Parsed response:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.log("JSON 파싱 실패:", error);
  }
  
  socket.close();
});

socket.on("error", (err) => {
  console.error("❌ 오류 발생:", err);
});

socket.on("close", () => {
  console.log("🔌 WebSocket 연결 종료");
}); 