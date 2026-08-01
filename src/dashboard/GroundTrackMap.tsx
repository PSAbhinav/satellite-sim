// The front-wall world map — the signature display of every real mission
// control room since Mercury: an equirectangular Earth with the vehicle's
// ground track tracing across it. Canvas-drawn from the telemetry bus.

import { useEffect, useRef } from 'react';
import { telemetryBus } from '@/sim/runtime/telemetryBus';

const BASE = import.meta.env.BASE_URL;

export function GroundTrackMap({ siteLat, siteLon }: { siteLat?: number; siteLon?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trace = useRef<{ lat: number; lon: number }[]>([]);
  const lastSample = useRef(-10);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    img.src = `${BASE}textures/earth_day.jpg`;
    let imgReady = false;
    img.onload = () => (imgReady = true);

    const xy = (lat: number, lon: number, w: number, h: number): [number, number] => [
      ((lon + 180) / 360) * w,
      ((90 - lat) / 180) * h,
    ];

    let raf = 0;
    let last = 0;
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (now - last < 100) return; // 10 fps is plenty for a map
      last = now;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== w * 2) {
        canvas.width = w * 2;
        canvas.height = h * 2;
      }
      const W = canvas.width;
      const H = canvas.height;

      // Base map, darkened and blue-tinted to console levels.
      ctx.fillStyle = '#080d18';
      ctx.fillRect(0, 0, W, H);
      if (imgReady) {
        ctx.globalAlpha = 0.55;
        ctx.drawImage(img, 0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(9, 15, 30, 0.62)';
        ctx.fillRect(0, 0, W, H);
      }

      // Graticule.
      ctx.strokeStyle = 'rgba(139,150,173,0.15)';
      ctx.lineWidth = 1;
      for (let lon = -150; lon <= 150; lon += 30) {
        const [x] = xy(0, lon, W, H);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let lat = -60; lat <= 60; lat += 30) {
        const [, y] = xy(lat, 0, W, H);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      // Equator slightly brighter.
      ctx.strokeStyle = 'rgba(139,150,173,0.3)';
      const [, eqY] = xy(0, 0, W, H);
      ctx.beginPath();
      ctx.moveTo(0, eqY);
      ctx.lineTo(W, eqY);
      ctx.stroke();

      // Sample the sub-satellite point.
      const snap = telemetryBus.get();
      if (snap?.subpoint && snap.t - lastSample.current >= 2) {
        lastSample.current = snap.t;
        trace.current.push({ lat: snap.subpoint.latDeg, lon: snap.subpoint.lonDeg });
        if (trace.current.length > 2000) trace.current.shift();
      }

      // Launch site marker.
      if (siteLat !== undefined && siteLon !== undefined) {
        const [sx, sy] = xy(siteLat, siteLon, W, H);
        ctx.strokeStyle = '#f5a524';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(sx - 6, sy);
        ctx.lineTo(sx + 6, sy);
        ctx.moveTo(sx, sy - 6);
        ctx.lineTo(sx, sy + 6);
        ctx.stroke();
      }

      // Ground track (handle the ±180° wrap by splitting segments).
      ctx.strokeStyle = '#5ee6c8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      let prev: { lat: number; lon: number } | null = null;
      for (const p of trace.current) {
        const [x, y] = xy(p.lat, p.lon, W, H);
        if (prev && Math.abs(p.lon - prev.lon) < 180) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
        prev = p;
      }
      ctx.stroke();

      // Vehicle marker: blinking dot.
      if (snap?.subpoint) {
        const [vx, vy] = xy(snap.subpoint.latDeg, snap.subpoint.lonDeg, W, H);
        const blink = Math.floor(now / 500) % 2 === 0;
        ctx.fillStyle = blink ? '#5ee6c8' : 'rgba(94,230,200,0.4)';
        ctx.beginPath();
        ctx.arc(vx, vy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(94,230,200,0.4)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(vx, vy, 11, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [siteLat, siteLon]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
