import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { PATH_NAME_MAX } from '@learning/shared';
import { RenamableHeading } from '../RenamableHeading';

function setup(onSave: ((name: string) => Promise<void>) | null, name = 'Head of refresher') {
  return render(<RenamableHeading name={name} onSave={onSave} />);
}

const input = () => screen.getByTestId('rename-input');

async function submit(text: string) {
  fireEvent.changeText(input(), text);
  await act(async () => { fireEvent(input(), 'submitEditing'); });
}

describe('RenamableHeading', () => {
  it('shows the name as the heading', () => {
    setup(jest.fn());
    expect(screen.getByText('Head of refresher')).toBeTruthy();
    expect(screen.queryByTestId('rename-input')).toBeNull();
  });

  it('is plain text when there is nothing to save to', () => {
    setup(null);
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    expect(screen.queryByTestId('rename-input')).toBeNull();
  });

  it('turns into an input holding the name when tapped, with the same limit as naming a new path', () => {
    setup(jest.fn());
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    expect(input().props.value).toBe('Head of refresher');
    expect(input().props.maxLength).toBe(PATH_NAME_MAX);
  });

  it('saves the trimmed name on submit and goes back to the heading', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    setup(onSave);
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    await submit('  Director path  ');
    expect(onSave).toHaveBeenCalledWith('Director path');
    expect(screen.queryByTestId('rename-input')).toBeNull();
  });

  it('saves when Save is tapped', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined);
    setup(onSave);
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    fireEvent.changeText(input(), 'Director path');
    await act(async () => { fireEvent.press(screen.getByTestId('rename-save')); });
    expect(onSave).toHaveBeenCalledWith('Director path');
    expect(screen.queryByTestId('rename-input')).toBeNull();
  });

  it('puts the old name back, saving nothing, when Cancel is tapped', () => {
    const onSave = jest.fn();
    setup(onSave);
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    fireEvent.changeText(input(), 'Director path');
    fireEvent.press(screen.getByTestId('rename-cancel'));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Head of refresher')).toBeTruthy();
  });

  it.each([['an empty name', ''], ['only spaces', '   '], ['the same name', 'Head of refresher']])(
    'does not save %s',
    async (_label, text) => {
      const onSave = jest.fn();
      setup(onSave);
      fireEvent.press(screen.getByTestId('track-detail-heading'));
      await submit(text);
      expect(onSave).not.toHaveBeenCalled();
      expect(screen.getByText('Head of refresher')).toBeTruthy();
    },
  );

  it('saves once when Save is tapped again while the first save is still going', async () => {
    const onSave = jest.fn(() => new Promise<void>(() => {}));
    setup(onSave);
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    await submit('Director path');
    await act(async () => { fireEvent.press(screen.getByTestId('rename-save')); });
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it('shows the server\'s message and stays in the input when the save fails', async () => {
    const onSave = jest.fn().mockRejectedValue({ response: { data: { message: 'That name is not allowed.' } } });
    setup(onSave);
    fireEvent.press(screen.getByTestId('track-detail-heading'));
    await submit('Director path');
    expect(screen.getByTestId('rename-error').props.children).toBe('That name is not allowed.');
    expect(input().props.value).toBe('Director path');
  });
});
