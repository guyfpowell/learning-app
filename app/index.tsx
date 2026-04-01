/**
 * Root entry point — shows a spinner while AuthGate (in _layout.tsx)
 * waits for SecureStore rehydration and routes to the correct screen.
 */
import { Spinner } from '@/components/ui/Spinner';

export default function Root() {
  return <Spinner fullScreen />;
}
