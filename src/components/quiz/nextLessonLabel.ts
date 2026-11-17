/** The way-on button after a finished quiz: to the next lesson when there is one, else Home. */
export function nextLessonLabel(nextLessonId: string | null | undefined): string {
  return nextLessonId ? 'Next lesson' : 'Back to dashboard';
}
