import { render } from '@testing-library/react-native';
import { TrackIcon, TRACK_ICON_PATHS } from '../TrackIcon';

describe('TrackIcon', () => {
  it('has a glyph for each of the 13 tracks', () => {
    expect(Object.keys(TRACK_ICON_PATHS)).toHaveLength(13);
  });

  it('draws nothing for a track with no glyph', () => {
    expect(render(<TrackIcon trackId={99} />).toJSON()).toBeNull();
  });

  it('draws a glyph for a track id, given as a number or a string', () => {
    expect(render(<TrackIcon trackId={1} />).toJSON()).not.toBeNull();
    expect(render(<TrackIcon trackId="13" />).toJSON()).not.toBeNull();
  });
});
