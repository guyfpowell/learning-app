import { ScrollView, StyleSheet, View } from 'react-native';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PathCard } from '@/components/ui/PathCard';
import { PremiumModal } from '@/components/ui/PremiumModal';
import { BuildPathCard } from '@/components/albert/BuildPathCard';
import { SituationChangeSection } from '@/components/albert/SituationChangeSection';
import { queryClient } from '@/providers/QueryProvider';
import { PREVIEW_IN_PROGRESS_ID, seedPreviewLesson } from '@/lib/previewLesson';
import { makeCustomPath, makeNextLesson, makeTrackPath } from '@/test-utils/paths';
import { colors, font, spacing } from '@/theme';

const noop = () => { /* a preview: nothing happens */ };

/** One labelled block: what it is, and where in the app it shows. */
function Block({ title, where, children }: { title: string; where: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.where}>{where}</Text>
      {children}
    </View>
  );
}

/**
 * Dev-only (reached from Profile in development): every place the app still draws the old serif
 * button, on made-up data, so each can be seen and given a new design. Nothing is read or sent.
 */
export default function OldStylePreviewScreen() {
  const router = useRouter();
  const [premiumOpen, setPremiumOpen] = useState(false);
  const path = makeTrackPath({ nextLesson: makeNextLesson(), isActive: false, canSkipLesson: true });
  const completePath = makeCustomPath({ isFinished: true });
  const actions = { canBuild: true, canRemove: true, trialOver: false };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Block title="Test My Knowledge" where="Lesson page, only for a lesson with no key takeaway (with one, the takeaway page already has the new button). Opens the real lesson screen on such a made-up lesson: scroll down and tap Key takeaway.">
          <Button
            label="Open the lesson"
            variant="outline"
            onPress={() => {
              seedPreviewLesson(queryClient);
              router.push(`/lesson/${PREVIEW_IN_PROGRESS_ID}` as Href);
            }}
          />
        </Block>

        <Block title="Lesson locked (premium) card" where="Lesson page, when the lesson is premium or the free previews are used up.">
          <Card style={styles.centre}>
            <Text style={styles.big}>🔒</Text>
            <Text style={styles.heading}>Premium Content</Text>
            <Button label="Learn more" onPress={() => setPremiumOpen(true)} />
          </Card>
          <PremiumModal visible={premiumOpen} onClose={() => setPremiumOpen(false)} onUpgrade={() => setPremiumOpen(false)} />
        </Block>

        <Block title="Home with no active path" where="Home: the old path card, then the button under it.">
          <PathCard path={path} onStartLesson={noop} onSkip={noop} onOpen={noop} />
          <Button label="Choose your next path →" variant="outline" onPress={noop} />
        </Block>

        <Block title="Albert: path complete" where="Albert tab, after the last lesson of a path: Build another.">
          <BuildPathCard state="complete" path={completePath} actions={actions} allowanceSpent={false} archiveError={null} onViewMyPath={noop} onCreateNewPath={noop} onBuild={noop} />
        </Block>

        <Block title="Albert: building locked" where="Albert tab with no path, for a free user who has used their path: the outlined upgrade on the cobalt card.">
          <BuildPathCard state="none" path={null} actions={{ canBuild: false, canRemove: false, trialOver: false }} allowanceSpent onViewMyPath={noop} onCreateNewPath={noop} onBuild={noop} archiveError={null} />
        </Block>

        <Block title="Albert: end of a path, locked" where="Home at the end of an Albert path, for a free user: 'what next' with an Upgrade button.">
          <SituationChangeSection planId="preview" locked pathFinished onUpgrade={noop} />
        </Block>

        <Block title="Other old buttons, as drawn" where="Build review 'change anything' box (Update my path, Undo), Albert suggestion Upgrade. Same Button, shown here without their data.">
          <Button label="Update my path" onPress={noop} />
          <Button label="Undo" variant="outline" onPress={noop} />
          <Button label="Upgrade" variant="outline" onPress={noop} />
        </Block>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen:  { flex: 1, backgroundColor: colors.paper },
  content: { padding: spacing.lg, gap: spacing.xl2, paddingBottom: spacing.xl2 },
  block:   { gap: spacing.sm },
  title:   { fontFamily: font.black, fontSize: 20, color: colors.textStrong },
  where:   { fontFamily: font.regular, fontSize: 13, lineHeight: 13 * 1.4, color: colors.textMuted },
  centre:  { alignItems: 'center', gap: spacing.sm },
  big:     { fontSize: 32 },
  heading: { fontFamily: font.bold, fontSize: 18, color: colors.textStrong },
});
