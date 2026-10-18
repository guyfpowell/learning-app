import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { LessonRatingControl } from '../LessonRatingControl';
import { useSetLessonRating } from '@/hooks/useLesson';

jest.mock('@/hooks/useLesson', () => ({ useSetLessonRating: jest.fn() }));

const mutate = jest.fn();

function setup(rating: 'up' | 'down' | null = null, pending = false) {
  (useSetLessonRating as jest.Mock).mockReturnValue({ mutate, isPending: pending });
  return render(<LessonRatingControl lessonId="l1" rating={rating} />);
}

describe('LessonRatingControl', () => {
  beforeEach(() => mutate.mockReset());

  it('thumbs up sends "up"', () => {
    const { getByLabelText } = setup();
    fireEvent.press(getByLabelText('Thumbs up'));
    expect(mutate).toHaveBeenCalledWith({ lessonId: 'l1', rating: 'up' }, expect.any(Object));
  });

  it('thumbs down sends "down"', () => {
    const { getByLabelText } = setup();
    fireEvent.press(getByLabelText('Thumbs down'));
    expect(mutate).toHaveBeenCalledWith({ lessonId: 'l1', rating: 'down' }, expect.any(Object));
  });

  it('re-tapping the selected thumb clears with null', () => {
    const { getByLabelText } = setup('up');
    expect(getByLabelText('Thumbs up').props.accessibilityState).toMatchObject({ selected: true });
    fireEvent.press(getByLabelText('Thumbs up'));
    expect(mutate).toHaveBeenCalledWith({ lessonId: 'l1', rating: null }, expect.any(Object));
  });

  it('the other thumb replaces the stored one', () => {
    const { getByLabelText } = setup('up');
    fireEvent.press(getByLabelText('Thumbs down'));
    expect(mutate).toHaveBeenCalledWith({ lessonId: 'l1', rating: 'down' }, expect.any(Object));
  });

  it('shows the pick immediately and reverts when the save fails', async () => {
    const { getByLabelText } = setup('up');
    fireEvent.press(getByLabelText('Thumbs down'));
    expect(getByLabelText('Thumbs down').props.accessibilityState).toMatchObject({ selected: true });
    act(() => { mutate.mock.calls[0][1].onError(new Error('x')); });
    await waitFor(() =>
      expect(getByLabelText('Thumbs up').props.accessibilityState).toMatchObject({ selected: true }));
  });

  it('ignores taps while a save is in flight', () => {
    const { getByLabelText } = setup(null, true);
    fireEvent.press(getByLabelText('Thumbs up'));
    expect(mutate).not.toHaveBeenCalled();
  });
});
