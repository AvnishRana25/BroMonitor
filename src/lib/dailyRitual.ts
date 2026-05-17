/** Shared rules for the minimum daily log ritual (client + server). */

export type RitualEntry = {
  chapterId: string | null;
  topicId: string | null;
  subTopic: string | null;
};

/**
 * Predicate used by the dashboard's "today is ritual-complete" badge and the
 * rules-engine evaluator. Kept in sync with `validateDailyRitual` so the UI
 * and the server agree on what counts as a study row.
 */
export function entryHasStudyContent(e: RitualEntry): boolean {
  const hasTopic = !!e.topicId && e.topicId !== "__other__";
  const hasSubTopic = !!e.subTopic?.trim();
  return hasTopic || hasSubTopic || !!e.chapterId;
}

export function validateDailyRitual(
  entries: RitualEntry[],
  photoCount: number
): string | null {
  if (photoCount < 1) {
    return "Add at least one photo of today's work (notebook or solved problems).";
  }
  // Require at least a chapter to be picked AND either a topic from the
  // dropdown or a free-text sub-topic describing what was studied.
  const hasStudyRow = entries.some(
    (e) =>
      !!e.chapterId &&
      ((e.topicId && e.topicId !== "__other__") || !!e.subTopic?.trim()),
  );
  if (!hasStudyRow) {
    return "Pick at least one subject, chapter, and topic (or describe under Other).";
  }
  return null;
}
