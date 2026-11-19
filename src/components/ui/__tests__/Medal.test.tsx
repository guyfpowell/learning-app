import fs from 'fs';
import path from 'path';
import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { ACHIEVEMENTS_BY_KEY } from '@learning/shared';
import { medal } from '@/theme';
import { Medal } from '../Medal';

describe('Medal', () => {
  it('has no gold finish: the medal theme holds only cobalt and the unlock screen\'s shade', () => {
    expect(Object.keys(medal)).toEqual(['cobalt', 'shade']);
  });

  it('has no file that imports the app\'s deleted art file, key helper, drawing or colour mixer', () => {
    const SRC = path.resolve(__dirname, '../../..');
    const files = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)]));
    const importers = files(SRC).filter(f => /\.tsx?$/.test(f) && f !== __filename && /medals\.json|lib\/medalKey|medalKeyOf|lib\/medalDrawing|lib\/mixHex/.test(fs.readFileSync(f, 'utf8')));
    expect(importers).toEqual([]);
  });

  it('draws a medal', () => {
    render(<Medal definition={ACHIEVEMENTS_BY_KEY['clean-sheet']} />);
    expect(screen.getByTestId('medal-clean-sheet')).toBeTruthy();
  });

  it('draws a locked summit medal', () => {
    render(<Medal definition={ACHIEVEMENTS_BY_KEY['full-marks']} locked />);
    expect(screen.getByTestId('medal-full-marks')).toBeTruthy();
  });

  it('draws a landmark', () => {
    render(<Medal definition={ACHIEVEMENTS_BY_KEY.everest} />);
    expect(screen.getByTestId('medal-everest')).toBeTruthy();
  });

  it('draws nothing for a Trailhead step', () => {
    expect(render(<Medal definition={ACHIEVEMENTS_BY_KEY['first-light']} />).toJSON()).toBeNull();
  });
});
