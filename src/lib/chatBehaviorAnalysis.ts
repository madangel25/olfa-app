/**
 * Simulated AI-driven seriousness/engagement scoring for VIP personality insights.
 * Uses response time, message quality (word count), and ghosting to produce a 0–100 score and labels.
 */

export type BehaviorMetrics = {
  /** Partner response times in ms (time from our message to their reply). */
  responseTimesMs: number[];
  /** Word count of each partner message. */
  wordCounts: number[];
};

export type SeriousnessResult = {
  score: number;
  responseSpeedLabel: "Fast" | "Medium" | "Slow";
  engagementLabel: "High" | "Medium" | "Low";
};

const AVG_RESPONSE_FAST_MS = 5 * 60 * 1000;       // 5 min
const AVG_RESPONSE_SLOW_MS = 60 * 60 * 1000;      // 1 hr
const GHOSTING_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hr
const MIN_WORDS_GOOD = 5;
const MIN_WORDS_HIGH = 10;

export function getWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

/**
 * Increases score for fast replies and substantive messages; decreases for long ghosting periods.
 */
export function calculateSeriousnessScore(metrics: BehaviorMetrics): SeriousnessResult {
  const { responseTimesMs, wordCounts } = metrics;
  let score = 50; // start neutral

  // Response speed: fast replies increase score
  if (responseTimesMs.length > 0) {
    const avgMs = responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length;
    const avgMinutes = avgMs / (60 * 1000);
    if (avgMs <= AVG_RESPONSE_FAST_MS) {
      score += 20;
    } else if (avgMs <= AVG_RESPONSE_SLOW_MS) {
      score += 5;
    } else {
      score -= 10;
    }
    // Ghosting: any very long response time decreases score
    const longGaps = responseTimesMs.filter((t) => t >= GHOSTING_THRESHOLD_MS).length;
    if (longGaps > 0) score -= Math.min(25, longGaps * 15);
  }

  // Message quality: 5–10+ words per message increase score
  if (wordCounts.length > 0) {
    const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
    if (avgWords >= MIN_WORDS_HIGH) score += 15;
    else if (avgWords >= MIN_WORDS_GOOD) score += 8;
    else if (avgWords < 2) score -= 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const avgMs = responseTimesMs.length > 0
    ? responseTimesMs.reduce((a, b) => a + b, 0) / responseTimesMs.length
    : 0;
  const responseSpeedLabel: SeriousnessResult["responseSpeedLabel"] =
    avgMs <= AVG_RESPONSE_FAST_MS ? "Fast" : avgMs <= AVG_RESPONSE_SLOW_MS ? "Medium" : "Slow";

  const avgWords = wordCounts.length > 0
    ? wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length
    : 0;
  const engagementLabel: SeriousnessResult["engagementLabel"] =
    avgWords >= MIN_WORDS_HIGH ? "High" : avgWords >= MIN_WORDS_GOOD ? "Medium" : "Low";

  return { score, responseSpeedLabel, engagementLabel };
}
