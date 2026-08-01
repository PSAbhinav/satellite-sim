import { Suspense, lazy } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { TopBar } from '@/components/TopBar';

const Home = lazy(() => import('@/screens/Home'));
const Assembly = lazy(() => import('@/screens/Assembly'));
const PayloadBay = lazy(() => import('@/screens/PayloadBay'));
const SiteWeather = lazy(() => import('@/screens/SiteWeather'));
const Countdown = lazy(() => import('@/screens/Countdown'));
const Launch = lazy(() => import('@/screens/Launch'));
const OrbitOps = lazy(() => import('@/screens/OrbitOps'));
const Debrief = lazy(() => import('@/screens/Debrief'));
const Spacepedia = lazy(() => import('@/screens/Spacepedia'));
const SolarSystem = lazy(() => import('@/screens/SolarSystem'));

export default function App() {
  const location = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar />
      <main className="relative flex-1">
        <Suspense
          fallback={
            <div className="flex h-64 items-center justify-center font-display text-muted-star">
              <span className="animate-blink">ACQUIRING SIGNAL…</span>
            </div>
          }
        >
          {/* CSS route transition: completes by clock time even when the tab is
              backgrounded (rAF-driven animations freeze screens at opacity 0). */}
          <div
            key={location.pathname}
            className="h-full motion-safe:animate-[route-in_0.28s_ease-out]"
          >
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/build" element={<Assembly />} />
              <Route path="/payload" element={<PayloadBay />} />
              <Route path="/site" element={<SiteWeather />} />
              <Route path="/countdown" element={<Countdown />} />
              <Route path="/launch" element={<Launch />} />
              <Route path="/orbit" element={<OrbitOps />} />
              <Route path="/debrief" element={<Debrief />} />
              <Route path="/spacepedia" element={<Spacepedia />} />
              <Route path="/solar-system" element={<SolarSystem />} />
            </Routes>
          </div>
        </Suspense>
      </main>
    </div>
  );
}
