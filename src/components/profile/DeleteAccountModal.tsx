import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DELETE_ACCOUNT_CONFIRM_WORD, type TeamOwnershipInfo } from '@learning/shared';
import { colors, font, fontSize, radius, spacing } from '@/theme';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { useDeleteAccount, useDeleteAccountPreflight } from '@/hooks/useAuth';
import { extractError } from '@/lib/errors';
import { openManageSubscriptions } from '@/lib/subscriptions';

/** Ticket 073c: three-step account deletion (overview + subscription warning → password → type-to-confirm). */
type DeleteStep = 'overview' | 'password' | 'confirm';

export function DeleteAccountModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<DeleteStep>('overview');
  const [subscriptionAcknowledged, setSubscriptionAcknowledged] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');

  const preflight = useDeleteAccountPreflight();
  const deleteAccount = useDeleteAccount();

  const teamOwnerships: TeamOwnershipInfo[] = preflight.data?.teamOwnerships ?? [];

  function handleStep1Continue() {
    if (!subscriptionAcknowledged) return;
    setStep('password');
  }

  function handleStep2Continue() {
    if (!password) return;
    setStep('confirm');
  }

  function handleDeleteConfirm() {
    if (confirmText !== DELETE_ACCOUNT_CONFIRM_WORD) return;
    deleteAccount.mutate(password, { onSuccess: onClose });
  }

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={deleteStyles.overlay}>
        <View style={deleteStyles.sheet}>
          {/* Cancel button — always visible */}
          <Pressable testID="delete-modal-cancel-btn" onPress={onClose} style={deleteStyles.cancelRow}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </Pressable>

          {/* ── Step 1: Overview ──────────────────────────────────────────── */}
          {step === 'overview' && (
            <ScrollView testID="delete-step-overview" contentContainerStyle={deleteStyles.stepContent} showsVerticalScrollIndicator={false}>
              <Text style={deleteStyles.heading}>Delete your account</Text>
              <Text style={deleteStyles.body}>This will permanently delete:</Text>

              <View style={deleteStyles.bulletList}>
                {[
                  'Your learning progress and XP',
                  'Your achievements',
                  'Your track enrolments',
                  'Your saved lessons',
                  'Your push notification preferences',
                ].map(item => (
                  <View key={item} style={deleteStyles.bulletRow}>
                    <Ionicons name="remove-circle-outline" size={16} color={colors.error} style={deleteStyles.bulletIcon} />
                    <Text style={deleteStyles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>

              {/* Team ownership info */}
              {preflight.isLoading ? (
                <Spinner size="small" />
              ) : teamOwnerships.length > 0 && (
                <View style={deleteStyles.teamSection}>
                  {teamOwnerships.map(t => (
                    <Text key={t.teamId} style={deleteStyles.teamNotice}>
                      {t.newOwnerName
                        ? `Ownership of ${t.teamName} will pass to ${t.newOwnerName}`
                        : `Your team ${t.teamName} will be deleted`}
                    </Text>
                  ))}
                </View>
              )}

              {/* Subscription warning */}
              <View style={deleteStyles.warningBox}>
                <Ionicons name="warning-outline" size={20} color={colors.warning} style={deleteStyles.warningIcon} />
                <Text testID="subscription-warning-text" style={deleteStyles.warningText}>
                  Your subscription will NOT be cancelled. Apple continues billing after your account is deleted.
                  You must cancel your subscription separately before deleting.
                </Text>
              </View>

              <Pressable
                testID="manage-sub-link"
                onPress={openManageSubscriptions}
                style={deleteStyles.subLink}
              >
                <Text style={deleteStyles.subLinkText}>Manage Subscription</Text>
                <Ionicons name="open-outline" size={14} color={colors.brand} />
              </Pressable>

              {/* Acknowledge checkbox */}
              <View style={deleteStyles.acknowledgeRow}>
                <Switch
                  testID="subscription-acknowledged-checkbox"
                  value={subscriptionAcknowledged}
                  onValueChange={setSubscriptionAcknowledged}
                  trackColor={{ true: colors.brand }}
                  thumbColor={colors.surface}
                />
                <Text style={deleteStyles.acknowledgeLabel}>
                  I understand my subscription will not be cancelled automatically
                </Text>
              </View>

              <Button
                testID="delete-step1-continue-btn"
                label="Continue"
                onPress={handleStep1Continue}
                disabled={!subscriptionAcknowledged}
                style={deleteStyles.actionBtn}
              />
            </ScrollView>
          )}

          {/* ── Step 2: Password ──────────────────────────────────────────── */}
          {step === 'password' && (
            <View testID="delete-step-password" style={deleteStyles.stepContent}>
              <Text style={deleteStyles.heading}>Confirm your identity</Text>
              <Text style={deleteStyles.body}>Enter your current password to continue.</Text>

              <Input
                testID="delete-password-input"
                placeholder="Password"
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                style={deleteStyles.input}
              />

              <Button
                testID="delete-step2-continue-btn"
                label="Continue"
                onPress={handleStep2Continue}
                disabled={!password}
                style={deleteStyles.actionBtn}
              />
            </View>
          )}

          {/* ── Step 3: Confirm ───────────────────────────────────────────── */}
          {step === 'confirm' && (
            <View testID="delete-step-confirm" style={deleteStyles.stepContent}>
              <Text style={deleteStyles.heading}>Final confirmation</Text>
              <Text style={deleteStyles.body}>Type {DELETE_ACCOUNT_CONFIRM_WORD} to confirm you want to permanently delete your account.</Text>

              <Input
                testID="delete-confirm-input"
                placeholder={DELETE_ACCOUNT_CONFIRM_WORD}
                autoCapitalize="characters"
                autoCorrect={false}
                value={confirmText}
                onChangeText={setConfirmText}
                style={deleteStyles.input}
              />

              {deleteAccount.isError && (
                <Text testID="delete-error-msg" style={deleteStyles.errorMsg}>
                  {extractError(deleteAccount.error)}
                </Text>
              )}

              <Button
                testID="delete-confirm-btn"
                label="Delete my account"
                variant="danger"
                onPress={handleDeleteConfirm}
                disabled={confirmText !== DELETE_ACCOUNT_CONFIRM_WORD}
                loading={deleteAccount.isPending}
                style={deleteStyles.actionBtn}
              />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const deleteStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent:  'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius:  radius.xl,
    borderTopRightRadius: radius.xl,
    padding:         spacing.lg,
    maxHeight:       '90%',
  },
  cancelRow: {
    alignItems: 'flex-end',
    marginBottom: spacing.sm,
  },
  stepContent: {
    paddingBottom: spacing.xl,
  },
  heading: {
    fontFamily:   font.semibold,
    fontSize:     fontSize.lg,
    color:        colors.textStrong,
    marginBottom: spacing.sm,
  },
  body: {
    fontFamily:   font.regular,
    fontSize:     fontSize.base,
    color:        colors.textBody,
    marginBottom: spacing.md,
  },
  bulletList: {
    gap:          spacing.xs,
    marginBottom: spacing.md,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           spacing.xs,
  },
  bulletIcon: { flexShrink: 0 },
  bulletText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
    flex:       1,
  },
  teamSection: {
    backgroundColor: colors.surfaceSunken,
    borderRadius:    radius.card,
    padding:         spacing.md,
    marginBottom:    spacing.md,
    gap:             spacing.xs,
  },
  teamNotice: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
  },
  warningBox: {
    backgroundColor: colors.warningSoft,
    borderRadius:    radius.card,
    padding:         spacing.md,
    flexDirection:   'row',
    gap:             spacing.sm,
    marginBottom:    spacing.sm,
  },
  warningIcon: { flexShrink: 0, marginTop: 2 },
  warningText: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
    flex:       1,
  },
  subLink: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            spacing.xs,
    marginBottom:   spacing.md,
  },
  subLinkText: {
    fontFamily: font.medium,
    fontSize:   fontSize.sm,
    color:      colors.brand,
  },
  acknowledgeRow: {
    flexDirection: 'row',
    alignItems:    'flex-start',
    gap:           spacing.sm,
    marginBottom:  spacing.lg,
  },
  acknowledgeLabel: {
    fontFamily: font.regular,
    fontSize:   fontSize.sm,
    color:      colors.textBody,
    flex:       1,
  },
  input: { marginBottom: spacing.md },
  actionBtn: { marginTop: spacing.sm },
  errorMsg: {
    fontFamily:   font.regular,
    fontSize:     fontSize.sm,
    color:        colors.error,
    textAlign:    'center',
    marginBottom: spacing.sm,
  },
});
