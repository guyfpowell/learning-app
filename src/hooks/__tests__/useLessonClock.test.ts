import { AppState, type AppStateStatus } from 'react-native';
import { renderHook, act } from '@testing-library/react-native';
import { useLessonClock } from '../useLessonClock';

let handler: ((s: AppStateStatus) => void) | null = null;
let now = 0;

beforeEach(() => {
  handler = null;
  now = 1_000_000;
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  (AppState as { currentState: string }).currentState = 'active';
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_, h) => {
    handler = h;
    return { remove: jest.fn() };
  });
});
afterEach(() => jest.restoreAllMocks());

describe('useLessonClock', () => {
  it('counts foreground time in whole seconds', () => {
    const { result } = renderHook(() => useLessonClock());
    now += 12_400;
    expect(result.current.seconds()).toBe(12);
  });

  it('does not count backgrounded time', () => {
    const { result } = renderHook(() => useLessonClock());
    now += 5_000;
    act(() => handler!('background'));
    now += 60_000;
    act(() => handler!('active'));
    now += 3_000;
    expect(result.current.seconds()).toBe(8);
  });

  it('reset restarts the count', () => {
    const { result } = renderHook(() => useLessonClock());
    now += 9_000;
    act(() => result.current.reset());
    now += 2_000;
    expect(result.current.seconds()).toBe(2);
  });

  it('reset while backgrounded stays at zero until foregrounded', () => {
    const { result } = renderHook(() => useLessonClock());
    now += 4_000;
    act(() => handler!('background'));
    act(() => result.current.reset());
    now += 30_000;
    expect(result.current.seconds()).toBe(0);
  });
});
