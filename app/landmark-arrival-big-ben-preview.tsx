import { LandmarkArrivalPreview } from '@/components/altitudeChart/LandmarkArrivalPreview';

/** Dev-only (reached from Profile in development): the landmark arrival on made-up data, from sea level up to Big Ben, the first landmark. */
export default function LandmarkArrivalBigBenPreviewScreen() {
  return <LandmarkArrivalPreview landmark="big-ben" />;
}
