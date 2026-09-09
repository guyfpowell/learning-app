import React from 'react';
import { ActivityIndicator, StyleSheet, View, ViewProps } from 'react-native';
import { colors } from '@/theme';

interface SpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  fullScreen?: boolean;
  testID?: ViewProps['testID'];
}

export function Spinner({
  size = 'large',
  color = colors.brand,
  fullScreen = false,
  testID,
}: SpinnerProps) {
  if (fullScreen) {
    return (
      <View testID={testID} style={styles.fullScreen}>
        <ActivityIndicator size={size} color={color} />
      </View>
    );
  }
  return <ActivityIndicator testID={testID} size={size} color={color} />;
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});
