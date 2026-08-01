import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoChip } from '@/components/InfoChip';
import { SITES, minInclinationDeg, siteRotationBonus, type LaunchSite } from '@/sim/env/sites';
import { generateWeather } from '@/sim/env/weather';
import { evaluateLaunchCommit, type CommitStatus } from '@/sim/env/launchCommit';
import { msToKt } from '@/sim/units';
import { useMissionStore } from '@/state/useMissionStore';
import { beep } from '@/lib/audio';
import { useUiStore } from '@/state/useUiStore';
import { cn } from '@/lib/utils';

const BASE = import.meta.env.BASE_URL;

function StatusLight({ status }: { status: CommitStatus | 'pending' }) {
  // Shape + color + text: readable for color-blind users too.
  if (status === 'pending') return <Badge>STBY</Badge>;
  if (status === 'GO')
    return (
      <Badge variant="go">
        <CircleCheck className="size-3" /> GO
      </Badge>
    );
  if (status === 'CAUTION')
    return (
      <Badge variant="caution">
        <TriangleAlert className="size-3" /> HOLD
      </Badge>
    );
  return (
    <Badge variant="nogo">
      <CircleX className="size-3" /> NO-GO
    </Badge>
  );
}

/** World map with the launch sites marked; the selected site gets a pulse ring. */
function SiteMap({ selected }: { selected: LaunchSite }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== w * 2) {
        canvas.width = w * 2;
        canvas.height = h * 2;
      }
      const W = canvas.width;
      const H = canvas.height;

      ctx.fillStyle = '#080d18';
      ctx.fillRect(0, 0, W, H);
      if (imgReady) {
        ctx.globalAlpha = 0.6;
        ctx.drawImage(img, 0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(9, 15, 30, 0.55)';
        ctx.fillRect(0, 0, W, H);
      }

      for (const site of Object.values(SITES)) {
        const [x, y] = xy(site.latDeg, site.lonDeg, W, H);
        const isSel = site.id === selected.id;
        ctx.strokeStyle = isSel ? '#5ee6c8' : '#f5a524';
        ctx.lineWidth = isSel ? 3 : 2;
        ctx.beginPath();
        ctx.moveTo(x - 7, y);
        ctx.lineTo(x + 7, y);
        ctx.moveTo(x, y - 7);
        ctx.lineTo(x, y + 7);
        ctx.stroke();
        if (isSel) {
          const pulse = 10 + 5 * Math.abs(Math.sin(now / 500));
          ctx.strokeStyle = 'rgba(94,230,200,0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, pulse, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#5ee6c8';
          ctx.font = `${Math.round(H * 0.045)}px "Chakra Petch", sans-serif`;
          ctx.fillText(site.name.toUpperCase(), Math.min(x + 14, W - 260), y - 12);
        }
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [selected]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

export default function SiteWeather() {
  const navigate = useNavigate();
  const siteId = useMissionStore((s) => s.siteId);
  const setSite = useMissionStore((s) => s.setSite);
  const weatherDay = useMissionStore((s) => s.weatherDay);
  const nextWeatherDay = useMissionStore((s) => s.nextWeatherDay);
  const setWeather = useMissionStore((s) => s.setWeather);
  const design = useMissionStore((s) => s.design);
  const musicOn = useUiStore((s) => s.musicOn);

  const site = SITES[siteId];
  const weather = useMemo(() => generateWeather(site, weatherDay), [site, weatherDay]);
  const commit = useMemo(() => evaluateLaunchCommit(weather), [weather]);
  const [polled, setPolled] = useState(false);
  const [pollIdx, setPollIdx] = useState(0);

  useEffect(() => {
    setPolled(false);
    setPollIdx(0);
  }, [siteId, weatherDay]);

  // Animated roll-call: reveal one station verdict at a time.
  useEffect(() => {
    if (!polled || pollIdx >= commit.rules.length) return;
    const t = setTimeout(() => {
      if (musicOn) beep(pollIdx % 2 ? 700 : 900, 60, 0.06);
      setPollIdx((i) => i + 1);
    }, 450);
    return () => clearTimeout(t);
  }, [polled, pollIdx, commit.rules.length, musicOn]);

  const pollComplete = polled && pollIdx >= commit.rules.length;
  const inclinationOk = design.payload.target.inclinationDeg >= minInclinationDeg(site) - 0.1;

  const proceed = () => {
    setWeather(weather, commit);
    navigate('/countdown');
  };

  return (
    <div className="grid h-[calc(100vh-3rem)] gap-2 overflow-hidden p-2 lg:grid-cols-[1fr_minmax(360px,430px)]">
      {/* ── Left: sites + range map ── */}
      <div className="flex min-h-0 flex-col gap-2">
        <div className="px-1">
          <h1 className="font-display text-lg font-bold">Launch Site & Weather</h1>
          <p className="text-sm text-muted-star">
            Latitude sets your minimum <InfoChip conceptId="inclination">inclination</InfoChip> and
            your free <InfoChip conceptId="rotation-bonus">rotation boost</InfoChip>. Weather
            decides whether today is the day.
          </p>
        </div>

        <div className="grid shrink-0 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {Object.values(SITES).map((s) => (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              onClick={() => setSite(s.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setSite(s.id);
              }}
              className={cn(
                'cursor-pointer rounded-panel border p-3 transition-colors',
                siteId === s.id
                  ? 'border-phosphor/60 bg-console-2'
                  : 'border-line bg-console hover:border-muted-star/50',
              )}
            >
              <div className="font-display text-sm font-semibold leading-tight">{s.name}</div>
              <div className="telemetry mt-1 flex justify-between text-[11px] text-muted-star">
                <span>lat {s.latDeg}°</span>
                <span className="text-phosphor/80">+{siteRotationBonus(s).toFixed(0)} m/s</span>
              </div>
            </div>
          ))}
        </div>

        {!inclinationOk && (
          <p className="flex items-start gap-1 rounded-panel border border-flame/40 bg-console p-2 text-xs text-flame">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            {site.name} sits at {site.latDeg}° latitude — it cannot launch directly into your
            payload's {design.payload.target.inclinationDeg}° orbit. Pick a site at or below that
            latitude.
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-hidden rounded-panel border border-line">
          <SiteMap selected={site} />
        </div>
        <p className="px-1 text-[11px] text-muted-star/70">
          {site.blurb}
        </p>
      </div>

      {/* ── Right: briefing + poll (own scroll) ── */}
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-0.5">
        <Card className="shrink-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Weather briefing — day {weatherDay + 1}</CardTitle>
            <Button variant="secondary" size="sm" onClick={() => nextWeatherDay()}>
              <CalendarClock className="size-3.5" /> Wait a day
            </Button>
          </CardHeader>
          <CardContent className="telemetry grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-panel border border-line bg-console-2/50 p-2">
              <div className="text-muted-star">Surface wind</div>
              <div className="text-lg text-starlight">
                {msToKt(weather.surfaceWindMs).toFixed(0)} kt
              </div>
              <div className="text-muted-star/70">gusts {msToKt(weather.gustMs).toFixed(0)} kt</div>
            </div>
            <div className="rounded-panel border border-line bg-console-2/50 p-2">
              <div className="text-muted-star">Lightning risk</div>
              <div className="text-lg text-starlight">
                {(weather.lightningProb * 100).toFixed(0)}%
              </div>
              <div className="text-muted-star/70">{weather.precip ? 'rain nearby' : 'dry'}</div>
            </div>
            <div className="rounded-panel border border-line bg-console-2/50 p-2">
              <div className="text-muted-star">Temperature</div>
              <div className="text-lg text-starlight">{weather.tempC.toFixed(0)} °C</div>
            </div>
            <div className="rounded-panel border border-line bg-console-2/50 p-2">
              <div className="text-muted-star">Cloud layers</div>
              <div className="text-lg text-starlight">{weather.cloudLayers.length || 'none'}</div>
              <div className="text-muted-star/70">
                {weather.cloudLayers[0]
                  ? `${(weather.cloudLayers[0].topAlt - weather.cloudLayers[0].baseAlt).toFixed(0)} m thick`
                  : 'clear sky'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shrink-0">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              Go / No-Go poll — <InfoChip conceptId="launch-window">launch commit</InfoChip>
            </CardTitle>
            {!polled && (
              <Button size="sm" onClick={() => setPolled(true)}>
                Poll the room
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-1.5">
            {commit.rules.map((r, i) => {
              const revealed = polled && i < pollIdx;
              return (
                <div
                  key={r.id}
                  className={cn(
                    'flex items-start justify-between gap-2 rounded-panel border p-2 transition-colors',
                    revealed && r.status === 'NOGO'
                      ? 'border-crimson/40 bg-crimson/5'
                      : revealed && r.status === 'CAUTION'
                        ? 'border-flame/40 bg-flame/5'
                        : 'border-line bg-console-2/40',
                  )}
                >
                  <div className="min-w-0">
                    <div className="font-display text-xs font-semibold uppercase tracking-wide">
                      {r.label}
                    </div>
                    <div className="telemetry text-[11px] text-muted-star">{r.detail}</div>
                    <div className="mt-0.5 text-[11px] italic text-muted-star/70">{r.basis}</div>
                  </div>
                  <StatusLight status={revealed ? r.status : 'pending'} />
                </div>
              );
            })}

            {pollComplete && (
              <div
                className={cn(
                  'flex items-center justify-between rounded-panel border p-3',
                  commit.overall === 'NOGO'
                    ? 'border-crimson/50 bg-crimson/10'
                    : 'border-go/50 bg-go/10',
                )}
              >
                <span className="font-display text-sm font-bold">RANGE VERDICT</span>
                <StatusLight status={commit.overall} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex shrink-0 justify-end gap-2 pb-1">
          <Button asChild variant="secondary">
            <Link to="/payload">Back</Link>
          </Button>
          {pollComplete && commit.overall !== 'NOGO' ? (
            <Button variant="go" onClick={proceed}>
              GO for countdown <ArrowRight className="size-4" />
            </Button>
          ) : pollComplete ? (
            <Button variant="secondary" onClick={() => nextWeatherDay()}>
              Scrubbed — wait for tomorrow
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
