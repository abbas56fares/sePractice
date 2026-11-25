import type { Level, Topic } from '../types';

/**
 * The three roadmaps. Every level has seven content topics plus a final exam,
 * so all three render through exactly the same roadmap layout — only the
 * subject matter and difficulty differ.
 */
export const LEVELS: Level[] = [
  {
    id: 1,
    name: 'Beginner',
    tagline: 'Java fundamentals',
    description:
      'Syntax, types, control flow and your first classes. Everything an entry-level screening assumes you already know cold.',
    topics: [
      {
        id: 'l1-basics',
        level: 1,
        order: 1,
        name: 'Variables, Data Types & Operators',
        description: 'Primitives, literals, casting, integer division and operator precedence.',
        difficulty: 'easy',
      },
      {
        id: 'l1-control',
        level: 1,
        order: 2,
        name: 'Conditions & Loops',
        description: 'if/else, switch, for, while, do-while, break and continue.',
        difficulty: 'easy',
      },
      {
        id: 'l1-arrays',
        level: 1,
        order: 3,
        name: 'Arrays & Strings',
        description: 'Array indexing and defaults, String immutability and the common String methods.',
        difficulty: 'easy',
      },
      {
        id: 'l1-methods',
        level: 1,
        order: 4,
        name: 'Methods & Parameters',
        description: 'Return types, pass-by-value semantics, scope and simple recursion.',
        difficulty: 'medium',
      },
      {
        id: 'l1-classes',
        level: 1,
        order: 5,
        name: 'Classes & Objects',
        description: 'Fields, instance methods, references, null and object identity.',
        difficulty: 'medium',
      },
      {
        id: 'l1-ctor',
        level: 1,
        order: 6,
        name: 'Constructors & Basic OOP',
        description: 'Default and overloaded constructors, this, encapsulation and getters/setters.',
        difficulty: 'medium',
      },
      {
        id: 'l1-algo',
        level: 1,
        order: 7,
        name: 'Basic Algorithms & Problem Solving',
        description: 'Sums, min/max, counting, reversal, swaps and simple search over arrays.',
        difficulty: 'medium',
      },
      {
        id: 'l1-final',
        level: 1,
        order: 8,
        name: 'Level 1 Final Exam',
        description: 'A timed screening test drawn from every Beginner topic.',
        difficulty: 'medium',
        isFinal: true,
      },
    ],
  },
  {
    id: 2,
    name: 'Intermediate',
    tagline: 'OOP & code tracing',
    description:
      'The object-oriented core that interviewers probe hardest: inheritance, dispatch, abstraction and initialization order.',
    topics: [
      {
        id: 'l2-inherit',
        level: 2,
        order: 1,
        name: 'Inheritance & the super Keyword',
        description: 'extends, constructor chaining, super calls and field hiding.',
        difficulty: 'medium',
      },
      {
        id: 'l2-override',
        level: 2,
        order: 2,
        name: 'Overriding vs Overloading',
        description: 'Signature rules, covariant returns, static vs dynamic selection.',
        difficulty: 'medium',
      },
      {
        id: 'l2-abstract',
        level: 2,
        order: 3,
        name: 'Interfaces & Abstract Classes',
        description: 'Abstract members, default methods, multiple interfaces and when to pick which.',
        difficulty: 'medium',
      },
      {
        id: 'l2-poly',
        level: 2,
        order: 4,
        name: 'Polymorphism & Reference Types',
        description: 'Reference type vs runtime type, casting, instanceof and ClassCastException.',
        difficulty: 'medium',
      },
      {
        id: 'l2-init',
        level: 2,
        order: 5,
        name: 'Constructors & Initialization Order',
        description: 'Static blocks, instance initializers, field order and the overridable-call trap.',
        difficulty: 'hard',
      },
      {
        id: 'l2-modifiers',
        level: 2,
        order: 6,
        name: 'Access Modifiers, static & final',
        description: 'Visibility rules, static state, final fields/methods/classes and constants.',
        difficulty: 'medium',
      },
      {
        id: 'l2-exceptions',
        level: 2,
        order: 7,
        name: 'Exceptions & Collections',
        description: 'Checked vs unchecked, try/catch/finally and the List/Set/Map basics.',
        difficulty: 'medium',
      },
      {
        id: 'l2-final',
        level: 2,
        order: 8,
        name: 'Level 2 Final Exam',
        description: 'A timed screening test drawn from every Intermediate topic.',
        difficulty: 'hard',
        isFinal: true,
      },
    ],
  },
  {
    id: 3,
    name: 'Advanced',
    tagline: 'Screening-grade problems',
    description:
      'Mixed tracing, collections internals, complexity and debugging — the shape of a real junior technical screen.',
    topics: [
      {
        id: 'l3-tracing',
        level: 3,
        order: 1,
        name: 'Complex OOP Code Tracing',
        description: 'Multi-class hierarchies, shadowing, mutation through references and output order.',
        difficulty: 'hard',
      },
      {
        id: 'l3-generics',
        level: 3,
        order: 2,
        name: 'Collections & Generics',
        description: 'Type parameters, wildcards, erasure and choosing the right collection.',
        difficulty: 'hard',
      },
      {
        id: 'l3-equality',
        level: 3,
        order: 3,
        name: 'Equality, Hashing & Object Behaviour',
        description: 'equals/hashCode contracts, == vs equals, interning and mutable keys.',
        difficulty: 'hard',
      },
      {
        id: 'l3-recursion',
        level: 3,
        order: 4,
        name: 'Recursion & Algorithmic Problem Solving',
        description: 'Base cases, call-stack tracing, memoisation and two-pointer techniques.',
        difficulty: 'hard',
      },
      {
        id: 'l3-ds',
        level: 3,
        order: 5,
        name: 'Data Structures & Time Complexity',
        description: 'Big-O of the common operations, and which structure fits which requirement.',
        difficulty: 'hard',
      },
      {
        id: 'l3-debug',
        level: 3,
        order: 6,
        name: 'Debugging & Compilation Errors',
        description: 'Compile-time vs runtime failure, off-by-one defects and silent logic bugs.',
        difficulty: 'hard',
      },
      {
        id: 'l3-screening',
        level: 3,
        order: 7,
        name: 'Mixed Technical Screening',
        description: 'Java plus the SQL and React fundamentals that show up alongside it.',
        difficulty: 'medium',
      },
      {
        id: 'l3-final',
        level: 3,
        order: 8,
        name: 'Level 3 Final Exam',
        description: 'A full 30-question, 60-minute simulation of a real technical screen.',
        difficulty: 'hard',
        isFinal: true,
      },
    ],
  },
];

export const LEVEL_IDS = [1, 2, 3] as const;

export const ALL_TOPICS = LEVELS.flatMap((l) => l.topics);

export const TOPIC_BY_ID = new Map(ALL_TOPICS.map((t) => [t.id, t]));

export const LEVEL_BY_ID = new Map(LEVELS.map((l) => [l.id, l]));

export function getLevel(id: number): Level | undefined {
  return LEVEL_BY_ID.get(id as 1 | 2 | 3);
}

export function getTopic(id: string): Topic | undefined {
  return TOPIC_BY_ID.get(id);
}

/** Content topics only — excludes the level's final exam. */
export function contentTopics(levelId: number): Topic[] {
  return getLevel(levelId)?.topics.filter((t) => !t.isFinal) ?? [];
}

export function finalTopic(levelId: number): Topic | undefined {
  return getLevel(levelId)?.topics.find((t) => t.isFinal);
}
