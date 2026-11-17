import { useState, useEffect, useCallback } from 'react';
import { NativeTabs } from 'expo-router/native-tabs';
import { View, AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VerifyEmailBanner } from '@/components/auth/VerifyEmailBanner';
import { useHasAlbertSuggestion } from '@/hooks/useAlbertSuggestion';
import { useHasUnseenBuild } from '@/hooks/useUnseenBuilds';
import { colors, font, fontSize } from '@/theme';
import { TEAM_FEATURE_ENABLED } from '@/config/features';
import { useNotifications } from '@/hooks/useNotifications';
import { useCurrentUser, useResendVerification } from '@/hooks/useEmailVerification';
import { CURRENT_USER_QUERY_KEY } from '@/lib/queryKeys';
import { iapService } from '@/services/iap.service';
import { useAuthStore } from '@/store/auth.store';
import { BREADCRUMB_CATEGORY, warnBreadcrumb } from '@/lib/breadcrumbs';

// The bar is the system's: Liquid Glass on iOS 26, with its own selected-tab capsule. What we
// set is the colours and the labels. The Albert badge is the system badge. iOS draws nothing for an empty one, so it holds a dot character.
const ALBERT_BADGE_DOT = '·';

export default function TabsLayout() {
  // Register for push notifications once the authenticated tab shell mounts
  useNotifications();

  // The Albert tab's dot: a suggestion waits or a finished path build is unseen.
  const hasSuggestion = useHasAlbertSuggestion();
  const hasUnseenBuild = useHasUnseenBuild();
  const albertBadge = hasSuggestion || hasUnseenBuild;

  // Configure RevenueCat once the user is authenticated (073b Chunk 5).
  // configure() is called once with the API key; logIn() associates purchases
  // with our user ID so we can link Apple transactions to the right account.
  const userId = useAuthStore((s) => s.user?.id);
  useEffect(() => {
    const apiKey = process.env.EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY ?? '';
    if (!apiKey || !userId) return;
    iapService.configure(apiKey);
    iapService.logIn(userId).catch((err) => {
      // non-fatal — purchases still work, but record it for diagnosis
      warnBreadcrumb(BREADCRUMB_CATEGORY.iap, 'logIn failed', err);
    });
  }, [userId]);

  const queryClient = useQueryClient();

  // Refetch currentUser when the app returns to the foreground — the exact
  // moment the user comes back from the browser after clicking the verify link.
  // Fire-and-forget: a failed refetch lands in the query's own error state, which
  // `useCurrentUser` callers read, so `void` loses nothing.
  const invalidateCurrentUser = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: CURRENT_USER_QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') invalidateCurrentUser();
    });
    return () => subscription.remove();
  }, [invalidateCurrentUser]);

  // Safe-area insets — used to push the email verification banner below the
  // notch / Dynamic Island. The banner renders outside any screen's SafeAreaView,
  // so it sits at y=0 without this. (069 item 9)
  const insets = useSafeAreaInsets();

  const { data: currentUser } = useCurrentUser();
  const resendVerification = useResendVerification();
  const [resendSent, setResendSent] = useState(false);

  const showBanner = !!(currentUser && !currentUser.emailVerified);

  return (
    <View style={{ flex: 1 }}>
      <View
        testID="tab-top-inset"
        style={{
          paddingTop: insets.top,
          backgroundColor: colors.bg,
        }}
      />
      {showBanner && (
        <VerifyEmailBanner
          sent={resendSent}
          sending={resendVerification.isPending}
          onResend={() => resendVerification.mutate(undefined, { onSuccess: () => setResendSent(true) })}
        />
      )}
      <NativeTabs
        // Belt and braces — also invalidate whenever any tab screen gains focus, so
        // switching tabs (e.g. Profile -> Progress) clears a stale banner even if
        // the foreground event was missed. `useFocusEffect` on this layout would
        // NOT do this: the layout itself stays mounted/focused across tab switches,
        // only its child screens' focus changes, so the listener must live on the tabs.
        screenListeners={{ focus: invalidateCurrentUser }}
        tintColor={colors.textBody}
        iconColor={{ default: colors.textSubtle, selected: colors.textBody }}
        labelStyle={{ default: { fontFamily: font.medium, fontSize: fontSize.xs, color: colors.textSubtle }, selected: { fontFamily: font.medium, fontSize: fontSize.xs, color: colors.textBody } }}
        badgeBackgroundColor={colors.warning}
      >
        <NativeTabs.Trigger name="lessons">
          <NativeTabs.Trigger.Icon sf="house" md="home" />
          <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="progress">
          <NativeTabs.Trigger.Icon sf="chart.bar" md="bar_chart" />
          <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Icon sf="person" md="person" />
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="tracks">
          <NativeTabs.Trigger.Icon sf="books.vertical" md="library_books" />
          <NativeTabs.Trigger.Label>Tracks</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="team" hidden={!TEAM_FEATURE_ENABLED}>
          <NativeTabs.Trigger.Icon sf="person.2" md="group" />
          <NativeTabs.Trigger.Label>Team</NativeTabs.Trigger.Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="albert">
          <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
          <NativeTabs.Trigger.Label>Albert</NativeTabs.Trigger.Label>
          {/* Not rendered, rather than `hidden`: expo-router ignores `hidden` once the badge has text. */}
          {albertBadge && <NativeTabs.Trigger.Badge>{ALBERT_BADGE_DOT}</NativeTabs.Trigger.Badge>}
        </NativeTabs.Trigger>
      </NativeTabs>
    </View>
  );
}
