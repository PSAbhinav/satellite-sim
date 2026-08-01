// The front-wall world map — the signature display of every real mission
// control room since Mercury: an equirectangular Earth with the vehicle's
// ground track tracing across it. Canvas-drawn from the telemetry bus.

import { useEffect, useMemo, useRef } from 'react';
import { telemetryBus } from '@/sim/runtime/telemetryBus';
import { DEG, MU_EARTH, OMEGA_EARTH, R_EARTH, RAD } from '@/sim/constants';

const BASE = import.meta.env.BASE_URL;

/**
 * Nominal ground track for the target circular orbit (inclination = site
 * latitude, due-east launch): one revolution starting at the site, with the
 * classic westward drift from Earth's rotation. This is the planned line a
 * real MCC board shows before liftoff.
 */
function plannedTrack(
  siteLat: number,
  siteLon: number,
  targetAlt: number,
): { lat: number; lon: number }[] {
  const inc = Math.abs(siteLat) * DEG;
  const n = Math.sqrt(MU_EARTH / Math.pow(R_EARTH + targetAlt, 3)); // mean motion
  const pts: { lat: number; lon: number }[] = [];
  const th0 = Math.PI / 2; // site sits at the track's northernmost point
  const lonAt = (th: number) => Math.atan2(Math.cos(inc) * Math.sin(th), Math.cos(th));
  for (let k = 0; k <= 240; k++) {
    const th = th0 + (k / 240) * Math.PI * 2;
    const lat = Math.asin(Math.sin(inc) * Math.sin(th)) * RAD;
    const lonEci = (lonAt(th) - lonAt(th0)) * RAD;
    const drift = ((OMEGA_EARTH * (th - th0)) / n) * RAD;
    let lon = siteLon + lonEci - drift;
    lon = ((lon + 540) % 360) - 180;
    pts.push({ lat, lon });
  }
  return pts;
}

export function GroundTrackMap({
  siteLat,
  siteLon,
  targetAltitude,
}: {
  siteLat?: number;
  siteLon?: number;
  targetAltitude?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trace = useRef<{ lat: number; lon: number }[]>([]);
  const lastSample = useRef(-10);
  const planned = useMemo(
    () =>
      siteLat !== undefined && siteLon !== undefined && targetAltitude
        ? plannedTrack(siteLat, siteLon, targetAltitude)
        : null,
    [siteLat, siteLon, targetAltitude],
  );

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

      // Planned trajectory — dashed amber, drawn before liftoff like the
      // nominal track on a real MCC board.
      if (planned) {
        ctx.strokeStyle = 'rgba(245, 165, 36, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([7, 7]);
        ctx.beginPath();
        let prevP: { lat: number; lon: number } | null = null;
        for (const p of planned) {
          const [x, y] = xy(p.lat, p.lon, W, H);
          if (prevP && Math.abs(p.lon - prevP.lon) < 180) ctx.lineTo(x, y);
          else ctx.moveTo(x, y);
          prevP = p;
        }
        ctx.stroke();
        ctx.setLineDash([]);
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
  }, [siteLat, siteLon, planned]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}
