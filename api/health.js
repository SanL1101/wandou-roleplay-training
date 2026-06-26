// Vercel Serverless Function - 健康检查
// 路径: GET /health

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    ok: true,
    service: 'wandou-roleplay-ai-proxy',
    hasKey: !!process.env.DEEPSEEK_KEY,
    platform: 'vercel',
    time: new Date().toISOString()
  });
}
