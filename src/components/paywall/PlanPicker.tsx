import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { colors, font, fontSize, radius, spacing, shadow } from '@/theme';
import { PLAN_OPTIONS, PRICE_UNAVAILABLE, type PlanKey } from '@/lib/paywallPlans';
import type { IAPOffering } from '@/hooks/useIAP';

/** The radio dot's diameter. */
const RADIO_SIZE = 20;
/** The width of a plan card's border and of the empty radio's ring. */
const BORDER_WIDTH = 2;

/** One card per plan, priced from the store's offering, with the selected one marked. */
export function PlanPicker({ offering, selected, onSelect }: {
  offering: IAPOffering | undefined;
  selected: PlanKey;
  onSelect: (key: PlanKey) => void;
}) {
  return (
    <View style={styles.plans}>
      {PLAN_OPTIONS.map(({ key, label, period, badge }) => {
        const isSelected = selected === key;
        return (
          <Pressable
            key={key}
            testID={`plan-${key}-card`}
            onPress={() => onSelect(key)}
            style={[styles.planCard, isSelected && styles.planCardSelected]}
          >
            <View style={styles.planCardLeft}>
              {isSelected
                ? <View testID={`plan-${key}-selected`} style={styles.radioFilled} />
                : <View style={styles.radioEmpty} />}
              <View>
                <Text style={styles.planLabel}>{label}</Text>
                <Text style={styles.planPeriod}>{period}</Text>
              </View>
            </View>
            <View style={styles.planCardRight}>
              {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
              <Text testID={`plan-${key}-price`} style={styles.planPrice}>
                {offering?.[key]?.product.priceString ?? PRICE_UNAVAILABLE}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  plans: {
    gap: spacing.sm,
  },
  planCard: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         spacing.md,
    borderRadius:    radius.card,
    borderWidth:     BORDER_WIDTH,
    borderColor:     colors.borderSubtle,
    backgroundColor: colors.surface,
    ...shadow.card,
  },
  planCardSelected: {
    borderColor:     colors.brand,
    backgroundColor: colors.brandSoft,
  },
  planCardLeft: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.sm,
  },
  planCardRight: {
    alignItems: 'flex-end',
    gap:        spacing.xs,
  },
  radioEmpty: {
    width:        RADIO_SIZE,
    height:       RADIO_SIZE,
    borderRadius: radius.pill,
    borderWidth:  BORDER_WIDTH,
    borderColor:  colors.border,
  },
  radioFilled: {
    width:           RADIO_SIZE,
    height:          RADIO_SIZE,
    borderRadius:    radius.pill,
    backgroundColor: colors.brand,
  },
  planLabel: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  planPeriod: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textMuted,
  },
  planPrice: {
    fontFamily: font.semibold,
    fontSize:   fontSize.base,
    color:      colors.textStrong,
  },
  badge: {
    backgroundColor:   colors.brand,
    borderRadius:      radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical:   2,
  },
  badgeText: {
    fontFamily: font.medium,
    fontSize:   fontSize.xs,
    color:      colors.textOnBrand,
  },
});
