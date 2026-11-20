import { useRouter, type Href } from 'expo-router';

/** Back: pop the stack if there is somewhere to go (a fresh launch or a deep link has nowhere), otherwise land on `fallbackRoute`. */
export function useGoBack(fallbackRoute: Href): () => void {
  const router = useRouter();
  return () => {
    if (router.canGoBack()) router.back();
    else router.replace(fallbackRoute);
  };
}
