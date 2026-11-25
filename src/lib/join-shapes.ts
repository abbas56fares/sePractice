/**
 * Which rows each join type keeps — the data behind the JOIN lab's diagrams.
 * Kept out of the component file so that file exports only components.
 */

export type JoinKind = 'inner' | 'left' | 'right' | 'full' | 'cross';

interface JoinShape {
  kind: JoinKind;
  name: string;
  /** Which regions of the two-circle diagram are filled. */
  fill: { leftOnly: boolean; overlap: boolean; rightOnly: boolean };
  summary: string;
}

export const JOIN_SHAPES: JoinShape[] = [
  {
    kind: 'inner',
    name: 'INNER JOIN',
    fill: { leftOnly: false, overlap: true, rightOnly: false },
    summary: 'Only rows that match on both sides.',
  },
  {
    kind: 'left',
    name: 'LEFT JOIN',
    fill: { leftOnly: true, overlap: true, rightOnly: false },
    summary: 'Every left row; unmatched right columns become NULL.',
  },
  {
    kind: 'right',
    name: 'RIGHT JOIN',
    fill: { leftOnly: false, overlap: true, rightOnly: true },
    summary: 'Every right row; unmatched left columns become NULL.',
  },
  {
    kind: 'full',
    name: 'FULL OUTER JOIN',
    fill: { leftOnly: true, overlap: true, rightOnly: true },
    summary: 'Every row from both sides, NULL-filled where unmatched.',
  },
];
