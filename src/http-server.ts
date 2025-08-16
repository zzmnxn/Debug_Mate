import express from 'express';
import cors from 'cors';
import { SGlobal } from './config/SGlobal';

const app = express();
const port = process.env.PORT || 3000;

// CORS 설정
app.use(cors());
app.use(express.json());

// 헬스체크 엔드포인트
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 서버 정보 엔드포인트
app.get('/info', (req, res) => {
  res.json({
    name: 'DebugMate Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// 루트 엔드포인트
app.get('/', (req, res) => {
  res.json({
    message: 'DebugMate Server is running',
    endpoints: {
      health: '/healthz',
      info: '/info'
    }
  });
});

app.listen(port, () => {
  console.log(`HTTP server running on port ${port}`);
  console.log(`Health check available at http://localhost:${port}/healthz`);
});

export default app;
