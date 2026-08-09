import { Colors } from './theme';
import type { MacroSet } from './types';

/**
 * Lightweight traffic-light read on a food/meal, purely from the macros we
 * already track everywhere (calories/protein/carbs/fat) — works for AI photo
 * scans, barcode lookups, search results, and manual entries alike, since
 * none of those are guaranteed to carry sodium/sugar data.
 *
 * This is a coarse heuristic, not medical/nutrition advice — it's meant to
 * give a quick "does this look oily/heavy" glance, the same way a person
 * eyeballs a plate. Green = protein-forward or otherwise balanced, yellow =
 * moderate, orange = a lot of the calories are coming from fat/oil, red =
 * very fat-dominant and calorie-dense (e.g. deep fried).
 */

export type HealthLevel = 'green' | 'yellow' | 'orange' | 'red';

export type HealthSignal = {
  level: HealthLevel;
  label: string;
};

export const HealthLevelMeta: Record<HealthLevel, { color: string; soft: string }> = {
  green: { color: Colors.green, soft: Colors.greenSoft },
  yellow: { color: Colors.yellow, soft: Colors.yellowSoft },
  orange: { color: Colors.orange, soft: Colors.orangeSoft },
  red: { color: Colors.danger, soft: '#FBE1DC' },
};

/**
 * Returns null when there isn't enough signal (e.g. calories is 0/unset) —
 * callers should simply not render a badge in that case rather than show a
 * misleading "green".
 */
export function getHealthSignal(macros: MacroSet): HealthSignal | null {
  const calories = macros.calories;
  if (!Number.isFinite(calories) || calories <= 0) return null;

  const fat = Math.max(0, macros.fat || 0);
  const protein = Math.max(0, macros.protein || 0);

  const fatCalPct = (fat * 9) / calories;
  const proteinCalPct = (protein * 4) / calories;

  // Very fat-dominant and calorie-dense — think deep-fried, extra oily.
  if (fatCalPct >= 0.55 && calories >= 250) {
    return { level: 'red', label: 'High fat' };
  }
  // Noticeably oily but not extreme.
  if (fatCalPct >= 0.4) {
    return { level: 'orange', label: 'High oil' };
  }
  // Protein-forward or fat share is low — reads as a safe, balanced choice.
  if (proteinCalPct >= 0.2 || fatCalPct < 0.22) {
    return { level: 'green', label: 'Balanced' };
  }
  return { level: 'yellow', label: 'Moderate' };
}
