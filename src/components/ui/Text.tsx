import { Children, type ReactNode } from 'react';
import { Text as NativeText, type TextProps } from 'react-native';
import { withoutEmDashes } from '@/lib/emDash';

/**
 * The app's text. It is React Native's `Text` with one difference: no em dash is ever shown. Whatever text
 * it is given, from the curriculum, from Albert, from the server or from our own copy, is shown with
 * each em dash replaced by its best fit (`withoutEmDashes`). Only what is shown changes; the data behind it
 * does not, so a quiz option the learner taps is still sent as it is stored.
 */
export function Text({ children, ...rest }: TextProps) {
  return <NativeText {...rest}>{plain(children)}</NativeText>;
}

/** Plain strings and numbers are joined and fixed as one text; anything with a nested element is fixed string by string. */
function plain(children: ReactNode): ReactNode {
  if (typeof children === 'string') return withoutEmDashes(children);
  const parts = Children.toArray(children);
  if (parts.every((part) => typeof part === 'string' || typeof part === 'number')) {
    return withoutEmDashes(parts.join(''));
  }
  return parts.map((part) => (typeof part === 'string' ? withoutEmDashes(part) : part));
}
