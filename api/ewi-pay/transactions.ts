import type { IncomingMessage, ServerResponse } from 'http';
import { getEwiPayConfig } from './_config';

function setCorsHeaders(res: ServerResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');
  res.setHeader('Cache-Control', 'no-store');
}

export default async function handler(req: IncomingMessage & { method?: string }, res: ServerResponse) {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  const sendJson = (code: number, payload: any) => {
    res.statusCode = code;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(payload));
  };
  if (req.method !== 'GET') return sendJson(405, { success: false, message: 'Method not allowed' });
  try {
    const cfg = await getEwiPayConfig();
    const methodFilter = String((req as any).query?.method || '').toLowerCase();
    const rawSources: Array<{ url: string; forcedMethod?: 'bKash' | 'Nagad' }> = [
      { url: cfg.bkashTransactionsUrl, forcedMethod: 'bKash' },
      { url: cfg.nagadTransactionsUrl, forcedMethod: 'Nagad' },
      { url: `${cfg.baseUrl}/api/v1/merchant/transactions` }
    ];
    const sources = rawSources.filter((s) => {
      if (!methodFilter) return true;
      if (methodFilter === 'bkash') return s.forcedMethod === 'bKash' || !s.forcedMethod;
      if (methodFilter === 'nagad') return s.forcedMethod === 'Nagad' || !s.forcedMethod;
      return true;
    });

    const results = await Promise.all(
      sources.map(async ({ url, forcedMethod }) => {
        try {
          const upRes = await fetch(url, { headers: { 'x-api-key': cfg.apiKey } });
          if (!upRes.ok) return [];
          const json = await upRes.json().catch(() => ({}));
          const rows = Array.isArray(json?.transactions)
            ? json.transactions
            : Array.isArray(json?.data)
            ? json.data
            : Array.isArray(json)
            ? json
            : [];
          return rows.map((item: any) => {
            if (!item || typeof item !== 'object') return item;
            const rawMethod = String(item.method || item.wallet || item.provider || forcedMethod || '').toLowerCase();
            const normMethod =
              forcedMethod ||
              (rawMethod.includes('nagad') ? 'Nagad' : rawMethod.includes('bkash') ? 'bKash' : item.method);
            return { ...item, method: normMethod || item.method };
          });
        } catch {
          return [];
        }
      })
    );
    const mergedMap = new Map<string, any>();
    results.flat().forEach((item: any) => {
      if (!item) return;
      const baseId = String(item.id || item.deposit_id || item.depositId || item.sessionId || item.trx_id || item.trxId || '');
      if (!baseId) return;
      const methodKey = String(item.method || 'generic').toLowerCase();
      const mapKey = `${methodKey}:${baseId}`;
      const prev = mergedMap.get(mapKey) || {};
      mergedMap.set(mapKey, { ...prev, ...item });
    });
    return sendJson(200, { success: true, transactions: Array.from(mergedMap.values()) });
  } catch (err: any) {
    return sendJson(502, { success: false, transactions: [], message: err?.message || 'Gateway fetch error' });
  }
}
