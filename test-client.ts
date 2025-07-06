import WebSocket from "ws";

const socket = new WebSocket("ws://localhost:3000");

socket.on("open", () => {
  console.log("? WebSocket 연결됨");

  // Agentica 서버에게 기본 요청을 보내는 JSON 구조 (예시)
  const message = {
    id: "1", // 요청 ID
    method: "bbs.create",
    params: {
      input: {
        title: "GPT가 만든 글",
        body: "내용을 자동 생성했습니다.",
        thumbnail: null,
      },
    },
  };

  socket.send(JSON.stringify(message));
});

socket.on("message", (data) => {
  console.log("? 응답 받음:", data.toString());
});

socket.on("error", (err) => {
  console.error("? 에러 발생:", err);
});
