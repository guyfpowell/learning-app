import { useState } from 'react';
import { useRouter } from 'expo-router';
import { LandmarkArrival } from '@/components/altitudeChart/LandmarkArrival';
import { arrivalDemoPlan } from '@/components/altitudeChart/arrivalDemo';
import { useAuthStore } from '@/store/auth.store';

/** Dev-only (reached from Profile in development): the landmark arrival on made-up data. Kinder Scout is the previous landmark, Scafell Pike the one just earned. */
export default function LandmarkArrivalPreviewScreen() {
  const router = useRouter();
  const name = useAuthStore((s) => s.user?.name ?? '');
  const [plan] = useState(arrivalDemoPlan);
  return <LandmarkArrival plan={plan} name={name} onBack={() => router.back()} onContinue={() => router.back()} />;
}
