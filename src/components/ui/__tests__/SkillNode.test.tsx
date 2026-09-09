import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { SkillNode } from '../SkillNode';

describe('SkillNode', () => {
  it('renders the level label', () => {
    render(<SkillNode state="done" label="Beginner" />);
    expect(screen.getByText('Beginner')).toBeTruthy();
  });

  it('renders all three states without throwing', () => {
    const states = ['done', 'active', 'locked'] as const;
    states.forEach((state) => {
      const { unmount } = render(<SkillNode state={state} label="Level" />);
      expect(screen.getByText('Level')).toBeTruthy();
      unmount();
    });
  });

  it('accepts a progress value for active state', () => {
    const { toJSON } = render(<SkillNode state="active" label="Intermediate" progress={0.6} />);
    expect(toJSON()).toBeTruthy();
  });

  it('accepts a testID', () => {
    render(<SkillNode state="done" label="Beginner" testID="node-beginner" />);
    expect(screen.getByTestId('node-beginner')).toBeTruthy();
  });
});
