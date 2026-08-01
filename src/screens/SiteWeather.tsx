import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarClock, CircleCheck, CircleX, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoChip } from '@/components/InfoChip';
import { SITES, minInclinationDeg, siteRotationBonus } from '@/sim/env/sites';
import { generateWeather } from '@/sim/env/weather';
import { evaluateLaunchCommit, type CommitStatus } from '@/sim/env/launchCommit';
import { msToKt } from '@/sim/units';
import { useMissionStore } from '@/state/useMissionStore';
import { beep } from '@/lib/audio';
import { useUiStore } from '@/state/useUiStore';

function StatusLight({ status }: { status: CommitStatus }) {
  // Shape + color + text: readable for color-blind users too.
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
    <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-4">
        <h1 className="font-display text-lg font-bold">Launch Site & Weather</h1>
        <p className="text-sm text-muted-star">
          Latitude sets your minimum <InfoChip conceptId="inclination">inclination</InfoChip> and
          your free <InfoChip conceptId="rotation-bonus">rotation boost</InfoChip>. Weather decides
          whether today is the day.
        </p>

        <div className="grid gap-2 sm:grid-cols-2">
          {Object.values(SITES).map((s) => (
            <button key={s.id} onClick={() => setSite(s.id)} className="text-left cursor-pointer">
              <Card
                className={`h-full transition-colors ${
                  siteId === s.id ? 'border-phosphor/60 bg-console-2' : 'hover:border-muted-star/50'
                }`}
              >
                <CardContent className="p-3">
                  <div className="font-display text-sm font-semibold">{s.name}</div>
                  <div className="telemetry mt-1 flex justify-between text-[11px] text-muted-star">
                    <span>lat {s.latDeg}°</span>
                    <span>+{siteRotationBonus(s).toFixed(0)} m/s east</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-star/80">{s.blurb}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>

        {!inclinationOk && (
          <Card className="border-flame/40">
            <CardContent className="p-3 text-xs text-flame">
              <TriangleAlert className="mr-1 inline size-3.5" />
              {site.name} sits at {site.latDeg}° latitude — it cannot launch directly into your
              payload's {design.payload.target.inclinationDeg}° orbit. Pick a site at or below that
              latitude (or accept a different final inclination in this simplified sim).
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>
              Weather briefing — day {weatherDay + 1}
            </CardTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => nextWeatherDay()}
              title="Wait for the next launch window"
            >
              <CalendarClock className="size-3.5" /> Wait a day
            </Button>
          </CardHeader>
          <CardContent className="telemetry grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-panel border border-line p-2">
              <div className="text-muted-star">Surface wind</div>
              <div className="text-lg text-starlight">
                {msToKt(weather.surfaceWindMs).toFixed(0)} kt
              </div>
              <div className="text-muted-star/70">gusts {msToKt(weather.gustMs).toFixed(0)} kt</div>
            </div>
            <div className="rounded-panel border border-line p-2">
              <div className="text-muted-star">Lightning risk</div>
              <div className="text-lg text-starlight">
                {(weather.lightningProb * 100).toFixed(0)}%
              </div>
              <div className="text-muted-star/70">{weather.precip ? 'rain nearby' : 'dry'}</div>
            </div>
            <div className="rounded-panel border border-line p-2">
              <div className="text-muted-star">Temperature</div>
              <div className="text-lg text-starlight">{weather.tempC.toFixed(0)} °C</div>
            </div>
            <div className="rounded-panel border border-line p-2">
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

        <Card>
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
          <CardContent className="space-y-2">
            {commit.rules.map((r, i) => (
              <div
                key={r.id}
                className={`flex items-start justify-between gap-2 rounded-panel border border-line p-2 transition-opacity duration-300 ${
                  polled && i < pollIdx ? 'opacity-100' : 'opacity-30'
                }`}
              >
                <div>
                  <div className="font-display text-xs font-semibold uppercase tracking-wide">
                    {r.label}
                  </div>
                  <div className="telemetry text-[11px] text-muted-star">{r.detail}</div>
                  <div className="mt-0.5 text-[11px] italic text-muted-star/70">{r.basis}</div>
                </div>
                {polled && i < pollIdx ? <StatusLight status={r.status} /> : <Badge>—</Badge>}
              </div>
            ))}

            {pollComplete && (
              <div className="flex items-center justify-between rounded-panel border border-line bg-console-2 p-3">
                <span className="font-display text-sm font-bold">RANGE VERDICT</span>
                <StatusLight status={commit.overall} />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button asChild variant="secondary">
            <Link to="/payload">Back</Link>
          </Button>
          {pollComplete && commit.overall !== 'NOGO' ? (
            <Button variant="go" onClick={proceed}>
              GO for countdown <ArrowRight className="size-4" />
            </Button>
          ) : pollComplete ? (
            <Button variant="secondary" onClick={() => nextWeatherDay()}>
              Scrubbed — wait for tomorrow's window
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
