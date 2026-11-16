import { K3Mode, D5Mode, WinGoMode } from '../types';

export type LotteryGameType = 'wingo' | 'k3' | 'd5';

const UPSTREAM_SEGMENTS: Record<LotteryGameType, Record<string, string>> = {
  wingo: {
    '30s': 'WinGo_30S',
    '1m': 'WinGo_1M',
    '3m': 'WinGo_3M',
    '5m': 'WinGo_5M'
  },
  k3: {
    '1m': 'K3_1M',
    '3m': 'K3_3M',
    '5m': 'K3_5M',
    '10m': 'K3_10M'
  },
  d5: {
    '1m': 'D5_1M',
    '3m': 'D5_3M',
    '5m': 'D5_5M',
    '10m': 'D5_10M'
  }
};

const UPSTREAM_PATH: Record<LotteryGameType, string> = {
  wingo: 'WinGo',
  k3: 'K3',
  d5: 'D5'
};

export function parseK3Dice(item: any): [number, number, number] {
  if (Array.isArray(item?.dice) && item.dice.length >= 3) {
    return [
      Math.min(6, Math.max(1, Math.round(Number(item.dice[0]) || 1))),
      Math.min(6, Math.max(1, Math.round(Number(item.dice[1]) || 1))),
      Math.min(6, Math.max(1, Math.round(Number(item.dice[2]) || 1)))
    ];
  }
  const raw = String(item?.number ?? item?.num ?? item?.premium ?? '').trim();
  if (raw.includes(',')) {
    const parts = raw.split(',').map((s) => Number(s.trim()));
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => Number.isFinite(n) && n >= 1 && n <= 6)) {
      return [parts[0], parts[1], parts[2]];
    }
  }
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 3) {
    return [
      Math.min(6, Math.max(1, Number(digits[0]) || 1)),
      Math.min(6, Math.max(1, Number(digits[1]) || 1)),
      Math.min(6, Math.max(1, Number(digits[2]) || 1))
    ];
  }
  return [1, 1, 1];
}

export function parseD5Digits(item: any): [number, number, number, number, number] {
  if (Array.isArray(item?.digits) && item.digits.length >= 5) {
    return [
      Math.min(9, Math.max(0, Math.round(Number(item.digits[0]) || 0))),
      Math.min(9, Math.max(0, Math.round(Number(item.digits[1]) || 0))),
      Math.min(9, Math.max(0, Math.round(Number(item.digits[2]) || 0))),
      Math.min(9, Math.max(0, Math.round(Number(item.digits[3]) || 0))),
      Math.min(9, Math.max(0, Math.round(Number(item.digits[4]) || 0)))
    ];
  }
  const raw = String(item?.number ?? item?.num ?? item?.premium ?? '').trim();
  if (raw.includes(',')) {
    const parts = raw.split(',').map((s) => Number(s.trim()));
    if (parts.length >= 5 && parts.slice(0, 5).every((n) => Number.isFinite(n) && n >= 0 && n <= 9)) {
      return [parts[0], parts[1], parts[2], parts[3], parts[4]];
    }
  }
  const digits = raw.replace(/\D/g, '').padStart(5, '0');
  return [
    Math.min(9, Math.max(0, Number(digits[0]) || 0)),
    Math.min(9, Math.max(0, Number(digits[1]) || 0)),
    Math.min(9, Math.max(0, Number(digits[2]) || 0)),
    Math.min(9, Math.max(0, Number(digits[3]) || 0)),
    Math.min(9, Math.max(0, Number(digits[4]) || 0))
  ];
}

export function nextIssueFromLatest(latestIssue: string): string | null {
  const clean = String(latestIssue || '').trim();
  if (!/^\d+$/.test(clean)) return null;
  try {
    return (BigInt(clean) + 1n).toString();
  } catch {
    return null;
  }
}

export function computeDailyIssueInfo(
  game: LotteryGameType,
  mode: WinGoMode | K3Mode | D5Mode | string,
  timestampMs: number = Date.now()
): { period: string; rem: number; dur: number } {
  const dur =
    mode === '30s' ? 30 : mode === '1m' ? 60 : mode === '3m' ? 180 : mode === '5m' ? 300 : 600;
  const nowSec = Math.floor(timestampMs / 1000);
  const rem = dur - (nowSec % dur);

  const d = new Date(timestampMs);
  const ymd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const utcSecOfDay = d.getUTCHours() * 3600 + d.getUTCMinutes() * 60 + d.getUTCSeconds();
  const dailyIdx = Math.floor(utcSecOfDay / dur) + 1;

  let prefix = '1000';
  let offset = 10000;
  if (game === 'wingo') {
    prefix = '1000';
    offset = mode === '30s' ? 50000 : mode === '1m' ? 10000 : mode === '3m' ? 20000 : 30000;
  } else if (game === 'k3') {
    prefix = mode === '1m' ? '1010' : mode === '3m' ? '1020' : mode === '5m' ? '1030' : '1040';
    offset = 10000;
  } else {
    prefix = mode === '1m' ? '1030' : mode === '3m' ? '1031' : mode === '5m' ? '1032' : '1033';
    offset = 10000;
  }

  return {
    period: `${ymd}${prefix}${String(offset + dailyIdx).padStart(5, '0')}`,
    rem,
    dur
  };
}

export async function fetchLotteryHistory(
  game: LotteryGameType,
  mode: string
): Promise<{ list: any[]; source: 'api' | 'cache' | 'synced' } | null> {
  const segment = UPSTREAM_SEGMENTS[game][mode];
  const gameDir = UPSTREAM_PATH[game];

  if (segment) {
    const directUrl = `https://draw.ar-lottery01.com/${gameDir}/${segment}/GetHistoryIssuePage.json?pageNo=1&pageSize=50&ts=${Date.now()}`;
    try {
      const controller = new AbortController();
      const tId = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(directUrl, { cache: 'no-store', signal: controller.signal });
      clearTimeout(tId);
      if (res.ok) {
        const text = await res.text();
        const trimmed = text.trim();
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          const data = JSON.parse(trimmed);
          let list = data?.data?.list || data?.list || (Array.isArray(data) ? data : null);
          if (Array.isArray(list) && list.length > 0) {
            if (list.length < 50) {
              try {
                const seen = new Set(list.map((x: any) => String(x?.issueNumber || x?.issue || '')));
                for (let p = 2; p <= 5 && list.length < 50; p++) {
                  const pUrl = `https://draw.ar-lottery01.com/${gameDir}/${segment}/GetHistoryIssuePage.json?pageNo=${p}&pageSize=50&ts=${Date.now()}`;
                  const pRes = await fetch(pUrl, { cache: 'no-store' });
                  if (!pRes.ok) break;
                  const pText = await pRes.text();
                  if (!pText.trim().startsWith('{')) break;
                  const pData = JSON.parse(pText);
                  const extra = pData?.data?.list || pData?.list || [];
                  if (!Array.isArray(extra) || extra.length === 0) break;
                  for (const item of extra) {
                    const key = String(item?.issueNumber || item?.issue || '');
                    if (key && !seen.has(key)) {
                      seen.add(key);
                      list.push(item);
                    }
                  }
                }
              } catch {}
            }
            const sliced = list.slice(0, 50);
            fetch('/api/lottery/cache', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ game, mode, list: sliced })
            }).catch(() => {});
            return { list: sliced, source: 'api' };
          }
        }
      }
    } catch {}
  }

  try {
    const proxyRes = await fetch(`/api/${game}/history?mode=${encodeURIComponent(mode)}&ts=${Date.now()}`, {
      cache: 'no-store'
    });
    if (proxyRes.ok) {
      const pData = await proxyRes.json();
      if (pData?.success && Array.isArray(pData.list) && pData.list.length > 0) {
        return {
          list: pData.list.slice(0, 50),
          source: pData.source === 'api' ? 'api' : pData.source === 'cache' ? 'cache' : 'synced'
        };
      }
    }
  } catch {}

  return null;
}
