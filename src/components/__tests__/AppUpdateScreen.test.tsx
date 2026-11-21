import { Linking, Modal, Platform } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { APP_UPDATE_COPY, ERROR_CODES, ERROR_MESSAGES } from '@learning/shared';
import { must } from '@/test-utils/must';
import { useAppUpdateStore } from '@/store/appUpdate.store';
import { AppUpdateScreen } from '../AppUpdateScreen';

const IOS_URL = 'https://apps.apple.com/app/test-app/id1';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=test.app';

const mockExpoConfig: { ios?: { appStoreUrl?: string }; android?: { playStoreUrl?: string } } = {};
jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    get expoConfig() {
      return mockExpoConfig;
    },
  },
}));

jest.mock('@sentry/react-native', () => ({ addBreadcrumb: jest.fn() }));

function showScreen() {
  render(<AppUpdateScreen />);
  act(() => useAppUpdateStore.getState().require());
}

function pressUpdate() {
  fireEvent.press(must(screen.getByTestId('app-update-button'), 'the update button'));
}

describe('AppUpdateScreen', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    useAppUpdateStore.setState({ required: false });
    mockExpoConfig.ios = { appStoreUrl: IOS_URL };
    mockExpoConfig.android = { playStoreUrl: ANDROID_URL };
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    openURL.mockClear();
  });

  afterEach(() => jest.restoreAllMocks());

  it('shows nothing until the API turns the app away', () => {
    render(<AppUpdateScreen />);
    expect(screen.queryByText(APP_UPDATE_COPY.title)).toBeNull();
  });

  it('shows the shared title, message and button', () => {
    showScreen();
    expect(screen.getByText(APP_UPDATE_COPY.title)).toBeTruthy();
    expect(screen.getByText(ERROR_MESSAGES[ERROR_CODES.APP_UPDATE_REQUIRED])).toBeTruthy();
    expect(screen.getByText(APP_UPDATE_COPY.button)).toBeTruthy();
  });

  it('can not be dismissed: Back (onRequestClose) leaves it showing, and there is no close control', () => {
    showScreen();
    const modal = screen.UNSAFE_getByType(Modal);
    const onRequestClose: () => void = modal.props.onRequestClose;
    act(() => { onRequestClose(); });
    expect(screen.getByText(APP_UPDATE_COPY.title)).toBeTruthy();
    expect(useAppUpdateStore.getState().required).toBe(true);
    expect(screen.queryByLabelText(/close|dismiss|back/i)).toBeNull();
  });

  it('the button opens the iOS store URL on iOS', () => {
    showScreen();
    pressUpdate();
    expect(openURL).toHaveBeenCalledWith(IOS_URL);
  });

  it('the button opens the Play Store URL on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    showScreen();
    pressUpdate();
    expect(openURL).toHaveBeenCalledWith(ANDROID_URL);
  });

  it('with no URL in the config the button does nothing and does not throw', () => {
    delete mockExpoConfig.ios;
    showScreen();
    expect(() => pressUpdate()).not.toThrow();
    expect(openURL).not.toHaveBeenCalled();
  });
});
