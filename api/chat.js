// Vercel Serverless Function - AI Chat Proxy (DeepSeek)
// 路径: POST /api/chat

module.exports = async (req, res) => {
  // 只接受 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed', message: 'POST only' });
  }

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { messages, model, max_tokens, temperature } = req.body || {};

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'invalid_request', message: 'messages required' });
  }

  const apiKey = process.env.DEEPSEEK_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'no_api_key', message: 'DEEPSEEK_KEY not configured' });
  }

  try {
    const upstream = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      body: JSON.stringify({
        model: model || 'deepseek-chat',
        messages,
        max_tokens: max_tokens || 150,
        temperature: temperature || 0.8,
        stream: false
      })
    });

    const text = await upstream.text();
    let data;
    try { data = JSON.parse(text); }
    catch (e) { data = { error: { message: text } }; }

    if (!upstream.ok) {
      console.error('[DeepSeek Error] ' + upstream.status + ':', data);
      return res.status(upstream.status).json({
        error: 'upstream_error',
        message: (data.error && data.error.message) || 'AI service error',
        upstream: data
      });
    }

    return res.json(data);
  } catch (err) {
    console.error('[Proxy Error]', err);
    return res.status(500).json({
      error: 'proxy_error',
      message: 'Proxy error: ' + err.message
    });
  }
};
