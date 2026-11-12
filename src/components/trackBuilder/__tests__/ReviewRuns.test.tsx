import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { ReviewRuns } from '../ReviewRuns';

const runs = [
  { need: 'Understand the job', topics: [{ stableKey: 'a', topicName: 'What the job is', level: 'Beginner' }, { stableKey: 'b', topicName: 'Paths in', level: 'Beginner' }] },
  { need: 'Learn the toolkit', topics: [{ stableKey: 'c', topicName: 'Roadmaps', level: 'Intermediate' }] },
  { need: '', topics: [{ stableKey: 'd', topicName: 'Loose topic', level: 'Advanced' }] },
];

describe('ReviewRuns', () => {
  it('lists each goal with its number and topic count, the first open to begin with', () => {
    render(<ReviewRuns runs={runs} />);
    expect(screen.getByText('Understand the job')).toBeTruthy();
    expect(screen.getByText('2 topics')).toBeTruthy();
    expect(screen.getByText('1 topic')).toBeTruthy();
    expect(screen.getByText('What the job is')).toBeTruthy();
    expect(screen.queryByText('Roadmaps')).toBeNull();
  });

  it('opens another goal and closes the first: one at a time', () => {
    render(<ReviewRuns runs={runs} />);
    fireEvent.press(screen.getByTestId('run-toggle-1'));
    expect(screen.getByText('Roadmaps')).toBeTruthy();
    expect(screen.queryByText('What the job is')).toBeNull();
  });

  it('closes an open goal when it is tapped again', () => {
    render(<ReviewRuns runs={runs} />);
    fireEvent.press(screen.getByTestId('run-toggle-0'));
    expect(screen.queryByText('What the job is')).toBeNull();
  });

  it('shows each topic\'s level', () => {
    render(<ReviewRuns runs={runs} />);
    expect(screen.getAllByText('Beginner')).toHaveLength(2);
  });

  it('lists a run with no stated need without a heading to fold under', () => {
    render(<ReviewRuns runs={runs} />);
    expect(screen.getByText('Loose topic')).toBeTruthy();
    expect(screen.queryByTestId('run-toggle-2')).toBeNull();
  });
});
