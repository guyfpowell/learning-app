import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { BookmarkButton } from '../BookmarkButton';

describe('BookmarkButton', () => {
  it('has a "Save lesson" accessibility label when unsaved', () => {
    render(<BookmarkButton saved={false} onToggle={jest.fn()} />);
    expect(screen.getByLabelText('Save lesson')).toBeTruthy();
  });

  it('has a "Remove from saved lessons" accessibility label when saved', () => {
    render(<BookmarkButton saved onToggle={jest.fn()} />);
    expect(screen.getByLabelText('Remove from saved lessons')).toBeTruthy();
  });

  it('calls onToggle when pressed', () => {
    const onToggle = jest.fn();
    render(<BookmarkButton saved={false} onToggle={onToggle} />);
    fireEvent.press(screen.getByLabelText('Save lesson'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does not call onToggle when disabled', () => {
    const onToggle = jest.fn();
    render(<BookmarkButton saved={false} onToggle={onToggle} disabled />);
    fireEvent.press(screen.getByLabelText('Save lesson'));
    expect(onToggle).not.toHaveBeenCalled();
  });
});
