import { Modal, Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { SheetModal } from '../SheetModal';

describe('SheetModal', () => {
  it('has no native slide, so the grey scrim does not travel with the sheet', () => {
    const { UNSAFE_getByType } = render(<SheetModal scrimTestID="scrim" onClose={jest.fn()}><Text>Sheet</Text></SheetModal>);
    expect(UNSAFE_getByType(Modal).props.animationType).toBe('none');
  });

  it('shows its children', () => {
    const { getByText } = render(<SheetModal scrimTestID="scrim" onClose={jest.fn()}><Text>Sheet</Text></SheetModal>);
    expect(getByText('Sheet')).toBeTruthy();
  });

  it('closes when the scrim is pressed, but not when the sheet is', () => {
    const onClose = jest.fn();
    const { getByTestId, getByText } = render(<SheetModal scrimTestID="scrim" onClose={onClose}><Text>Sheet</Text></SheetModal>);
    fireEvent.press(getByText('Sheet'));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.press(getByTestId('scrim'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the scrim is not an ancestor of the sheet', () => {
    const { getByTestId, getByText } = render(<SheetModal scrimTestID="scrim" onClose={jest.fn()}><Text>Sheet</Text></SheetModal>);
    let node = getByText('Sheet').parent;
    while (node) {
      expect(node.props.testID).not.toBe('scrim');
      node = node.parent;
    }
    expect(getByTestId('scrim')).toBeTruthy();
  });
});
