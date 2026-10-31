import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font, fontSize, spacing } from '@/theme';

interface TabBarProps<T extends string> {
  tabs: readonly { key: T; label: string }[];
  selected: T;
  onSelect: (key: T) => void;
  /** Tabs get `testID` `${testIDPrefix}-${key}`. */
  testIDPrefix: string;
}

/** A row of equal-width text tabs over a hairline, the selected one in the brand colour with an underline. */
export function TabBar<T extends string>({ tabs, selected, onSelect, testIDPrefix }: TabBarProps<T>) {
  return (
    <View accessibilityRole="tablist" style={styles.bar}>
      {tabs.map((tab) => {
        const isSelected = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            testID={`${testIDPrefix}-${tab.key}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(tab.key)}
            style={[styles.tab, isSelected && styles.tabSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabSelected: { borderBottomColor: colors.brand },
  label: { fontFamily: font.medium, fontSize: fontSize.base, color: colors.textMuted },
  labelSelected: { color: colors.brand },
});
