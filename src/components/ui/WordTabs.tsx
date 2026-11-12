import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { wordAlign } from '@/components/ui/WordChoice';
import { colors, font } from '@/theme';

const ROW_HEIGHT = 50;
const UNDERLINE = 3;

interface WordTabsProps<T extends string> {
  tabs: readonly { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
  /** The open tab's colour: the level's. */
  color: string;
  /** Tabs get `testID` `${testIDPrefix}-${key}`. */
  testIDPrefix: string;
}

/** Tabs as words between two rules: the first at the left, the last at the right, the open one in colour with an underline. */
export function WordTabs<T extends string>({ tabs, selected, onSelect, color, testIDPrefix }: WordTabsProps<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.row}>
      {tabs.map((tab, index) => {
        const open = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            testID={`${testIDPrefix}-${tab.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: open }}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, { alignItems: wordAlign(index, tabs.length) }]}
          >
            <Text style={[styles.label, open && { fontFamily: font.extrabold, color }]}>{tab.label}</Text>
            {open && <View testID={`${testIDPrefix}-${tab.key}-underline`} style={[styles.underline, { backgroundColor: color }]} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    borderTopWidth:    1,
    borderBottomWidth: 1,
    borderColor:       colors.border,
  },
  tab:   { flex: 1, height: ROW_HEIGHT, justifyContent: 'center' },
  label: { fontFamily: font.bold, fontSize: 17, color: colors.textSubtle },
  underline: {
    position: 'absolute',
    start:    0,
    end:      0,
    bottom:   0,
    height:   UNDERLINE,
  },
});
