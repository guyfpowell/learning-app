import { NewUserAlbertFirst } from '@/components/home/NewUserAlbertFirst';
import { NewUserClimb } from '@/components/home/NewUserClimb';
import { NewUserPitch } from '@/components/home/NewUserPitch';
import { useNewUserHomeStore } from '@/store/newUserHome.store';

/**
 * Home for someone with no path yet. Three layouts (board 22): 1a the pitch, 1b Albert first (the
 * default), 1c the climb. Which one shows comes from the store; only the dev switch on Profile changes it.
 */
export function NewUserHome() {
  const variant = useNewUserHomeStore(s => s.variant);
  if (variant === '1a') return <NewUserPitch />;
  if (variant === '1c') return <NewUserClimb />;
  return <NewUserAlbertFirst />;
}
