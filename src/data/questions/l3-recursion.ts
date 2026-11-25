import { expand, JAVA_OUT, throws, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int calls = 0;

    static int fib(int n) {
        calls++;
        if (n <= 1) {
            return n;
        }
        return fib(n - 1) + fib(n - 2);
    }

    public static void main(String[] args) {
        fib(5);
        System.out.println(calls);
    }
}`,
    o: { a: '5', b: '9', c: '15', d: '25' },
    a: 'c',
    e: 'Every call counts itself, so T(0) = T(1) = 1 and T(n) = 1 + T(n-1) + T(n-2). That gives 3, 5, 9, 15 for n = 2..5. The explosive call count is exactly why naive Fibonacci is the standard example for memoisation.',
    w: {
      a: '5 would be the count for a linear recursion, not a branching one.',
      b: '9 is the count for fib(4).',
      d: '25 overcounts; the recurrence gives 15.',
    },
    h: 'Build the count bottom-up with T(n) = 1 + T(n-1) + T(n-2).',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'medium',
    k: 'bug',
    p: 'What happens when this program runs?',
    c: `
class Main {
    static int f(int n) {
        return n + f(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(f(5));
    }
}`,
    o: {
      a: 'It prints 15',
      b: 'It throws StackOverflowError',
      c: 'It fails to compile',
      d: 'It prints 0',
    },
    a: 'b',
    e: 'There is no base case, so n runs past zero into negative numbers forever. Each call consumes a stack frame until the JVM exhausts the thread stack and throws StackOverflowError.',
    w: {
      a: '15 is what the intended 5+4+3+2+1 would give, but nothing stops the recursion at 1.',
      c: 'The recursion is syntactically fine; the missing termination condition is a logic error.',
      d: 'The method never returns normally.',
    },
    h: 'What condition stops this recursion?',
    v: throws('StackOverflowError'),
  },
  {
    id: '003',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int moves(int n) {
        return n == 0 ? 0 : 2 * moves(n - 1) + 1;
    }

    public static void main(String[] args) {
        System.out.println(moves(4));
    }
}`,
    o: { a: '8', b: '15', c: '16', d: '7' },
    a: 'b',
    e: 'This is the Towers of Hanoi recurrence, whose closed form is 2^n - 1. Unrolling: 0, 1, 3, 7, 15.',
    w: {
      a: '8 is 2^3, which skips the -1 and uses the wrong exponent.',
      c: '16 is 2^4, one more than the recurrence produces.',
      d: '7 is moves(3).',
    },
    h: 'Unroll the recurrence by hand from n = 0 upward.',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static String rev(String s) {
        return s.isEmpty() ? "" : rev(s.substring(1)) + s.charAt(0);
    }

    public static void main(String[] args) {
        System.out.println(rev("abc"));
    }
}`,
    o: { a: 'abc', b: 'cba', c: 'a', d: 'It recurses forever' },
    a: 'b',
    e: 'Each frame reverses the tail and then appends its own first character, so the first character ends up last: rev("abc") = rev("bc") + "a" = "cb" + "a" = "cba".',
    w: {
      a: 'Appending the current character after the recursive result is what reverses the order.',
      c: 'The recursion combines every character, not just the first.',
      d: 'substring(1) shrinks the string on every call, so the empty-string base case is always reached.',
    },
    h: 'Expand the calls fully, then combine on the way back up.',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static boolean hasPair(int[] sorted, int target) {
        int i = 0;
        int j = sorted.length - 1;
        while (i < j) {
            int sum = sorted[i] + sorted[j];
            if (sum == target) {
                return true;
            }
            if (sum < target) {
                i++;
            } else {
                j--;
            }
        }
        return false;
    }

    public static void main(String[] args) {
        int[] a = {1, 3, 5, 7, 9};
        System.out.println(hasPair(a, 12) + " " + hasPair(a, 4) + " " + hasPair(a, 2));
    }
}`,
    o: {
      a: 'true true false',
      b: 'true false false',
      c: 'true true true',
      d: 'false true false',
    },
    a: 'a',
    e: 'The two-pointer scan works because the array is sorted. 12 = 3 + 9 and 4 = 1 + 3 are both found; no two distinct elements sum to 2, so the pointers meet and the method returns false.',
    w: {
      b: '4 is reachable as 1 + 3, found after the right pointer walks down.',
      c: 'The smallest possible sum is 1 + 3 = 4, so 2 is impossible.',
      d: '12 is found as 3 + 9.',
    },
    h: 'Move the pointer that can improve the sum, and stop when they meet.',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static boolean isEven(int n) {
        return n == 0 ? true : isOdd(n - 1);
    }

    static boolean isOdd(int n) {
        return n == 0 ? false : isEven(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(isEven(4) + " " + isOdd(7));
    }
}`,
    o: { a: 'true true', b: 'true false', c: 'false true', d: 'false false' },
    a: 'a',
    e: 'The two methods recurse into each other, each stripping one from n, so the answer depends on which base case is reached. 4 bottoms out in isEven (true) and 7 bottoms out in isEven as well, making isOdd(7) true.',
    w: {
      b: '7 is odd, so isOdd(7) is true.',
      c: '4 is even, so isEven(4) is true.',
      d: 'Both answers are correct for their inputs, so both are true.',
    },
    h: 'Count how many times each chain alternates before reaching 0.',
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int pow(int b, int e) {
        return e == 0 ? 1 : b * pow(b, e - 1);
    }

    public static void main(String[] args) {
        System.out.println(pow(2, 10));
    }
}`,
    o: { a: '20', b: '512', c: '1024', d: '2048' },
    a: 'c',
    e: 'The recursion multiplies b by itself e times, with the base case contributing the identity 1. 2^10 is 1024.',
    w: {
      a: '20 is 2 * 10 — the product of the arguments, not the power.',
      b: '512 is 2^9, which would be the result if the base case returned b instead of 1.',
      d: '2048 is 2^11, one multiplication too many.',
    },
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int countSubsets(int[] a, int i, int target) {
        if (target == 0) {
            return 1;
        }
        if (i == a.length || target < 0) {
            return 0;
        }
        return countSubsets(a, i + 1, target - a[i]) + countSubsets(a, i + 1, target);
    }

    public static void main(String[] args) {
        int[] a = {1, 2, 3};
        System.out.println(countSubsets(a, 0, 3));
    }
}`,
    o: { a: '1', b: '2', c: '3', d: '0' },
    a: 'b',
    e: 'Each element is either taken or skipped, and a branch succeeds when the remaining target reaches 0. Two subsets of {1, 2, 3} sum to 3: {3} and {1, 2}.',
    w: {
      a: '1 counts only one of the two valid subsets.',
      c: '3 would require a third subset summing to 3, and there is none.',
      d: 'At least one subset works, so the count is not zero.',
    },
    h: 'Enumerate every subset and keep those summing to 3.',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int steps(int n) {
        return n == 1 ? 0 : 1 + steps(n % 2 == 0 ? n / 2 : 3 * n + 1);
    }

    public static void main(String[] args) {
        System.out.println(steps(6));
    }
}`,
    o: { a: '6', b: '8', c: '9', d: '3' },
    a: 'b',
    e: 'The Collatz sequence from 6 is 6, 3, 10, 5, 16, 8, 4, 2, 1 — eight transitions to reach 1.',
    w: {
      a: '6 undercounts; the odd step 3 to 10 lengthens the chain considerably.',
      c: '9 counts the starting value as a step as well.',
      d: '3 would be the count if every step halved the value.',
    },
    h: 'Write out the full chain and count the arrows, not the numbers.',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int search(int[] a, int lo, int hi, int target, int depth) {
        if (lo > hi) {
            return depth;
        }
        int mid = (lo + hi) / 2;
        if (a[mid] == target) {
            return depth;
        }
        if (a[mid] < target) {
            return search(a, mid + 1, hi, target, depth + 1);
        }
        return search(a, lo, mid - 1, target, depth + 1);
    }

    public static void main(String[] args) {
        int[] a = {1, 3, 5, 7, 9, 11, 13};
        System.out.println(search(a, 0, 6, 13, 0));
    }
}`,
    o: { a: '1', b: '2', c: '3', d: '6' },
    a: 'b',
    e: 'lo=0, hi=6 gives mid=3 (value 7 < 13), so the search moves right with depth 1. lo=4, hi=6 gives mid=5 (value 11 < 13), moving right with depth 2. lo=6, hi=6 gives mid=6, which is 13 — found at depth 2.',
    w: {
      a: '1 stops one halving too early; 11 is not the target.',
      c: '3 counts an extra level the search never needs.',
      d: '6 is a linear scan count, not a binary-search depth.',
    },
    h: 'Track lo, hi and mid for each call.',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int depth(int[] tree, int i) {
        if (i >= tree.length || tree[i] == 0) {
            return 0;
        }
        return 1 + Math.max(depth(tree, 2 * i + 1), depth(tree, 2 * i + 2));
    }

    public static void main(String[] args) {
        int[] tree = {1, 2, 3, 0, 4, 0, 0};
        System.out.println(depth(tree, 0));
    }
}`,
    o: { a: '2', b: '3', c: '4', d: '7' },
    a: 'b',
    e: 'In this array layout node i has children at 2i+1 and 2i+2, and 0 means absent. Index 0 (1) has children 1 (2) and 2 (3); index 1 has children 3 (absent) and 4 (value 4). The longest path is 1 to 2 to 4, three levels deep.',
    w: {
      a: '2 stops before the leaf at index 4.',
      c: '4 would need a fourth level, but index 4’s children (9 and 10) are past the end of the array.',
      d: '7 is the array length, not the tree depth.',
    },
    h: 'Find the longest root-to-leaf path, counting nodes.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'medium',
    k: 'complexity',
    p: 'Naive recursive Fibonacci is exponential. What does adding memoisation change?',
    o: {
      a: 'Nothing — the recursion tree is the same size',
      b: 'Time drops to O(n) because each distinct n is computed once, at the cost of O(n) extra space',
      c: 'Time drops to O(log n)',
      d: 'It becomes O(1) in both time and space',
    },
    a: 'b',
    e: 'The exponential cost comes from recomputing the same subproblems. Caching each result means there are only n distinct subproblems, each solved once in constant time — O(n) time and O(n) space for the cache plus the stack.',
    w: {
      a: 'Memoisation prunes the tree to a path plus cache hits, which is exactly the point.',
      c: 'O(log n) would require halving the problem each step, as binary search does. Fibonacci decrements.',
      d: 'You still have to compute n distinct values at least once.',
    },
    h: 'How many genuinely distinct subproblems does fib(n) have?',
  },
  {
    id: '013',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static String walk(int n) {
        if (n == 0) {
            return "|";
        }
        return n + walk(n - 1) + n;
    }

    public static void main(String[] args) {
        System.out.println(walk(3));
    }
}`,
    o: { a: '321|123', b: '123|321', c: '333|333', d: '321|321' },
    a: 'a',
    e: 'Each frame contributes its own n on both sides of the recursive result, so the descending prefix is built on the way down and mirrored on the way back: 3, 2, 1, then the base "|", then 1, 2, 3.',
    w: {
      b: 'The outermost frame contributes the first character, and that frame has n = 3.',
      c: 'Each frame uses its own n, which decreases with depth.',
      d: 'The suffix is appended as the frames unwind, so it runs in the opposite order to the prefix.',
    },
    h: 'The prefix is written entering each frame, the suffix on leaving it.',
    v: JAVA_OUT,
  },
];

export const l3Recursion = expand(3, 'l3-recursion', 'L3-REC', seeds);
