import type { IncomingMessage, ServerResponse } from 'http';

function extractClientIp(req: IncomingMessage): string {
  const xff = req.headers['x-forwarded-for'];
  let ip = '';
  if (typeof xff === 'string' && xff.trim()) {
    ip = xff.split(',')[0].trim();
  } else if (Array.isArray(xff) && xff.length > 0) {
    ip = String(xff[0]).split(',')[0].trim();
  } else if (typeof req.headers['cf-connecting-ip'] === 'string') {
    ip = req.headers['cf-connecting-ip'].trim();
  } else if (typeof req.headers['x-real-ip'] === 'string') {
    ip = req.headers['x-real-ip'].trim();
  } else if (req.socket?.remoteAddress) {
    ip = req.socket.remoteAddress;
  }
  return ip.replace(/^::ffff:/, '') || 'Unknown';
}

export default async function handler(req: IncomingMessage & { method?: string; body?: any }, res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  const ip = extractClientIp(req);
  const nowMs = Date.now();
  res.end(
    JSON.stringify({
      success: true,
      detectedIp: ip,
      enteredAtMs: nowMs,
      enteredAt: new Date(nowMs).toLocaleString('en-GB'),
      logs: []
    })
  );
}
