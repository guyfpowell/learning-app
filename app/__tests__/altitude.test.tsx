import React from 'react';
import { Dimensions, StyleSheet, processColor } from 'react-native';
import { fireEvent, render, screen, within } from '@testing-library/react-native';
import {
  ACHIEVEMENTS_LOAD_ERROR,
  ALTITUDE_LOAD_ERROR,
  ALTITUDE_TITLE,
  DEFAULT_TIMEZONE,
  HEIGHT_BANDS,
  SEA_LEVEL_LABEL,
  heightChartPosition,
  initialsOf,
  landmarkOf,
  levelTicks,
  metresLabel,
  metresToGoCopy,
  nextLandmarkLabel,
  passedLandmarkCopy,
  youMarkerCopy,
  type AltitudeResponse,
  type LandmarkKey,
} from '@learning/shared';
import AltitudeScreen from '../altitude';
import { useAltitude } from '@/hooks/useAltitude';
import { useAchievements } from '@/hooks/useAchievements';
import { useProfile } from '@/hooks/useProfile';
import { CHART_TOP, openingOffsetOf } from '@/components/altitudeChart/chartLayout';
import { headerLookFor, headerLookOf, headerSampleYOf } from '@/components/altitudeChart/chartStyles';
import { makeAchievementsResponse, makeLandmarks } from '@/test-utils/achievements';
import { makeSessionUser } from '@/test-utils/users';
import { must } from '@/test-utils/must';

jest.mock('@/hooks/useAltitude', () => ({ useAltitude: jest.fn() }));
jest.mock('@/hooks/useAchievements', () => ({ useAchievements: jest.fn() }));
jest.mock('@/hooks/useProfile', () => ({ useProfile: jest.fn() }));

const TOP_INSET = 54;
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual('react-native-safe-area-context'),
  useSafeAreaInsets: () => ({ top: TOP_INSET, bottom: 0, left: 0, right: 0 }),
}));

const mockUser = makeSessionUser({ name: 'Ada Lovelace' });
jest.mock('@/store/auth.store', () => ({
  useAuthStore: (select: (state: { user: typeof mockUser }) => unknown) => select({ user: mockUser }),
}));

const screenOptions: { title?: string } = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  Stack: { Screen: ({ options }: { options: { title?: string } }) => { screenOptions.title = options.title; return null; } },
}));

// A stub that shows whether the medal was drawn locked; Medal.test.tsx covers the drawing.
jest.mock('@/components/ui/Medal', () => {
  const { View } = jest.requireActual('react-native');
  return {
    Medal: ({ definition, locked }: { definition: { key: string }; locked?: boolean }) => (
      <View testID={`medal-${definition.key}`} accessibilityValue={{ text: locked ? 'locked' : 'coloured' }} />
    ),
  };
});

const NOW = new Date('2026-11-20T12:00:00Z');
const PASSED_AT = makeLandmarks(Number.MAX_SAFE_INTEGER)[0].passedAt;

const MID_CLIMB: AltitudeResponse = {
  metres: 1_120,
  level: 10,
  nextLevel: { level: 11, startsAt: 1_270, metresToGo: 150 },
  lessonsToNextLevel: 5,
  nextLandmark: { key: 'ben-nevis', name: 'Ben Nevis', height: 1_345, metresToGo: 225, lessonsToGo: 7 },
  newLandmark: null,
};

const PAST_KARMAN: AltitudeResponse = {
  metres: 120_000,
  level: 30,
  nextLevel: null,
  lessonsToNextLevel: null,
  nextLandmark: { key: 'orbit', name: 'Orbit', height: 160_000, metresToGo: 40_000, lessonsToGo: 900 },
  newLandmark: null,
};

const PASSED_KEYS: LandmarkKey[] = ['big-ben', 'kinder-scout', 'scafell-pike', 'yr-wyddfa'];
const LOCKED_KEYS: LandmarkKey[] = ['mont-blanc', 'kilimanjaro', 'everest'];

function setLoaded(altitude: AltitudeResponse) {
  (useAltitude as jest.Mock).mockReturnValue({ data: altitude, isError: false });
  (useAchievements as jest.Mock).mockReturnValue({ data: makeAchievementsResponse(altitude.metres), isError: false });
}

function textOf(testID: string): string {
  return must(screen.getByTestId(testID).props.children, testID);
}

beforeAll(() => jest.useFakeTimers({ now: NOW }));
afterAll(() => jest.useRealTimers());
beforeEach(() => {
  jest.clearAllMocks();
  (useProfile as jest.Mock).mockReturnValue({ data: { timezone: DEFAULT_TIMEZONE } });
});

describe('AltitudeScreen', () => {
  it('is titled with the shared title', () => {
    setLoaded(MID_CLIMB);
    render(<AltitudeScreen />);
    expect(screenOptions.title).toBe(ALTITUDE_TITLE);
  });

  describe('the mid-climb fixture', () => {
    beforeEach(() => {
      setLoaded(MID_CLIMB);
      render(<AltitudeScreen />);
    });

    it('draws the four bands by name in upper case', () => {
      for (const band of HEIGHT_BANDS) {
        expect(textOf(`altitude-band-${band.key}`)).toBe(band.name.toUpperCase());
      }
    });

    it('draws the level ticks and the sea level label', () => {
      for (const tick of levelTicks()) {
        expect(screen.getByTestId(`altitude-tick-${tick.level}`)).toBeTruthy();
        if (tick.label !== null) expect(textOf(`altitude-tick-label-${tick.level}`)).toBe(tick.label);
      }
      expect(textOf('altitude-sea-level')).toBe(SEA_LEVEL_LABEL);
    });

    it('draws the learner marker with their initials, metres and level', () => {
      expect(textOf('altitude-marker-initials')).toBe(initialsOf(mockUser.name));
      expect(textOf('altitude-marker-metres')).toBe(metresLabel(MID_CLIMB.metres));
      expect(textOf('altitude-marker-level')).toBe(youMarkerCopy(MID_CLIMB.level));
    });

    it.each(PASSED_KEYS)('shows %s passed, in colour, with its passed line', (key) => {
      const { height, name } = landmarkOf(key);
      expect(textOf(`landmark-row-${key}-name`)).toBe(name);
      expect(textOf(`landmark-row-${key}-detail`)).toBe(passedLandmarkCopy(height, must(PASSED_AT, 'passedAt'), NOW, DEFAULT_TIMEZONE));
      expect(screen.getByTestId(`medal-${key}`).props.accessibilityValue).toEqual({ text: 'coloured' });
      expect(screen.queryByTestId(`landmark-row-${key}-eyebrow`)).toBeNull();
    });

    it('highlights Ben Nevis as next, with its eyebrow and the metres to go', () => {
      expect(textOf('landmark-row-ben-nevis-eyebrow')).toBe(nextLandmarkLabel(1_345));
      expect(textOf('landmark-row-ben-nevis-detail')).toBe(metresToGoCopy(225, 7));
      expect(screen.getAllByTestId(/^landmark-row-.*-eyebrow$/)).toHaveLength(1);
    });

    it.each(LOCKED_KEYS)('shows %s locked, with its height', (key) => {
      expect(textOf(`landmark-row-${key}-detail`)).toBe(metresLabel(landmarkOf(key).height));
      expect(screen.getByTestId(`medal-${key}`).props.accessibilityValue).toEqual({ text: 'locked' });
    });

    it('opens scrolled to the learner', () => {
      const viewport = Dimensions.get('window').height;
      expect(screen.getByTestId('altitude-scroll').props.contentOffset).toEqual({
        x: 0,
        y: openingOffsetOf(heightChartPosition(MID_CLIMB.metres), viewport),
      });
    });

    it('shows no Orbit before the Karman line', () => {
      expect(screen.queryByTestId('landmark-row-orbit')).toBeNull();
    });
  });

  it('highlights no row when there is no next landmark', () => {
    setLoaded({ ...MID_CLIMB, nextLandmark: null });
    render(<AltitudeScreen />);
    expect(screen.queryAllByTestId(/^landmark-row-.*-eyebrow$/)).toHaveLength(0);
  });

  it('shows Orbit past the Karman line', () => {
    setLoaded(PAST_KARMAN);
    render(<AltitudeScreen />);
    const orbit = within(screen.getByTestId('landmark-row-orbit'));
    expect(orbit.getByTestId('landmark-row-orbit-name').props.children).toBe(landmarkOf('orbit').name);
  });

  it('draws a leader line and a rail dot for every landmark, moved or not', () => {
    setLoaded(MID_CLIMB);
    render(<AltitudeScreen />);
    const rows = screen.getAllByTestId(/^landmark-slot-/);
    expect(screen.getAllByTestId(/^landmark-leader-/)).toHaveLength(rows.length);
    expect(screen.getAllByTestId(/^landmark-dot-/)).toHaveLength(rows.length);
  });

  describe('the header', () => {
    it('shows the shared title and the back chevron', () => {
      setLoaded(MID_CLIMB);
      render(<AltitudeScreen />);
      expect(textOf('altitude-header-title')).toBe(ALTITUDE_TITLE);
      expect(screen.getByTestId('detail-back')).toBeTruthy();
    });

    it('is paper over the mountains where the chart opens at 1,120m', () => {
      setLoaded(MID_CLIMB);
      render(<AltitudeScreen />);
      const sampleY = headerSampleYOf(openingOffsetOf(heightChartPosition(MID_CLIMB.metres), Dimensions.get('window').height), TOP_INSET);
      expect(StyleSheet.flatten(screen.getByTestId('altitude-header-title').props.style).color).toBe(headerLookOf(sampleY).ink);
    });

    it('turns navy with white ink once the chart scrolls to the sky', () => {
      setLoaded(MID_CLIMB);
      render(<AltitudeScreen />);
      const dark = headerLookFor(true);
      fireEvent.scroll(screen.getByTestId('altitude-scroll'), { nativeEvent: { contentOffset: { x: 0, y: CHART_TOP } } });
      expect(StyleSheet.flatten(screen.getByTestId('altitude-header-title').props.style).color).toBe(dark.ink);
      expect(screen.getByTestId('altitude-header-fade').props.colors).toEqual([dark.fade, dark.fade, dark.fadeClear].map((colour) => processColor(colour)));
    });
  });

  describe('a failed load', () => {
    it('shows the altitude error and no chart', () => {
      (useAltitude as jest.Mock).mockReturnValue({ data: undefined, isError: true });
      (useAchievements as jest.Mock).mockReturnValue({ data: makeAchievementsResponse(0), isError: false });
      render(<AltitudeScreen />);
      expect(screen.getByText(ALTITUDE_LOAD_ERROR)).toBeTruthy();
      expect(screen.queryByTestId('altitude-chart')).toBeNull();
    });

    it('shows the achievements error and no chart', () => {
      (useAltitude as jest.Mock).mockReturnValue({ data: MID_CLIMB, isError: false });
      (useAchievements as jest.Mock).mockReturnValue({ data: undefined, isError: true });
      render(<AltitudeScreen />);
      expect(screen.getByText(ACHIEVEMENTS_LOAD_ERROR)).toBeTruthy();
      expect(screen.queryByTestId('altitude-chart')).toBeNull();
    });
  });
});
