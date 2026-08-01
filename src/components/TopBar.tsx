import { Link, useLocation } from 'react-router-dom';
import { BookOpen, Music, Orbit, Volume2, VolumeX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUiStore, type AgeLevel } from '@/state/useUiStore';
import { useMissionStore } from '@/state/useMissionStore';
import { setMusicVolume, startMusic, stopMusic } from '@/lib/audio';
import { cn } from '@/lib/utils';

const STEPS: { path: string; label: string }[] = [
  { path: '/build', label: 'Assembly' },
  { path: '/payload', label: 'Payload' },
  { path: '/site', label: 'Site & Weather' },
  { path: '/countdown', label: 'Countdown' },
  { path: '/launch', label: 'Launch' },
  { path: '/orbit', label: 'Orbit' },
];

export function TopBar() {
  const { pathname } = useLocation();
  const ageLevel = useUiStore((s) => s.ageLevel);
  const setAgeLevel = useUiStore((s) => s.setAgeLevel);
  const musicOn = useUiStore((s) => s.musicOn);
  const setMusicOn = useUiStore((s) => s.setMusicOn);
  const musicVolume = useUiStore((s) => s.musicVolume);
  const calloutVoiceOn = useUiStore((s) => s.calloutVoiceOn);
  const setCalloutVoiceOn = useUiStore((s) => s.setCalloutVoiceOn);
  const unlocked = useMissionStore((s) => s.unlockedPedia);

  const toggleMusic = () => {
    const next = !musicOn;
    setMusicOn(next);
    if (next) {
      startMusic(musicVolume);
      setMusicVolume(musicVolume);
    } else {
      stopMusic();
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-12 items-center gap-3 border-b border-line bg-void/90 px-3 backdrop-blur">
      <Link to="/" className="flex items-center gap-2 font-display font-bold text-starlight">
        <Orbit className="size-5 text-phosphor" />
        <span className="hidden sm:inline">
          ORBITAL<span className="text-phosphor">/</span>ACADEMY
        </span>
      </Link>

      <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
        {STEPS.map((s, i) => (
          <Link
            key={s.path}
            to={s.path}
            className={cn(
              'whitespace-nowrap rounded-sm px-2 py-1 font-display text-[11px] uppercase tracking-wider transition-colors',
              pathname === s.path
                ? 'bg-console-2 text-phosphor'
                : 'text-muted-star hover:text-starlight',
            )}
          >
            <span className="telemetry mr-1 opacity-50">{i + 1}</span>
            {s.label}
          </Link>
        ))}
      </nav>

      <Link
        to="/spacepedia"
        className={cn(
          'flex items-center gap-1 rounded-sm px-2 py-1 font-display text-[11px] uppercase tracking-wider',
          pathname === '/spacepedia' ? 'bg-console-2 text-phosphor' : 'text-muted-star hover:text-starlight',
        )}
      >
        <BookOpen className="size-3.5" />
        Spacepedia
        <span className="telemetry text-[10px] text-phosphor/70">{unlocked.length}</span>
      </Link>

      <Tabs value={ageLevel} onValueChange={(v) => setAgeLevel(v as AgeLevel)}>
        <TabsList className="h-7">
          <TabsTrigger className="px-2 py-0.5 text-[10px]" value="kid">
            Kid
          </TabsTrigger>
          <TabsTrigger className="px-2 py-0.5 text-[10px]" value="student">
            Student
          </TabsTrigger>
          <TabsTrigger className="px-2 py-0.5 text-[10px]" value="engineer">
            Engineer
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Button
        variant="ghost"
        size="icon"
        title={calloutVoiceOn ? 'Voice callouts on' : 'Voice callouts off'}
        onClick={() => setCalloutVoiceOn(!calloutVoiceOn)}
      >
        {calloutVoiceOn ? <Volume2 className="size-4 text-phosphor" /> : <VolumeX className="size-4" />}
      </Button>
      <Button variant="ghost" size="icon" title={musicOn ? 'Music on' : 'Music off'} onClick={toggleMusic}>
        <Music className={cn('size-4', musicOn ? 'text-phosphor' : 'text-muted-star')} />
      </Button>
    </header>
  );
}
