import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AgeLevel = 'kid' | 'student' | 'engineer';

interface UiState {
  ageLevel: AgeLevel;
  musicOn: boolean;
  musicVolume: number;
  calloutVoiceOn: boolean;
  lowGraphics: boolean;
  setAgeLevel: (l: AgeLevel) => void;
  setMusicOn: (on: boolean) => void;
  setMusicVolume: (v: number) => void;
  setCalloutVoiceOn: (on: boolean) => void;
  setLowGraphics: (on: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      ageLevel: 'student',
      musicOn: true,
      musicVolume: 0.5,
      calloutVoiceOn: false,
      lowGraphics: false,
      setAgeLevel: (ageLevel) => set({ ageLevel }),
      setMusicOn: (musicOn) => set({ musicOn }),
      setMusicVolume: (musicVolume) => set({ musicVolume }),
      setCalloutVoiceOn: (calloutVoiceOn) => set({ calloutVoiceOn }),
      setLowGraphics: (lowGraphics) => set({ lowGraphics }),
    }),
    { name: 'satsim.ui', version: 1 },
  ),
);
