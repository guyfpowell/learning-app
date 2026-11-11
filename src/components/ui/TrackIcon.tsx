import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Track glyphs, one per track. Same grid as Icon.tsx: 24pt, 2pt stroke, round caps and joins.
 * Keys match the ids in assets/track-model/track-names.json.
 */
export const TRACK_ICON_PATHS: Record<string, string> = {
  "1": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM15.5 8.5l-2 5-5 2 2-5z", // Product Strategy
  "2": "M10 16.5a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM14.8 14.8 20.5 20.5M10 7.5v5M7.5 10h5", // Discovery & Research
  "3": "M3.5 7.5 12 3.5l8.5 4v9L12 20.5l-8.5-4zM3.5 7.5 12 11.5l8.5-4M12 11.5v9", // Execution & Delivery
  "4": "M4 4v16h16M7.5 15l3.5-4 3 2.5 5.5-6", // Metrics & Analytics
  "5": "M2.5 20.5 9.5 10l3.5 5 2-3 6.5 8.5zM9.5 10V3.5l4.5 1.75-4.5 1.75", // Leadership & Influence
  "6": "M12 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM19 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM10.8 7.8 6.2 16.2M13.2 7.8l4.6 8.4M7.5 18.5h9", // Stakeholder Management
  "7": "M12 2.5c3 2.2 4.4 5.6 4 10L14 16h-4l-2-3.5c-.4-4.4 1-7.8 4-10zM10 16l-2.5 4.5M14 16l2.5 4.5M12 9v.1", // Go-to-Market & Launch
  "8": "M4 5h16v11h-9l-4.5 3.5V16H4zM8 9.5h8M8 12.5h5", // Product Communication
  "9": "M7 7h10v10H7zM10 10h4v4h-4zM9.5 3.5V7M14.5 3.5V7M9.5 17v3.5M14.5 17v3.5M3.5 9.5H7M3.5 14.5H7M17 9.5h3.5M17 14.5h3.5", // AI for Product Managers
  "10": "M12 3.5l8.5 4.5L12 12.5 3.5 8zM3.5 12 12 16.5l8.5-4.5M3.5 16 12 20.5l8.5-4.5", // AI for Product Builders
  "11": "M3.5 20h5v-5h5v-5h5V5h2", // Product Careers
  "12": "M5 19l3.2-9.2L15.5 5l3.5 3.5-4.8 7.3zM5 19l5.4-5.4M12 12.5a1.2 1.2 0 1 0 0 .1", // Product Design & UX for PMs
  "13": "M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15", // Technical Skills for PMs
};

interface TrackIconProps {
  trackId: string | number;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function TrackIcon({ trackId, size = 24, color = colors.textStrong, strokeWidth = 2 }: TrackIconProps) {
  const d = TRACK_ICON_PATHS[String(trackId)];
  if (!d) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
