import { fireEvent, render, screen } from '@testing-library/react-native';
import { UnseenBuildCard } from '../UnseenBuildCard';
import { TRACK_BUILD_PUSH, TRACK_BUILD_STATUS } from '@learning/shared';
import { makeBuiltPlan, makeDoneBuild, makeFailedBuild, makeInFlightBuild, makeNeedsMoreBuild } from '@/test-utils/trackBuilds';

describe('UnseenBuildCard', () => {
  it.each([
    { name: 'done', build: makeDoneBuild('b1', 'words', makeBuiltPlan()), status: TRACK_BUILD_STATUS.done },
    { name: 'needs_more', build: makeNeedsMoreBuild('b1', 'words', 'More please'), status: TRACK_BUILD_STATUS.needs_more },
    { name: 'failed', build: makeFailedBuild('b1', 'words'), status: TRACK_BUILD_STATUS.failed },
  ])('says what the push said for a $name build, and opens it when pressed', ({ build, status }) => {
    const onOpen = jest.fn();
    render(<UnseenBuildCard build={build} onOpen={onOpen} />);
    expect(screen.getByText(TRACK_BUILD_PUSH[status].title)).toBeTruthy();
    expect(screen.getByText(TRACK_BUILD_PUSH[status].body)).toBeTruthy();
    fireEvent.press(screen.getByTestId('unseen-build-b1'));
    expect(onOpen).toHaveBeenCalled();
  });

  it('shows nothing for a build that is still going', () => {
    render(<UnseenBuildCard build={makeInFlightBuild('b1', 'words')} onOpen={jest.fn()} />);
    expect(screen.queryByTestId('unseen-build-b1')).toBeNull();
  });
});
