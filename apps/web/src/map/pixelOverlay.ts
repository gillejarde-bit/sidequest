import { useEffect, useRef } from 'react';
import { Map as MapboxMap } from 'mapbox-gl';

const hexToRgb = (h: string): [number, number, number] => {
  h = h.replace('#', '');
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16)
  ];
};

export const PALETTES = {
  stardew: [
    "#23311c", "#3a5a2a", "#5c9a3e", "#7cc24f", "#a6d96b", "#caa15e", "#8a5e33", "#5e3c1e",
    "#2e6e96", "#3e96bd", "#6fc7df", "#bfeff2", "#e6ce94", "#f4e8c8", "#b5723a", "#c0533b",
    "#9a3b2e", "#9aa0a8", "#6e7480", "#2a2418", "#e7b84f", "#d94f4f"
  ],
  sidequest: [
    "#2a1a0c", "#5a2e12", "#8a5a2b", "#c08a3c", "#e6c36b", "#f4e8c8", "#fbf3df", "#eb5607",
    "#f4915e", "#f8b763", "#c9572a", "#a02b06", "#6e8e92", "#a6c2c8", "#88b4af", "#3f6e73",
    "#a6ad7a", "#c2c594", "#7c9a4a", "#2a2418", "#e7c977", "#d06a3a"
  ]
};

export type PaletteName = 'stardew' | 'sidequest';
export type TimeName = 'dawn' | 'day' | 'dusk' | 'night';

export const TIMES: Record<TimeName, [number, number, number]> = {
  dawn: [1.08, 0.92, 0.82],
  day: [1, 1, 1],
  dusk: [1.12, 0.80, 0.66],
  night: [0.52, 0.60, 0.95]
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
];

const clamp = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : v | 0);

export interface PixelOverlayOptions {
  pixelSize?: number;
  dither?: boolean;
  outline?: boolean;
  time?: TimeName;
  palette?: PaletteName;
}

export class PixelOverlayProcessor {
  private map: MapboxMap;
  private pixelSize: number;
  private dither: boolean;
  private outline: boolean;
  private time: TimeName;
  private basePAL!: [number, number, number][];
  private PAL!: [number, number, number][];
  private overlay: HTMLCanvasElement | null = null;
  private octx: CanvasRenderingContext2D | null = null;
  private small: HTMLCanvasElement | null = null;
  private mctx: CanvasRenderingContext2D | null = null;
  private _cache: Map<number, number> = new Map();
  private _onRender: () => void;

  constructor(map: MapboxMap, opts: PixelOverlayOptions = {}) {
    this.map = map;
    this.pixelSize = opts.pixelSize || 5;
    this.dither = opts.dither !== false;
    this.outline = opts.outline !== false;
    this.time = opts.time || 'day';
    this.setPalette(opts.palette || 'stardew');

    this._onRender = () => this.render();

    // SSR safety guard
    if (typeof window === 'undefined' || !map || typeof map.getCanvasContainer !== 'function') {
      return;
    }

    try {
      const c = map.getCanvasContainer();
      if (!c) return;

      this.overlay = document.createElement('canvas');
      Object.assign(this.overlay.style, {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        imageRendering: 'pixelated',
        zIndex: '5'
      });
      c.appendChild(this.overlay);
      
      this.octx = this.overlay.getContext('2d');
      this.small = document.createElement('canvas');
      this.mctx = this.small.getContext('2d', { willReadFrequently: true });

      // Hide the real WebGL canvas to show our pixelated post-processed version on top
      const glCanvas = map.getCanvas();
      if (glCanvas) {
        glCanvas.style.opacity = '0';
      }

      map.on('render', this._onRender);
      this.render();
    } catch (err) {
      console.error('Failed to initialize PixelOverlayProcessor:', err);
    }
  }

  setPalette(name: PaletteName) {
    this.basePAL = (PALETTES[name] || PALETTES.stardew).map(hexToRgb);
    this._retint();
  }

  setTime(t: TimeName) {
    this.time = t;
    this._retint();
  }

  set(opt: 'pixelSize' | 'dither' | 'outline' | 'time' | 'palette', val: any) {
    if (opt === 'pixelSize') this.pixelSize = val;
    else if (opt === 'dither') this.dither = val;
    else if (opt === 'outline') this.outline = val;
    else if (opt === 'time') this.time = val;
    else if (opt === 'palette') this.setPalette(val);

    if (opt === 'time' || opt === 'palette') {
      this._retint();
    }
    this.render();
  }

  private _retint() {
    const m = TIMES[this.time] || TIMES.day;
    this.PAL = this.basePAL.map(c => [
      clamp(c[0] * m[0]),
      clamp(c[1] * m[1]),
      clamp(c[2] * m[2])
    ]);
    if (this._cache) {
      this._cache.clear();
    }
  }

  private _nearest(r: number, g: number, b: number): number {
    const key = (r << 16) | (g << 8) | b;
    const hit = this._cache.get(key);
    if (hit !== undefined) return hit;

    let bi = 0;
    let bd = 1e9;
    const P = this.PAL;
    for (let i = 0; i < P.length; i++) {
      const p = P[i];
      const d = (r - p[0]) ** 2 + (g - p[1]) ** 2 + (b - p[2]) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    }
    this._cache.set(key, bi);
    return bi;
  }

  render() {
    if (typeof window === 'undefined') return;
    try {
      const src = this.map.getCanvas();
      if (!src) return;
      
      const W = src.width;
      const H = src.height;
      if (!W || !H) return;

      if (this.overlay) {
        if (this.overlay.width !== W) {
          this.overlay.width = W;
          this.overlay.height = H;
        }
      }

      const ps = this.pixelSize;
      const sw = Math.max(1, Math.round(W / ps));
      const sh = Math.max(1, Math.round(H / ps));

      if (this.small) {
        this.small.width = sw;
        this.small.height = sh;
      }

      if (!this.mctx || !this.octx || !this.small || !this.overlay) return;

      // 1) downscale the live map canvas (area-average) into the small buffer
      this.mctx.imageSmoothingEnabled = true;
      this.mctx.drawImage(src, 0, 0, sw, sh);

      // 2) quantize (+dither) to the fixed palette
      const img = this.mctx.getImageData(0, 0, sw, sh);
      const d = img.data;
      const idx = new Int16Array(sw * sh);
      const spread = this.dither ? 42 : 0;

      for (let y = 0; y < sh; y++) {
        for (let x = 0; x < sw; x++) {
          const o = (y * sw + x) * 4;
          let r = d[o];
          let g = d[o + 1];
          let b = d[o + 2];

          if (spread) {
            const off = (BAYER[y & 3][x & 3] / 16 - 0.5) * spread;
            r = clamp(r + off);
            g = clamp(g + off);
            b = clamp(b + off);
          }

          const k = this._nearest(r, g, b);
          idx[y * sw + x] = k;
          const p = this.PAL[k];
          d[o] = p[0];
          d[o + 1] = p[1];
          d[o + 2] = p[2];
        }
      }

      // 3) tile outlines (darken cell edges)
      if (this.outline) {
        for (let y = 0; y < sh; y++) {
          for (let x = 0; x < sw; x++) {
            const k = idx[y * sw + x];
            const kr = x < sw - 1 ? idx[y * sw + x + 1] : k;
            const kd = y < sh - 1 ? idx[(y + 1) * sw + x] : k;
            if (k !== kr || k !== kd) {
              const o = (y * sw + x) * 4;
              d[o] = clamp(d[o] * 0.62);
              d[o + 1] = clamp(d[o + 1] * 0.62);
              d[o + 2] = clamp(d[o + 2] * 0.62);
            }
          }
        }
      }

      this.mctx.putImageData(img, 0, 0);

      // 4) upscale to the overlay with hard pixels
      this.octx.imageSmoothingEnabled = false;
      this.octx.clearRect(0, 0, W, H);
      this.octx.drawImage(this.small, 0, 0, sw, sh, 0, 0, W, H);
    } catch (err) {
      console.error('Failed to render PixelOverlay:', err);
    }
  }

  destroy() {
    if (typeof window === 'undefined') return;
    try {
      this.map.off('render', this._onRender);
      
      const glCanvas = this.map.getCanvas();
      if (glCanvas) {
        glCanvas.style.opacity = '1';
      }
      
      if (this.overlay) {
        this.overlay.remove();
      }
    } catch (err) {
      console.error('Failed to clean up PixelOverlayProcessor:', err);
    }
  }
}

export function usePixelOverlay(
  map: MapboxMap | null,
  options: PixelOverlayOptions & { enabled?: boolean } = {}
) {
  const overlayRef = useRef<PixelOverlayProcessor | null>(null);
  const enabled = options.enabled !== false;
  const { pixelSize = 5, dither = true, outline = true, time = 'day', palette = 'stardew' } = options;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!map || !enabled) {
      if (overlayRef.current) {
        overlayRef.current.destroy();
        overlayRef.current = null;
      }
      return;
    }

    const initOverlay = () => {
      if (overlayRef.current) return;
      overlayRef.current = new PixelOverlayProcessor(map, {
        pixelSize,
        dither,
        outline,
        time,
        palette
      });
    };

    if (map.isStyleLoaded()) {
      initOverlay();
    } else {
      map.once('load', initOverlay);
    }

    return () => {
      if (overlayRef.current) {
        overlayRef.current.destroy();
        overlayRef.current = null;
      }
    };
  }, [map, enabled]);

  // Handle dynamic setting updates
  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.set('pixelSize', pixelSize);
    }
  }, [pixelSize]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.set('dither', dither);
    }
  }, [dither]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.set('outline', outline);
    }
  }, [outline]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.set('time', time);
    }
  }, [time]);

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.set('palette', palette);
    }
  }, [palette]);
}

export interface PixelOverlayProps extends PixelOverlayOptions {
  map: MapboxMap | null;
  enabled?: boolean;
}

export const PixelOverlay: React.FC<PixelOverlayProps> = ({
  map,
  enabled = true,
  pixelSize = 5,
  dither = true,
  outline = true,
  time = 'day',
  palette = 'stardew'
}) => {
  usePixelOverlay(map, { enabled, pixelSize, dither, outline, time, palette });
  return null;
};
