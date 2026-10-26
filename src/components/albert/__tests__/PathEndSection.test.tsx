import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { PATH_END_PROMPT, pathEndHeading } from '@learning/shared';
import { PathEndSection } from '../PathEndSection';
import { makeCustomPath } from '@/test-utils/paths';
import { createTestQueryClient, queryWrapper } from '@/test-utils/queryClient';

jest.mock('@/services/situationChange.service', () => ({
  situationChangeService: { create: jest.fn(), getLatest: jest.fn().mockResolvedValue(null) },
}));

// Its own suite covers the card; here it only has to be rendered for the finished path.
jest.mock('@/components/albert/PathProposalSection', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { PathProposalSection: ({ path }: { path: { id: string } }) => <View testID={`stub-proposal-${path.id}`} /> };
});

const path = makeCustomPath({ id: 'plan-1', name: 'My AI Path', percentComplete: 100, isFinished: true, isActive: true });
const onUpgrade = jest.fn();

function renderSection(locked: boolean) {
  render(<PathEndSection path={path} locked={locked} onUpgrade={onUpgrade} />, { wrapper: queryWrapper(createTestQueryClient()) });
}

describe('PathEndSection (079i3)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the finished heading, the what-next prompt and the box', async () => {
    renderSection(false);
    expect(screen.getByText(pathEndHeading('My AI Path'))).toBeTruthy();
    expect(await screen.findByText(PATH_END_PROMPT)).toBeTruthy();
    expect(screen.getByTestId('situation-change-text')).toBeTruthy();
  });

  it('shows Albert\'s suggestion for this path, so an extension can be accepted here', () => {
    renderSection(false);
    expect(screen.getByTestId('stub-proposal-plan-1')).toBeTruthy();
  });

  it('shows a free user the upgrade prompt in place of the box', () => {
    renderSection(true);
    expect(screen.queryByTestId('situation-change-text')).toBeNull();
    fireEvent.press(screen.getByTestId('situation-change-upgrade'));
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });
});
