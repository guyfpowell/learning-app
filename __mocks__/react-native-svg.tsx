/**
 * Manual mock for react-native-svg — ticket 069 A3.
 *
 * SVG native modules are unavailable in Jest's JS environment. This mock
 * returns the minimal subset the app uses: Svg (a passthrough View),
 * Circle, Path, G (all null). Add others if new SVG elements are imported.
 */
import React from 'react';
import { View } from 'react-native';

const Svg = ({ children, testID }: { children?: React.ReactNode; testID?: string }) => (
  <View testID={testID}>{children}</View>
);

const Circle = () => null;
const Path = () => null;
const G = () => null;
const Rect = () => null;
const Ellipse = () => null;
const Line = () => null;
const Polyline = () => null;
const Polygon = () => null;
const Text = () => null;
const Defs = () => null;
const LinearGradient = () => null;
const RadialGradient = () => null;
const ClipPath = () => null;
const Mask = () => null;
const Use = () => null;
const Stop = () => null;
const Symbol = () => null;
const SvgXml = ({ testID }: { testID?: string }) => <View testID={testID} />;

export default Svg;
export {
  Svg,
  Circle,
  Path,
  G,
  Rect,
  Ellipse,
  Line,
  Polyline,
  Polygon,
  Text,
  Defs,
  LinearGradient,
  RadialGradient,
  ClipPath,
  Mask,
  Use,
  Stop,
  Symbol,
  SvgXml,
};
