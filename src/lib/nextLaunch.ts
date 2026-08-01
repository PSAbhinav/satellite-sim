// Next real-world launch, any provider, via Launch Library 2 (The Space Devs,
// free/no-auth). Cached 30 min in localStorage — the API allows ~15 req/hr per
// IP, so we stay well under. Any failure = the card simply doesn't show.

export interface NextLaunch {
  name: string;
  provider: string;
  pad: string;
  location: string;
  /** Launch time (NET), ISO string. */
  net: string;
  status: string;
}

const CACHE_KEY = 'satsim.nextlaunch';
const CACHE_MS = 30 * 60 * 1000;

export async function fetchNextLaunch(): Promise<NextLaunch | null> {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { at, data } = JSON.parse(cached) as { at: number; data: NextLaunch };
      if (Date.now() - at < CACHE_MS && data?.name) return data;
    }
  } catch {
    /* corrupt cache — refetch */
  }

  try {
    const res = await fetch('https://ll.thespacedevs.com/2.2.0/launch/upcoming/?limit=1', {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      results?: {
        name?: string;
        net?: string;
        status?: { abbrev?: string };
        launch_service_provider?: { name?: string };
        pad?: { name?: string; location?: { name?: string } };
      }[];
    };
    const l = json.results?.[0];
    if (!l?.name || !l.net) return null;
    const data: NextLaunch = {
      name: l.name,
      provider: l.launch_service_provider?.name ?? 'Unknown provider',
      pad: l.pad?.name ?? '',
      location: l.pad?.location?.name ?? '',
      net: l.net,
      status: l.status?.abbrev ?? '',
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data }));
    return data;
  } catch {
    return null; // offline / rate-limited / blocked — no card
  }
}

/** "T− 2d 14h 03m" (or "T+ …" once past). */
export function formatCountdown(netIso: string, now = Date.now()): string {
  const diff = new Date(netIso).getTime() - now;
  const sign = diff >= 0 ? 'T−' : 'T+';
  const abs = Math.abs(diff);
  const d = Math.floor(abs / 86_400_000);
  const h = Math.floor((abs % 86_400_000) / 3_600_000);
  const m = Math.floor((abs % 3_600_000) / 60_000);
  return d > 0 ? `${sign} ${d}d ${h}h ${String(m).padStart(2, '0')}m` : `${sign} ${h}h ${String(m).padStart(2, '0')}m`;
}
