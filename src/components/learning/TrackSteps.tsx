/**
 * The pieces the track pages share (board 15, 5.01 to 5.03): a status box for a topic or lesson,
 * and the headers of a level's page and a topic's page. Colours come from the level.
 */
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Icon } from '@/components/ui/Icon';
import { colors, font, levelCard, spacing } from '@/theme';
import { capitalize } from '@/lib/capitalize';
import { levelOfGroup } from '@/lib/groupLevel';
import type { TrackContentsGroup, TrackContentsTopic } from '@learning/shared';

export type StepStatus = 'done' | 'started' | 'todo' | 'skipped';

const BOX = 24;

/** Done is filled with a tick; started is a ring with a square in it; to do is an empty ring. */
export function StatusBox({ status, color, testID, size = BOX }: { status: StepStatus; color: string; testID?: string; size?: number }) {
  const box = { width: size, height: size };
  if (status === 'done') {
    return (
      <View testID={testID} style={[styles.box, box, { backgroundColor: color }]}>
        <Icon name="check" size={size * 0.58} color={colors.white} strokeWidth={3.2} />
      </View>
    );
  }
  const ring = status === 'started' ? color : colors.borderStrong;
  return (
    <View testID={testID} style={[styles.box, box, styles.ring, { borderColor: ring }]}>
      {status === 'started' && <View style={[styles.inner, { backgroundColor: color }]} />}
      {status === 'skipped' && <View style={styles.dash} />}
    </View>
  );
}

/** A thin bar of one segment per lesson (a topic's page) or one bar (a level's page). */
export function SegmentBar({ segments, color }: { segments: boolean[]; color: string }) {
  return (
    <View style={styles.segments}>
      {segments.map((done, i) => (
        <View key={i} style={[styles.segment, { backgroundColor: done ? color : colors.border }]} />
      ))}
    </View>
  );
}

/** The level's small colour square and its caption, above a title. */
function Eyebrow({ color, text }: { color: string; text: string }) {
  return (
    <View style={styles.eyebrow}>
      <View style={[styles.square, { backgroundColor: color }]} />
      <Text style={[styles.eyebrowText, { color }]}>{text}</Text>
    </View>
  );
}

const isTopicComplete = (t: TrackContentsTopic) => !t.unresolved && t.totalLessons > 0 && t.completedLessons === t.totalLessons;

/** The head of a level's page: which level it is, its name, its bar and its counts. */
export function LevelHeader({ group, index, count, curated }: { group: TrackContentsGroup; index: number; count: number; curated: boolean }) {
  const color = levelCard[levelOfGroup(group.key)].base;
  const pct = group.totalLessons > 0 ? (group.completedLessons / group.totalLessons) * 100 : 0;
  const topicsDone = group.topics.filter(isTopicComplete).length;
  return (
    <View style={styles.header}>
      <Eyebrow color={color} text={`${curated ? 'Level' : 'Part'} ${index + 1} of ${count}`} />
      <Text testID="track-detail-subheading" style={[styles.title, group.label.length > LONG_LABEL && styles.titleLong, { color }]}>{capitalize(group.label)}</Text>
      <View style={styles.counts}>
        <View style={styles.bar}>
          <View style={[styles.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }, pct > 0 && styles.barMin]} />
        </View>
        <Text style={styles.countText}>
          {group.completedLessons} of {group.totalLessons} lessons · {topicsDone} of {group.topics.length} topics complete
        </Text>
      </View>
    </View>
  );
}

/** The head of a topic's page: its level and place, its name, one segment per lesson, and the count. */
export function TopicHeader({ group, topic, index }: { group: TrackContentsGroup; topic: TrackContentsTopic; index: number }) {
  const color = levelCard[levelOfGroup(group.key)].base;
  return (
    <View style={styles.header}>
      <Eyebrow color={color} text={`${capitalize(group.label)} · Topic ${index + 1}`} />
      <Text testID="track-detail-subheading" style={styles.topicTitle}>{topic.name}</Text>
      <SegmentBar segments={topic.lessons.map(l => l.status === 'complete')} color={color} />
      <Text style={styles.countText}>{topic.completedLessons} of {topic.totalLessons} lessons</Text>
    </View>
  );
}

/** A custom path's level is a whole sentence: past this length its title drops to the topic title's size. */
const LONG_LABEL = 28;
const TITLE_SIZE = 34;
const TOPIC_TITLE_SIZE = 24;

const styles = StyleSheet.create({
  box:  { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  ring: { borderWidth: 2 },
  inner: { width: 10, height: 10, borderRadius: 3 },
  dash:  { width: 10, height: 2, borderRadius: 1, backgroundColor: colors.textSubtle },

  segments: { flexDirection: 'row', gap: spacing.xs },
  segment:  { flex: 1, height: 6, borderRadius: 3 },

  header:  { gap: spacing.sm3, marginBottom: spacing.md },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  square:  { width: 12, height: 12, borderRadius: 4 },
  eyebrowText: { fontFamily: font.bold, fontSize: 13 },
  title: {
    fontFamily:    font.black,
    fontSize:      TITLE_SIZE,
    lineHeight:    TITLE_SIZE,
    letterSpacing: -0.04 * TITLE_SIZE,
    color:         colors.textStrong,
  },
  titleLong: { fontSize: TOPIC_TITLE_SIZE, lineHeight: TOPIC_TITLE_SIZE * 1.06, letterSpacing: -0.035 * TOPIC_TITLE_SIZE },
  topicTitle: {
    fontFamily:    font.black,
    fontSize:      TOPIC_TITLE_SIZE,
    lineHeight:    TOPIC_TITLE_SIZE * 1.06,
    letterSpacing: -0.035 * TOPIC_TITLE_SIZE,
    color:         colors.textStrong,
  },
  counts:    { gap: spacing.sm },
  bar:       { height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  barFill:   { height: 6, borderRadius: 3 },
  barMin:    { minWidth: 6 },
  countText: { fontFamily: font.bold, fontSize: 13, color: colors.textBody },
});
