/**
 * Chart colours, kept in one place so the roles are explicit.
 *
 * Validated with the palette validator against the card surface (#ffffff):
 *
 *   - Sentiment is a POLARITY split, so it uses the diverging pair blue<->red
 *     with a neutral grey between. Those two poles pass every check
 *     (CVD deltaE 21.6, normal-vision 32.3, both >= 3:1 on the surface).
 *   - Call status uses the reserved status colours for completed/failed. That
 *     green/red pair FAILS CVD separation (deltaE 4.1 deuteranopia), which is
 *     why statuses render as one labelled row each rather than as adjacent
 *     segments of a single bar -- the label and count carry the meaning and the
 *     colour is only a redundant cue.
 *   - Scores are a single measure across four names, so they take one hue.
 */

// Diverging pair + neutral midpoint.
export const SENTIMENT_COLORS = {
  Positive: '#2a78d6',
  Neutral: '#898781',
  Negative: '#e34948',
  Other: '#c3c2b7',
}

// Sequential blue for in-flight states, reserved status colours for terminal
// ones. Never used without the accompanying label.
export const STATUS_COLORS = {
  PENDING: '#86b6ef',
  PROCESSING: '#2a78d6',
  COMPLETED: '#0ca30c',
  FAILED: '#d03b3b',
}

// One hue for the score bars -- a single measure, so no categorical set.
export const SCORE_COLOR = '#2a78d6'
