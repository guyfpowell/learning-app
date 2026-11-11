import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';

/**
 * Ascent custom icon set. 24pt grid, 2pt stroke, round caps and joins.
 * Replaces @expo/vector-icons Ionicons. Pass fill for the solid states
 * (active tab, saved bookmark, XP gem, streak flame).
 */
export const ICON_PATHS = {
  "home": "M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9v5.5H5.5A1.5 1.5 0 0 1 4 19z",
  "progress": "M4 13h3.5v7H4zM10.25 4h3.5v16h-3.5zM16.5 9H20v11h-3.5z",
  "profile": "M12 11.5a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5zM4.5 20.5c.9-3.6 3.9-5.75 7.5-5.75s6.6 2.15 7.5 5.75z",
  "tracks": "M3.5 4.5h4v15h-4zM9.5 4.5h4v15h-4zM15.4 6.4l3.4-.9 3 12.4-3.4.9z",
  "albert": "M11 3l1.9 5.6L18.5 10.5l-5.6 1.9L11 18l-1.9-5.6L3.5 10.5l5.6-1.9zM18.5 15l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z",
  "back": "M15 5l-7 7 7 7",
  "close": "M6 6l12 12M18 6 6 18",
  "forward": "M9 5l7 7-7 7",
  "expand": "M5 9l7 7 7-7",
  "next": "M4 12h16M14 6l6 6-6 6",
  "check": "M5 12.5l4.5 4.5L19 7.5",
  "correct": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8 12.3l2.8 2.8L16 9.5",
  "incorrect": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9 9l6 6M15 9l-6 6",
  "save": "M6.5 3.5h11v17L12 16.5l-5.5 4z",
  "saved": "M6.5 3.5h11v17L12 16.5l-5.5 4z",
  "like": "M7 10.5v10H4v-10zM7 10.5l4-7c1.7 0 2.8 1.4 2.4 3l-.8 3.5h5.6a2 2 0 0 1 2 2.4l-1.4 6.6a2 2 0 0 1-2 1.5H7",
  "dislike": "M7 13.5v-10H4v10zM7 13.5l4 7c1.7 0 2.8-1.4 2.4-3l-.8-3.5h5.6a2 2 0 0 0 2-2.4l-1.4-6.6a2 2 0 0 0-2-1.5H7",
  "locked": "M6 10.5h12v10H6zM8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2",
  "reminder": "M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15zM10 20.5h4",
  "time": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7.5V12l3 2",
  "settings": "M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4",
  "search": "M10.5 17.5a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM15.5 15.5l5 5",
  "add": "M12 5v14M5 12h14",
  "endOfTopic": "M5.5 21V4M5.5 4.5h12l-2.5 4 2.5 4h-12",
  "xp": "M12 3l7.5 4.3v9.4L12 21l-7.5-4.3V7.3zM12 8l3.2 4-3.2 4-3.2-4z",
  "streak": "M12 21c-3.6 0-6.2-2.5-6.2-5.8 0-3.6 3-5.3 3.7-9.7 2.5 1.6 3.7 3.6 3.7 5.8 1-.7 1.7-1.8 1.9-3 1.8 1.7 3.1 4.2 3.1 6.9 0 3.3-2.6 5.8-6.2 5.8z",
  "achievements": "M7.5 4h9v5a4.5 4.5 0 0 1-9 0zM7.5 6h-3a3 3 0 0 0 3 4M16.5 6h3a3 3 0 0 1-3 4M12 13.5V17M9.5 17h5v3.5h-5z",
  "share": "M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-6.5",
  "rename": "M14.5 5.5l4 4L9 19H5v-4zM12.5 7.5l4 4",
  "delete": "M4.5 6.5h15M9.5 6.5V4h5v2.5M6.5 6.5l1 14h9l1-14M10 10.5v6M14 10.5v6",
  "info": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.8v.2",
  "warning": "M12 3.5 21.5 20h-19zM12 10v4.5M12 17.3v.2",
  "openLink": "M14 4h6v6M20 4l-8.5 8.5M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10",
  "retake": "M20 12a8 8 0 1 1-2.3-5.6M20 4v4.5h-4.5",
  "signOut": "M10 4.5H5.5v15H10M15 8l4 4-4 4M19 12H9.5",
  "email": "M3.5 6h17v12h-17zM3.5 7l8.5 6.5L20.5 7",
  "calendar": "M4 6h16v14H4zM4 10h16M8.5 3.5v4M15.5 3.5v4",
  "premium": "M4 18h16l1-10-5 4-4-6-4 6-5-4zM4 21h16",
  "aboutRight": "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z",
  "team": "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.8-3.4 3.4-5.5 6.5-5.5s5.7 2.1 6.5 5.5M16 4.3a3.5 3.5 0 0 1 0 6.4M17.5 14.8c2 .7 3.4 2.6 4 5.2"
} as const;

export type IconName = keyof typeof ICON_PATHS;

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  fill?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 24, color = colors.textStrong, fill = 'none', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICON_PATHS[name]} />
    </Svg>
  );
}
