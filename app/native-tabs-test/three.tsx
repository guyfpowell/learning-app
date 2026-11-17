import { ScrollView } from 'react-native';
import { Text } from '@/components/ui/Text';

export default function Screen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 24, paddingTop: 80 }}>
      <Text style={{ fontSize: 28, fontWeight: '800' }}>Three</Text>
      {Array.from({ length: 40 }, (_, i) => (
        <Text key={i} style={{ paddingVertical: 12 }}>Scroll under the tab bar, row {i + 1}</Text>
      ))}
    </ScrollView>
  );
}
