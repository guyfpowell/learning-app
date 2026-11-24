import { LandmarkArrivalPreview } from '@/components/altitudeChart/LandmarkArrivalPreview';

/** Dev-only (reached from Profile in development): the landmark arrival on made-up data. Kinder Scout is the previous landmark, Scafell Pike the one just earned. */
export default function LandmarkArrivalPreviewScreen() {
  return <LandmarkArrivalPreview landmark="scafell-pike" />;
}
