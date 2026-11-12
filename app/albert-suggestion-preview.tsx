import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { AlbertProgress, albertBarStatuses } from '@/components/albert/AlbertSteps';
import { AlbertTabIcon } from '@/components/albert/AlbertTabIcon';
import { Icon, type IconName } from '@/components/ui/Icon';
import { TAB_BAR_HEIGHT } from '@/lib/safeArea';
import { colors, font, fontSize, radius, shadow, spacing } from '@/theme';

const TABS: { name: IconName; label: string }[] = [
  { name: 'home', label: 'Home' },
  { name: 'progress', label: 'Progress' },
  { name: 'profile', label: 'Profile' },
  { name: 'tracks', label: 'Tracks' },
  { name: 'albert', label: 'Albert' },
];

/** The tab bar as the app draws it, with the person on `active`; the Albert tab carries the dot when `waiting`. */
function MockTabBar({ active, waiting }: { active: IconName; waiting: boolean }) {
  return (
    <View testID={`mock-tab-bar-${active}-${waiting ? 'waiting' : 'clear'}`} style={styles.bar}>
      {TABS.map(tab => {
        const focused = tab.name === active;
        const color = focused ? colors.brand : colors.textSubtle;
        return (
          <View key={tab.name} style={styles.tab}>
            {tab.name === 'albert'
              ? <AlbertTabIcon color={color} focused={focused} badge={waiting} />
              : <Icon name={tab.name} size={24} color={color} fill={focused ? color : 'none'} />}
            <Text style={[styles.tabLabel, { color }]}>{tab.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Dev-only (reached from Profile in development): what a person sees when Albert has a suggestion
 * waiting, next to what they see when not. Made-up state; nothing is read or sent.
 */
export default function AlbertSuggestionPreviewScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {[false, true].map(waiting => (
          <View key={String(waiting)} style={styles.block}>
            <Text style={styles.title}>{waiting ? 'Suggestion waiting' : 'Nothing to review'}</Text>
            <View style={styles.row}>
              <AlbertTabIcon color={colors.brand} focused badge={waiting} />
              <Text style={styles.note}>Albert tab</Text>
            </View>
            <AlbertProgress statuses={albertBarStatuses('unfinished', waiting)} />
            <MockTabBar active="home" waiting={waiting} />
            <MockTabBar active="albert" waiting={waiting} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, gap: spacing.xl },
  block:   { gap: spacing.md },
  title:   { fontFamily: font.black, fontSize: 22, color: colors.textStrong },
  row:     { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  bar: {
    height:          TAB_BAR_HEIGHT,
    flexDirection:   'row',
    borderRadius:    radius.pill,
    borderWidth:     1,
    borderColor:     colors.borderSubtle,
    backgroundColor: colors.surface,
    ...shadow.md,
  },
  tab:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xs },
  tabLabel: { fontFamily: font.medium, fontSize: fontSize.xs },
  note:    { fontFamily: font.regular, fontSize: 15, color: colors.textMuted },
});
