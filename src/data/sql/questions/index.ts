import type { SqlLevelId, SqlQuestion } from '../../../types/sql';
import { isExecutable } from '../../../types/sql';
import type { SqlDataset } from '../../../lib/sql';
import { datasetOr } from '../datasets';
import { getSqlTopic } from '../levels';

import { l1Select } from './l1-select';
import { l1Where } from './l1-where';
import { l1Patterns } from './l1-patterns';
import { l1Nulls } from './l1-nulls';
import { l1Sorting } from './l1-sorting';
import { l1Aggregates } from './l1-aggregates';
import { l1Tables } from './l1-tables';

import { l2Grouping } from './l2-grouping';
import { l2Joins } from './l2-joins';
import { l2MultiJoin } from './l2-multijoin';
import { l2Subqueries } from './l2-subqueries';
import { l2NullCase } from './l2-nullcase';
import { l2SetOps } from './l2-setops';
import { l2DateString } from './l2-datestring';

import { l3AdvJoins } from './l3-advjoins';
import { l3Cte } from './l3-cte';
import { l3Windows } from './l3-windows';
import { l3Analytics } from './l3-analytics';
import { l3Corr } from './l3-corr';
import { l3Design } from './l3-design';
import { l3Perf } from './l3-perf';

/**
 * The whole SQL bank, flattened. One module per roadmap topic feeds in here;
 * see the README section "Adding SQL questions".
 */
export const SQL_QUESTIONS: SqlQuestion[] = [
  ...l1Select,
  ...l1Where,
  ...l1Patterns,
  ...l1Nulls,
  ...l1Sorting,
  ...l1Aggregates,
  ...l1Tables,
  ...l2Grouping,
  ...l2Joins,
  ...l2MultiJoin,
  ...l2Subqueries,
  ...l2NullCase,
  ...l2SetOps,
  ...l2DateString,
  ...l3AdvJoins,
  ...l3Cte,
  ...l3Windows,
  ...l3Analytics,
  ...l3Corr,
  ...l3Design,
  ...l3Perf,
];

const BY_ID = new Map(SQL_QUESTIONS.map((q) => [q.id, q]));

export function getSqlQuestion(id: string): SqlQuestion | undefined {
  return BY_ID.get(id);
}

export function getSqlQuestions(ids: readonly string[]): SqlQuestion[] {
  return ids.map((id) => BY_ID.get(id)).filter((q): q is SqlQuestion => Boolean(q));
}

const byTopic = new Map<string, SqlQuestion[]>();
const byLevel = new Map<SqlLevelId, SqlQuestion[]>();
const byTag = new Map<string, SqlQuestion[]>();

for (const q of SQL_QUESTIONS) {
  const t = byTopic.get(q.topicId);
  if (t) t.push(q);
  else byTopic.set(q.topicId, [q]);

  const l = byLevel.get(q.levelId);
  if (l) l.push(q);
  else byLevel.set(q.levelId, [q]);

  for (const tag of q.tags) {
    const bucket = byTag.get(tag);
    if (bucket) bucket.push(q);
    else byTag.set(tag, [q]);
  }
}

export function sqlQuestionsForTopic(topicId: string): SqlQuestion[] {
  return byTopic.get(topicId) ?? [];
}

export function sqlQuestionsForLevel(levelId: SqlLevelId): SqlQuestion[] {
  return byLevel.get(levelId) ?? [];
}

/** Questions carrying any of the given tags, in bank order, deduplicated. */
export function sqlQuestionsForTags(tags: readonly string[]): SqlQuestion[] {
  const seen = new Set<string>();
  const out: SqlQuestion[] = [];
  for (const tag of tags) {
    for (const q of byTag.get(tag) ?? []) {
      if (seen.has(q.id)) continue;
      seen.add(q.id);
      out.push(q);
    }
  }
  return out.sort((a, b) => SQL_QUESTIONS.indexOf(a) - SQL_QUESTIONS.indexOf(b));
}

export const SQL_ALL_TAGS: string[] = [...byTag.keys()].sort();

/** The dataset a question runs against: its own override, else its topic's. */
export function getSqlDatasetFor(q: SqlQuestion): SqlDataset {
  return datasetOr(q.datasetId ?? getSqlTopic(q.topicId)?.datasetId);
}

export function sqlExecutableCount(questions: readonly SqlQuestion[] = SQL_QUESTIONS): number {
  return questions.filter(isExecutable).length;
}
