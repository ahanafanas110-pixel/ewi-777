const processedSpriteCache = new Map<string, string>();
const pendingSpritePromises = new Map<string, Promise<string>>();

function isCheckerPixel(
  r: number,
  g: number,
  b: number,
  a: number,
  mode: 'light-checker' | 'dark-checker'
): boolean {
  if (a < 15) return true;
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const sat = maxC - minC;
  // Checkerboard cells are strictly achromatic neutral grays/whites
  if (sat > 22) return false;
  if (mode === 'light-checker') {
    // White (#FFFFFF) & light neutral grey (#C0C0C0–#ECECEC) checkerboard
    return minC >= 182;
  }
  // Dark grey checkerboard (#262626 – #666666)
  return maxC <= 118;
}

/**
 * Strips baked PNG checkerboard backgrounds (corner flood-fill + small isolated
 * interior checkerboard pockets) on an offscreen canvas and caches a clean
 * transparent PNG data-URL for smooth real-time animation rendering.
 */
export function loadTransparentSprite(
  src: string,
  mode: 'light-checker' | 'dark-checker'
): Promise<string> {
  const cacheKey = `${mode}:${src}`;
  const cached = processedSpriteCache.get(cacheKey);
  if (cached) return Promise.resolve(cached);

  const pending = pendingSpritePromises.get(cacheKey);
  if (pending) return pending;

  const task = new Promise<string>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(src);
          return;
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(src);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);
        const data = imgData.data;
        const total = w * h;
        const visited = new Uint8Array(total);
        const isBg = new Uint8Array(total);
        const queue = new Int32Array(total);
        let qHead = 0;
        let qTail = 0;

        const trySeed = (idx: number) => {
          if (visited[idx]) return;
          const p = idx * 4;
          if (isCheckerPixel(data[p], data[p + 1], data[p + 2], data[p + 3], mode)) {
            visited[idx] = 1;
            isBg[idx] = 1;
            queue[qTail++] = idx;
          }
        };

        // Seed all 4 border edges
        for (let x = 0; x < w; x++) {
          trySeed(x);
          trySeed((h - 1) * w + x);
        }
        for (let y = 0; y < h; y++) {
          trySeed(y * w);
          trySeed(y * w + (w - 1));
        }

        // 4-connected BFS flood-fill from borders through checkerboard backdrop
        while (qHead < qTail) {
          const cur = queue[qHead++];
          const cx = cur % w;
          const cy = (cur - cx) / w;
          if (cx > 0) trySeed(cur - 1);
          if (cx + 1 < w) trySeed(cur + 1);
          if (cy > 0) trySeed(cur - w);
          if (cy + 1 < h) trySeed(cur + w);
        }

        // Also clear enclosed interior background holes (e.g. gap between arms/body)
        // by scanning unvisited pure-checkerboard components adjacent to high-neutral runs
        if (mode === 'light-checker') {
          for (let y = 1; y < h - 1; y++) {
            for (let x = 1; x < w - 1; x++) {
              const idx = y * w + x;
              if (visited[idx]) continue;
              const p = idx * 4;
              const r = data[p];
              const g = data[p + 1];
              const b = data[p + 2];
              const sat = Math.max(r, g, b) - Math.min(r, g, b);
              // Exact checkerboard tile shades in Lucky Jet asset (~220-232 or 254-255 neutral grey/white)
              if (sat <= 6 && ((r >= 216 && r <= 236) || r >= 252)) {
                // Only strip if surrounded by enough neutral checkerboard neighbors
                let neutralNeighbors = 0;
                const offsets = [-1, 1, -w, w, -w - 1, -w + 1, w - 1, w + 1];
                for (let k = 0; k < offsets.length; k++) {
                  const np = (idx + offsets[k]) * 4;
                  const nr = data[np];
                  const ng = data[np + 1];
                  const nb = data[np + 2];
                  if (Math.max(nr, ng, nb) - Math.min(nr, ng, nb) <= 8 && nr >= 214) {
                    neutralNeighbors++;
                  }
                }
                if (neutralNeighbors >= 7) {
                  isBg[idx] = 1;
                }
              }
            }
          }
        }

        // Zero alpha on background pixels & apply 1px soft halo anti-aliasing
        for (let i = 0; i < total; i++) {
          if (isBg[i]) {
            data[i * 4 + 3] = 0;
          }
        }
        for (let y = 1; y < h - 1; y++) {
          for (let x = 1; x < w - 1; x++) {
            const idx = y * w + x;
            if (isBg[idx]) continue;
            const p = idx * 4;
            const sat = Math.max(data[p], data[p + 1], data[p + 2]) - Math.min(data[p], data[p + 1], data[p + 2]);
            let bgNeighbors = 0;
            if (isBg[idx - 1]) bgNeighbors++;
            if (isBg[idx + 1]) bgNeighbors++;
            if (isBg[idx - w]) bgNeighbors++;
            if (isBg[idx + w]) bgNeighbors++;
            if (bgNeighbors > 0 && sat < 24) {
              data[p + 3] = Math.round(data[p + 3] * (bgNeighbors >= 2 ? 0.32 : 0.65));
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        const outUrl = canvas.toDataURL('image/png');
        processedSpriteCache.set(cacheKey, outUrl);
        resolve(outUrl);
      } catch {
        resolve(src);
      }
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });

  pendingSpritePromises.set(cacheKey, task);
  return task;
}
