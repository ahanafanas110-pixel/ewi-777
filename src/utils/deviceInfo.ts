export function getClientDeviceName(userAgent?: string): string {
  const ua =
    userAgent ||
    (typeof navigator !== 'undefined' ? navigator.userAgent : '') ||
    '';
  if (!ua) return 'Unknown Device';

  let os = 'Device';
  let model = '';

  if (/iPhone/i.test(ua)) {
    os = 'iOS';
    model = 'iPhone';
  } else if (/iPad/i.test(ua)) {
    os = 'iPadOS';
    model = 'iPad';
  } else if (/Android/i.test(ua)) {
    os = 'Android';
    const match = ua.match(/Android\s[\d.]+;\s*([^;)]+)/i);
    if (match && match[1]) {
      model = match[1].replace(/\s*Build\/.*$/i, '').trim();
    }
    if (!model || model.toLowerCase() === 'k') {
      model = 'Android Phone';
    }
  } else if (/Windows NT/i.test(ua)) {
    os = 'Windows';
    model = 'Windows PC';
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'macOS';
    model = 'MacBook / Mac';
  } else if (/Linux/i.test(ua)) {
    os = 'Linux';
    model = 'Linux PC';
  }

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/SamsungBrowser/i.test(ua)) browser = 'Samsung';
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';

  if (model && os && !model.toLowerCase().includes(os.toLowerCase())) {
    return `${model} • ${os} (${browser})`.slice(0, 64);
  }
  return `${model || os} • ${browser}`.slice(0, 64);
}
