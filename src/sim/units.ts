// Display-edge unit conversions. The sim core stores raw SI only.

export const mToKm = (m: number) => m / 1000;
export const kmToM = (km: number) => km * 1000;
export const msToKms = (ms: number) => ms / 1000;
export const msToKt = (ms: number) => ms * 1.943844;
export const ktToMs = (kt: number) => kt / 1.943844;
export const nToKn = (n: number) => n / 1000;
export const paToKpa = (pa: number) => pa / 1000;
export const kgToT = (kg: number) => kg / 1000;
export const radToDeg = (rad: number) => (rad * 180) / Math.PI;
export const degToRad = (deg: number) => (deg * Math.PI) / 180;
export const sToMinSec = (s: number) => {
  const sign = s < 0 ? '-' : '+';
  const abs = Math.abs(s);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const sec = Math.floor(abs % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `T${sign}${pad(h)}:${pad(m)}:${pad(sec)}`;
};
