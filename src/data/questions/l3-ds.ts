import { expand, JAVA_OUT, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'medium',
    k: 'complexity',
    p: 'What is the time complexity of get(i) on an ArrayList and on a LinkedList?',
    o: {
      a: 'O(1) and O(1)',
      b: 'O(1) and O(n)',
      c: 'O(n) and O(1)',
      d: 'O(log n) and O(n)',
    },
    a: 'b',
    e: 'ArrayList is backed by an array, so indexed access is a single offset computation — O(1). LinkedList must walk the chain from the nearest end, so indexed access is O(n).',
    w: {
      a: 'A linked list has no way to jump to an arbitrary index without traversing.',
      c: 'The two are the other way round: the array-backed list is the fast one for indexing.',
      d: 'Neither list is tree-structured, so no logarithmic term appears.',
    },
    h: 'Think about what each structure physically has to do to reach element i.',
  },
  {
    id: '002',
    d: 'medium',
    k: 'complexity',
    p: 'What is the average and worst-case complexity of HashMap.get in modern Java?',
    o: {
      a: 'O(1) average, O(n) worst case',
      b: 'O(1) average, O(log n) worst case',
      c: 'O(1) in both cases',
      d: 'O(log n) in both cases',
    },
    a: 'b',
    e: 'With a good hash the lookup is O(1). When many keys collide into one bucket, Java 8+ converts that bucket from a linked list to a balanced tree once it passes a threshold, bounding the worst case at O(log n).',
    w: {
      a: 'O(n) was the worst case before Java 8, when collided buckets stayed as linked lists.',
      c: 'Collisions are always possible, so constant time cannot be guaranteed.',
      d: 'The average case genuinely is constant time; that is the point of hashing.',
    },
    h: 'Something changed about collision handling in Java 8.',
  },
  {
    id: '003',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int ops = 0;
        for (int i = 1; i <= 8; i *= 2) {
            ops++;
        }
        System.out.println(ops);
    }
}`,
    o: { a: '3', b: '4', c: '8', d: '9' },
    a: 'b',
    e: 'i takes the values 1, 2, 4 and 8, then 16 fails the condition. Four iterations — the loop is O(log n) because i multiplies rather than increments.',
    w: {
      a: '3 excludes the final i = 8 iteration, but 8 <= 8 is true.',
      c: '8 is the bound, which would be the count only if i incremented by 1.',
      d: '9 counts one iteration too many.',
    },
    h: 'List the values i takes and count them.',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int n = 5;
        int count = 0;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < i; j++) {
                count++;
            }
        }
        System.out.println(count);
    }
}`,
    o: { a: '25', b: '10', c: '15', d: '20' },
    a: 'b',
    e: 'The inner loop runs i times, so the total is 0+1+2+3+4 = 10. This is the triangular number n(n-1)/2, which is still O(n^2) even though it is half of the full square.',
    w: {
      a: '25 is n^2, which would require the inner loop to run n times every pass.',
      c: '15 is 1+2+3+4+5, which starts the inner loop one iteration too late.',
      d: '20 is n(n-1), double the actual count.',
    },
    h: 'Sum the inner-loop lengths, do not multiply.',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'hard',
    k: 'complexity',
    p: 'Why is building a string by repeated `s += word` inside a loop over n items considered O(n²)?',
    o: {
      a: 'Because the loop itself is nested',
      b: 'Because String is immutable, so each += copies the whole accumulated string into a new object',
      c: 'Because the garbage collector runs on every iteration',
      d: 'It is not — += is optimised to a StringBuilder automatically',
    },
    a: 'b',
    e: 'Every += allocates a new String and copies everything accumulated so far. Copying 1, then 2, then 3 ... characters sums to O(n²) work. Use a StringBuilder, which appends into a resizable buffer in amortised O(1).',
    w: {
      a: 'A single loop is enough — the quadratic cost comes from the work done per iteration, not from nesting.',
      c: 'GC adds pressure but is not what makes the asymptotic cost quadratic.',
      d: 'The compiler can rewrite a single concatenation expression, but it cannot hoist a builder across loop iterations.',
    },
    h: 'How much copying does each individual += perform?',
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.ArrayDeque;
import java.util.Deque;

class Main {
    public static void main(String[] args) {
        Deque<Integer> stack = new ArrayDeque<>();
        stack.push(1);
        stack.push(2);
        stack.push(3);
        System.out.println(stack.pop() + " " + stack.peek() + " " + stack.size());
    }
}`,
    o: { a: '1 2 2', b: '3 2 2', c: '3 1 2', d: '1 3 2' },
    a: 'b',
    e: 'Deque.push inserts at the head, so the structure is last-in-first-out. pop removes the most recent value 3, peek then shows 2 without removing it, and two elements remain.',
    w: {
      a: '1 2 2 describes FIFO behaviour, which is what offer/poll would give.',
      c: 'peek looks at the current top, which is 2 after 3 was popped, not the bottom element.',
      d: 'pop returns the top of the stack, which is the most recently pushed value.',
    },
    h: 'push and pop both operate on the same end.',
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.LinkedList;
import java.util.Queue;

class Main {
    public static void main(String[] args) {
        Queue<Integer> q = new LinkedList<>();
        q.offer(1);
        q.offer(2);
        q.offer(3);
        System.out.println(q.poll() + " " + q.peek() + " " + q.size());
    }
}`,
    o: { a: '3 2 2', b: '1 2 2', c: '1 1 2', d: '1 2 3' },
    a: 'b',
    e: 'A Queue is first-in-first-out: offer adds at the tail and poll removes from the head. So 1 comes out first, 2 is now at the head, and two elements remain.',
    w: {
      a: '3 2 2 would be LIFO behaviour, which a stack gives, not a queue.',
      c: 'poll removes the element it returns, so peek sees the next one, 2.',
      d: 'size is 2 after one element has been removed.',
    },
    h: 'Which end does a queue remove from?',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.PriorityQueue;

class Main {
    public static void main(String[] args) {
        PriorityQueue<Integer> pq = new PriorityQueue<>();
        pq.add(5);
        pq.add(1);
        pq.add(3);
        System.out.println(pq.poll() + " " + pq.poll() + " " + pq.poll());
    }
}`,
    o: { a: '5 1 3', b: '5 3 1', c: '1 3 5', d: '1 5 3' },
    a: 'c',
    e: 'A PriorityQueue is a min-heap by default, so poll always returns the smallest remaining element: 1, then 3, then 5. (Printing the queue itself would show internal heap order, not sorted order.)',
    w: {
      a: '5 1 3 is insertion order, which a priority queue does not preserve.',
      b: '5 3 1 is descending order, which needs a reverse comparator.',
      d: 'Every poll re-heapifies, so the second call still returns the smallest remaining value.',
    },
    h: 'What ordering does a natural-order PriorityQueue impose?',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'hard',
    k: 'complexity',
    p: 'You must look up records by id thousands of times per second, and also list every record in id order. Which structure fits?',
    o: {
      a: 'HashMap only',
      b: 'TreeMap only',
      c: 'ArrayList of records, scanned linearly',
      d: 'LinkedHashMap only',
    },
    a: 'b',
    e: 'TreeMap gives O(log n) lookup and keeps keys sorted, so ordered iteration is free. HashMap would be marginally faster per lookup but would force an O(n log n) sort every time you need the ordered listing.',
    w: {
      a: 'HashMap has no ordering, so producing a sorted listing means sorting from scratch each time.',
      c: 'A linear scan is O(n) per lookup, far too slow at that request rate.',
      d: 'LinkedHashMap preserves insertion order, not id order, so the listing would be wrong.',
    },
    h: 'Both requirements matter: fast lookup and a sorted traversal.',
  },
  {
    id: '010',
    d: 'medium',
    k: 'complexity',
    p: 'What is the amortised complexity of ArrayList.add(e) appending at the end, and why is it not simply O(1)?',
    o: {
      a: 'O(n), because the array is copied on every add',
      b: 'O(1) amortised, because the backing array is resized by a growth factor so copies are rare',
      c: 'O(log n), because capacity doubles',
      d: 'O(1) worst case, because capacity is unbounded',
    },
    a: 'b',
    e: 'Most adds just write into a free slot. When the array is full it is reallocated at roughly 1.5x and the contents are copied — an O(n) step, but rare enough that the cost spread over all adds is constant.',
    w: {
      a: 'A copy happens only on resize, not on every add.',
      c: 'The number of resizes is logarithmic, but the per-operation amortised cost is constant.',
      d: 'The individual add that triggers a resize really is O(n), which is why the qualifier "amortised" matters.',
    },
    h: 'What does "amortised" mean here?',
  },
  {
    id: '011',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.Arrays;

class Main {
    public static void main(String[] args) {
        int[] unsorted = {5, 1, 4, 2, 3};
        int[] sorted = unsorted.clone();
        Arrays.sort(sorted);
        System.out.println(Arrays.binarySearch(sorted, 4) + " " + Arrays.toString(sorted));
    }
}`,
    o: {
      a: '3 [1, 2, 3, 4, 5]',
      b: '2 [1, 2, 3, 4, 5]',
      c: '3 [5, 1, 4, 2, 3]',
      d: '-1 [1, 2, 3, 4, 5]',
    },
    a: 'a',
    e: 'clone copies the array, so sorting leaves the original untouched. After sorting, 4 sits at index 3, and binarySearch on a sorted array returns that index.',
    w: {
      b: 'Index 2 holds 3, not 4.',
      c: 'sorted is a separate array and was sorted in place.',
      d: 'A negative result means not found, but 4 is present.',
    },
    h: 'binarySearch requires a sorted array — and clone is a shallow copy of a primitive array, which is a full copy.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'hard',
    k: 'complexity',
    p: 'What is the space complexity of a recursive in-order traversal of a balanced binary tree with n nodes?',
    o: {
      a: 'O(1)',
      b: 'O(log n), for the call stack',
      c: 'O(n), for the call stack',
      d: 'O(n log n)',
    },
    a: 'b',
    e: 'Space is dominated by the call stack, whose depth equals the tree height. A balanced tree has height O(log n). (A degenerate, list-shaped tree would push it to O(n) — the usual caveat.)',
    w: {
      a: 'Recursion inherently consumes a stack frame per level.',
      c: 'O(n) is the unbalanced worst case, not the balanced one.',
      d: 'Nothing here allocates per-node work on top of the stack depth.',
    },
    h: 'How deep does the recursion go?',
  },
  {
    id: '013',
    d: 'medium',
    k: 'complexity',
    p: 'Which of these is the only O(n log n) description that matches `Collections.sort` on a `List<String>`?',
    o: {
      a: 'It uses quicksort, which is O(n log n) on average and O(n²) in the worst case',
      b: 'It uses a stable merge sort (TimSort), which is O(n log n) in the worst case',
      c: 'It uses insertion sort, which is O(n²)',
      d: 'It uses counting sort, which is O(n + k)',
    },
    a: 'b',
    e: 'Collections.sort delegates to a TimSort-based merge sort: stable, O(n log n) in the worst case, and close to O(n) on data that is already partly ordered. Primitive arrays use a dual-pivot quicksort instead, where stability is meaningless.',
    w: {
      a: 'Quicksort is used for primitive arrays, where there is no stability requirement to preserve.',
      c: 'TimSort uses insertion sort for small runs internally, but the overall bound is O(n log n).',
      d: 'Counting sort needs a small integer key range and is not a general-purpose comparison sort.',
    },
    h: 'Sorting objects needs stability; sorting primitives does not.',
  },
];

export const l3Ds = expand(3, 'l3-ds', 'L3-DS', seeds);
