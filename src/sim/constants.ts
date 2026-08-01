// Physical constants — SI units everywhere inside src/sim.

/** Earth gravitational parameter, m^3/s^2 */
export const MU_EARTH = 3.986004418e14;
/** Mean Earth radius, m */
export const R_EARTH = 6.371e6;
/** Equatorial Earth radius, m (rotation bonus) */
export const R_EARTH_EQ = 6.378137e6;
/** Standard gravity (Isp reference), m/s^2 */
export const G0 = 9.80665;
/** Sea-level air density, kg/m^3 */
export const RHO0 = 1.225;
/** Exponential atmosphere scale height, m */
export const SCALE_HEIGHT = 8500;
/** Earth rotation rate, rad/s */
export const OMEGA_EARTH = 7.2921159e-5;
/** Sidereal day, s */
export const SIDEREAL_DAY = 86164.0905;
/** Default structural dynamic-pressure limit, Pa */
export const Q_MAX_DEFAULT = 40e3;
/** Altitude above which we treat the atmosphere as vacuum, m */
export const ATMOSPHERE_TOP = 140e3;
/** Karman-ish line used for orbit classification (perigee below this = suborbital), m */
export const H_ATM = 100e3;
export const DEG = Math.PI / 180;
export const RAD = 180 / Math.PI;
