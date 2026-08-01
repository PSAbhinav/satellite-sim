import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, BookOpen, Globe, Rocket, Satellite } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMissionStore } from '@/state/useMissionStore';
import { useUiStore } from '@/state/useUiStore';
import { startMusic } from '@/lib/audio';

export default function Home() {
  const completed = useMissionStore((s) => s.completedMissions);
  const musicOn = useUiStore((s) => s.musicOn);
  const musicVolume = useUiStore((s) => s.musicVolume);

  // First user gesture arms the audio context (autoplay policy).
  const armAudio = () => {
    if (musicOn) startMusic(musicVolume);
  };

  const orbitDone = completed.includes('first-orbit');

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <p className="font-display text-xs uppercase tracking-[0.3em] text-phosphor">
          Mission Control · Training Program
        </p>
        <h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">
          Build a rocket.
          <br />
          Fight the weather.
          <br />
          <span className="text-phosphor">Reach orbit — for real.</span>
        </h1>
        <p className="mt-4 max-w-xl text-muted-star">
          Every number in this simulator comes from the same physics real rockets fly on — the
          rocket equation, drag, gravity turns, Kepler orbits. Design your vehicle, pass the
          go/no-go poll, and earn your place in the mission control room. Explanations adapt to
          you: Kid, Student, or Engineer.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" onClick={armAudio}>
            <Link to="/build">
              <Rocket className="size-4" />
              Start Mission: First Orbit
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button asChild variant="secondary" size="lg" onClick={armAudio}>
            <Link to="/spacepedia">
              <BookOpen className="size-4" />
              Spacepedia
            </Link>
          </Button>
        </div>
      </motion.div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Rocket,
            title: 'Vehicle Assembly',
            body: 'Stack real stages, watch your Δv budget respond, and learn why rockets are 95% fuel.',
            to: '/build',
            locked: false,
          },
          {
            icon: Satellite,
            title: 'Mission Control',
            body: 'Live telemetry, Max-Q, MECO, stage sep — the launch console every space fan dreams of.',
            to: '/launch',
            locked: false,
          },
          {
            icon: Globe,
            title: 'Solar System',
            body: orbitDone
              ? 'Fly the map. Visit all eight planets and their Spacepedia entries.'
              : 'Locked — reach orbit once to unlock the Solar System explorer.',
            to: orbitDone ? '/solar-system' : '/build',
            locked: !orbitDone,
          },
        ].map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <Link to={c.to} onClick={armAudio}>
              <Card className="h-full transition-colors hover:border-ion/60">
                <CardContent className="p-5">
                  <c.icon className="size-6 text-ion" />
                  <div className="mt-3 flex items-center gap-2 font-display font-semibold">
                    {c.title}
                    {c.locked && <Badge>Locked</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-star">{c.body}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      <p className="mt-12 text-center text-xs text-muted-star/60">
        A physics-first space program for every age · rebuilt from Satellite-Sim Phases 3 & 4
      </p>
    </div>
  );
}
