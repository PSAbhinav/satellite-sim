import { R_EARTH_EQ } from '../constants';
import { rotationBonus } from './earth';

export interface LaunchSite {
  id: string;
  name: string;
  latDeg: number;
  lonDeg: number;
  /** Flavor text + weather bias for the generator. */
  blurb: string;
  /** 0..1 — how often this site brews storms (biases the weather draw). */
  stormBias: number;
}

export const SITES: Record<string, LaunchSite> = {
  cape: {
    id: 'cape',
    name: 'Cape Canaveral',
    latDeg: 28.5,
    lonDeg: -80.6,
    blurb: 'Florida, USA. Great eastward launches over the ocean — but afternoon thunderstorms love it here.',
    stormBias: 0.5,
  },
  kourou: {
    id: 'kourou',
    name: 'Guiana Space Centre (Kourou)',
    latDeg: 5.2,
    lonDeg: -52.8,
    blurb: 'Near the equator — the biggest free speed boost from Earth’s spin.',
    stormBias: 0.45,
  },
  vandenberg: {
    id: 'vandenberg',
    name: 'Vandenberg SFB',
    latDeg: 34.7,
    lonDeg: -120.6,
    blurb: 'California coast. Launches south over the Pacific for polar orbits.',
    stormBias: 0.2,
  },
  sriharikota: {
    id: 'sriharikota',
    name: 'Satish Dhawan Space Centre (Sriharikota)',
    latDeg: 13.7,
    lonDeg: 80.2,
    blurb: 'India’s spaceport on the Bay of Bengal — low latitude, monsoon seasons.',
    stormBias: 0.55,
  },
};

/** Eastward Δv credit from Earth's rotation at this site, m/s. */
export const siteRotationBonus = (site: LaunchSite): number =>
  rotationBonus(site.latDeg, R_EARTH_EQ);

/** Lowest inclination reachable with a direct launch (no dogleg) = |latitude|. */
export const minInclinationDeg = (site: LaunchSite): number => Math.abs(site.latDeg);
