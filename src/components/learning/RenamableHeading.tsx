import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '@/components/ui/Button';
import { PATH_NAME_MAX } from '@learning/shared';
import { colors, font, fontSize, spacing } from '@/theme';
import { extractError } from '@/lib/errors';

type RenameState =
  | { mode: 'view' }
  | { mode: 'edit'; draft: string; error: string | null }
  | { mode: 'saving'; draft: string };

interface Props {
  name: string;
  /** Saves a new name. Null when the name is not the learner's to change (a curated track). */
  onSave: ((name: string) => Promise<void>) | null;
}

/**
 * A path's heading. When the learner can rename it, tapping the name turns it into an input
 * with the same limit as naming a new path; Save (or the keyboard's Done) saves it; Cancel puts the old name back.
 */
export function RenamableHeading({ name, onSave }: Props) {
  const [state, setState] = useState<RenameState>({ mode: 'view' });

  async function commit(draft: string, save: (name: string) => Promise<void>) {
    const trimmed = draft.trim();
    if (trimmed.length === 0 || trimmed === name) {
      setState({ mode: 'view' });
      return;
    }
    setState({ mode: 'saving', draft });
    try {
      await save(trimmed);
      setState({ mode: 'view' });
    } catch (err) {
      setState({ mode: 'edit', draft, error: extractError(err) });
    }
  }

  if (!onSave) return <Text testID="track-detail-heading" style={styles.heading}>{name}</Text>;

  if (state.mode === 'view') {
    return (
      <Pressable
        testID="track-detail-heading"
        accessibilityRole="button"
        accessibilityHint="Tap to rename"
        onPress={() => setState({ mode: 'edit', draft: name, error: null })}
      >
        <Text style={styles.heading}>{name}</Text>
      </Pressable>
    );
  }

  const error = state.mode === 'edit' ? state.error : null;
  const saving = state.mode === 'saving';
  const save = () => {
    if (state.mode === 'edit') void commit(state.draft, onSave);
  };

  return (
    <>
      <TextInput
        testID="rename-input"
        style={[styles.heading, styles.input]}
        value={state.draft}
        onChangeText={(draft) => setState({ mode: 'edit', draft, error: null })}
        onSubmitEditing={save}
        editable={state.mode === 'edit'}
        maxLength={PATH_NAME_MAX}
        returnKeyType="done"
        autoFocus
        selectTextOnFocus
      />
      {error != null && <Text testID="rename-error" style={styles.error}>{error}</Text>}
      <View style={styles.actions}>
        <Button testID="rename-cancel" label="Cancel" variant="ghost" inline disabled={saving} onPress={() => setState({ mode: 'view' })} />
        <Button testID="rename-save" label="Save" inline loading={saving} onPress={save} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: font.display,
    fontSize: fontSize.xl,
    color: colors.textStrong,
    marginBottom: spacing.md,
  },
  input: {
    padding: 0,
    marginBottom: 0,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
  },
  error: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.xs,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
});
