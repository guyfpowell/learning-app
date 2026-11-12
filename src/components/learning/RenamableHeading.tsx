import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { EdgeButton } from '@/components/ui/EdgeButton';
import { Icon } from '@/components/ui/Icon';
import { PATH_NAME_MAX } from '@learning/shared';
import { colors, font, fontSize, press, spacing } from '@/theme';
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
 * A path's heading. When the learner can rename it, a pencil sits beside the name; tapping it or the name
 * turns the name into an input (a cobalt underline) with the same limit as naming a new path, and a count.
 * Save (or the keyboard's Done) saves it; Cancel puts the old name back.
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
    const edit = () => setState({ mode: 'edit', draft: name, error: null });
    return (
      <View style={styles.viewRow}>
        <Pressable
          testID="track-detail-heading"
          accessibilityRole="button"
          accessibilityHint="Tap to rename"
          onPress={edit}
          style={styles.viewName}
        >
          <Text style={styles.heading}>{name}</Text>
        </Pressable>
        <Pressable testID="rename-btn" onPress={edit} accessibilityRole="button" accessibilityLabel="Rename" style={styles.pencil}>
          <Icon name="rename" size={22} color={colors.brand} />
        </Pressable>
      </View>
    );
  }

  const error = state.mode === 'edit' ? state.error : null;
  const saving = state.mode === 'saving';
  const save = () => {
    if (state.mode === 'edit') void commit(state.draft, onSave);
  };

  return (
    <View style={styles.editBlock}>
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
        <Text testID="rename-count" style={styles.count}>{`${state.draft.length} / ${PATH_NAME_MAX}`}</Text>
        <View style={styles.buttons}>
          <Pressable testID="rename-cancel" disabled={saving} onPress={() => setState({ mode: 'view' })} accessibilityRole="button" accessibilityLabel="Cancel" style={styles.cancel}>
            <Text style={styles.cancelLabel}>Cancel</Text>
          </Pressable>
          <View style={styles.save}>
            <EdgeButton
              testID="rename-save"
              look={{ face: colors.brand, label: colors.onBrand, edge: press.primaryEdge }}
              label="Save"
              faceHeight={44}
              loading={saving}
              onPress={save}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const HEADING_SIZE = 32;

const styles = StyleSheet.create({
  heading: {
    fontFamily: font.black,
    fontSize: HEADING_SIZE,
    lineHeight: HEADING_SIZE * 1.04,
    letterSpacing: -0.04 * HEADING_SIZE,
    color: colors.textStrong,
  },
  viewRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  viewName: { flex: 1 },
  pencil:   { width: 44, height: 44, marginTop: -4, alignItems: 'center', justifyContent: 'center' },
  editBlock: { gap: 14, marginBottom: spacing.md },
  input: {
    padding: 0,
    paddingBottom: 8,
    marginBottom: 0,
    borderBottomWidth: 2,
    borderBottomColor: colors.brand,
  },
  error: {
    fontFamily: font.regular,
    fontSize: fontSize.sm,
    color: colors.error,
  },
  actions:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count:    { fontFamily: font.semibold, fontSize: 13, color: colors.textMuted },
  buttons:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cancel:   { height: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { fontFamily: font.extrabold, fontSize: 16, color: colors.textBody },
  save:     { minWidth: 88 },
});
