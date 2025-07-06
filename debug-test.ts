import WebSocket from "ws";

const socket = new WebSocket("ws://localhost:3000");

socket.on("open", () => {
  console.log("✅ WebSocket 연결됨");

  // 더 간단한 요청으로 테스트
  const testRequest = {
    id: "test1",
    method: "errorDiagnosis.index",
    params: {}
  };

  console.log("📤 요청 전송:", JSON.stringify(testRequest, null, 2));
  socket.send(JSON.stringify(testRequest));
});

socket.on("message", (data) => {
  console.log("📨 응답 받음:");
  console.log("Raw data:", data.toString());
  
  try {
    const response = JSON.parse(data.toString());
    console.log("✅ JSON 파싱 성공:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.log("❌ JSON 파싱 실패:", error);
    console.log("Raw data as string:", data.toString());
  }
  
  socket.close();
});

socket.on("error", (err) => {
  console.error("❌ WebSocket 오류:", err);
});

socket.on("close", (code, reason) => {
  console.log("🔌 WebSocket 연결 종료");
  console.log("Close code:", code);
  console.log("Close reason:", reason);
}); 