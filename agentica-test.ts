import WebSocket from "ws";

const socket = new WebSocket("ws://localhost:3000");

socket.on("open", () => {
  console.log("✅ WebSocket 연결됨");

  // Agentica RPC 형식으로 요청
  const request = {
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

  console.log("📤 Agentica RPC 요청 전송:");
  console.log(JSON.stringify(request, null, 2));
  
  socket.send(JSON.stringify(request));
});

socket.on("message", (data) => {
  console.log("\n📨 응답 받음:");
  const responseText = data.toString();
  console.log("Raw response:", responseText);
  
  try {
    const response = JSON.parse(responseText);
    console.log("\n✅ 파싱된 응답:");
    console.log(JSON.stringify(response, null, 2));
    
    // 응답 분석
    if (response.result) {
      console.log("\n🎯 진단 결과:");
      console.log(`- 오류 유형: ${response.result.errorType}`);
      console.log(`- 진단: ${response.result.diagnosis}`);
      console.log(`- 해결책: ${response.result.solution}`);
      console.log(`- 심각도: ${response.result.severity}`);
    } else if (response.error) {
      console.log("\n❌ 오류 발생:");
      console.log(`- 오류: ${response.error.message}`);
    }
  } catch (error) {
    console.log("\n❌ JSON 파싱 실패:", error);
    console.log("Raw data:", responseText);
  }
  
  socket.close();
});

socket.on("error", (err) => {
  console.error("❌ WebSocket 오류:", err);
});

socket.on("close", () => {
  console.log("\n🔌 WebSocket 연결 종료");
}); 