import { useState } from 'react';
import { useRouter } from 'expo-router';
import type { LandmarkKey } from '@learning/shared';
import { useAuthStore } from '@/store/auth.store';
import { LandmarkArrival } from './LandmarkArrival';
import { arrivalDemoPlan } from './arrivalDemo';

/** A dev preview screen's body: the landmark arrival for `landmark` on made-up data. Back and Continue both leave. */
export function LandmarkArrivalPreview({ landmark }: { landmark: LandmarkKey }) {
  const router = useRouter();
  const name = useAuthStore((s) => s.user?.name ?? '');
  const [plan] = useState(() => arrivalDemoPlan(landmark));
  return <LandmarkArrival plan={plan} name={name} onBack={() => router.back()} onContinue={() => router.back()} />;
}
