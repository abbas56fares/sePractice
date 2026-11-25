import { expand, JAVA_OUT, COMPILE_ERR, out, throws, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    static int f() {
        return 1;
        System.out.println("after");
    }

    public static void main(String[] args) {
        System.out.println(f());
    }
}`,
    o: {
      a: 'It prints 1',
      b: 'It prints after then 1',
      c: 'It fails to compile — unreachable statement',
      d: 'It compiles with a warning and prints 1',
    },
    a: 'c',
    e: 'Java’s flow analysis proves the println can never execute and treats dead code as an error: "unreachable statement". Many languages only warn; Java rejects it.',
    w: {
      a: 'The dead statement must be removed before the class will compile at all.',
      b: 'Nothing after an unconditional return can ever run.',
      d: 'This is an error in Java, not a warning.',
    },
    h: 'Can any input reach that println?',
    v: COMPILE_ERR,
  },
  {
    id: '002',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    public static void main(String[] args) {
        int x;
        if (args.length > 0) {
            x = 1;
        }
        System.out.println(x);
    }
}`,
    o: {
      a: 'It prints 0',
      b: 'It prints 1',
      c: 'It fails to compile — x might not have been initialised',
      d: 'It throws an exception at runtime',
    },
    a: 'c',
    e: 'Local variables get no default value. The compiler can see a path where x is never assigned, so it reports "variable x might not have been initialized". Fields would default to 0; locals do not.',
    w: {
      a: 'Default initialisation applies to fields and array elements, never to locals.',
      b: 'That path only runs when arguments are present, and the compiler must prove it for all paths.',
      d: 'Definite-assignment analysis happens at compile time.',
    },
    h: 'Do local variables get a default value?',
    v: COMPILE_ERR,
  },
  {
    id: '003',
    d: 'easy',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    public static void main(String[] args) {
        int x = 3.5;
        System.out.println(x);
    }
}`,
    o: {
      a: 'It prints 3',
      b: 'It prints 3.5',
      c: 'It fails to compile — possible lossy conversion from double to int',
      d: 'It prints 4',
    },
    a: 'c',
    e: 'A double literal cannot be assigned to an int implicitly because information would be lost. The compiler demands an explicit cast: int x = (int) 3.5.',
    w: {
      a: '3 is what the explicit cast would give, but Java will not insert it silently.',
      b: 'An int can never hold a fractional value.',
      d: 'A cast truncates rather than rounds, so even with the cast you get 3.',
    },
    h: 'Java requires narrowing conversions to be written out.',
    v: COMPILE_ERR,
  },
  {
    id: '004',
    d: 'medium',
    k: 'bug',
    p: 'What happens when this program runs?',
    c: `
class Main {
    public static void main(String[] args) {
        String s = "hello";
        System.out.println(s.substring(2, 10));
    }
}`,
    o: {
      a: 'It prints llo',
      b: 'It prints llo followed by spaces',
      c: 'It throws StringIndexOutOfBoundsException',
      d: 'It fails to compile',
    },
    a: 'c',
    e: 'The end index may equal the length but never exceed it. 10 is past the end of a five-character string, so substring throws StringIndexOutOfBoundsException rather than clamping.',
    w: {
      a: 'Java does not silently clamp the end index; s.substring(2) would be needed for that.',
      b: 'No padding is ever added.',
      d: 'The indices are runtime values as far as the compiler is concerned.',
    },
    h: 'Does substring clamp an out-of-range end index?',
    v: throws('StringIndexOutOfBoundsException'),
  },
  {
    id: '005',
    d: 'hard',
    k: 'bug',
    p: 'What happens when this program runs?',
    c: `
import java.util.HashMap;
import java.util.Map;

class Main {
    public static void main(String[] args) {
        Map<String, Integer> counts = new HashMap<>();
        counts.put("a", 1);
        int n = counts.get("missing");
        System.out.println(n);
    }
}`,
    o: {
      a: 'It prints 0',
      b: 'It throws NullPointerException',
      c: 'It fails to compile',
      d: 'It prints null',
    },
    a: 'b',
    e: 'get returns null for an absent key, and assigning it to an int forces an unboxing call — null.intValue() — which throws NullPointerException. Use getOrDefault("missing", 0) or declare n as Integer.',
    w: {
      a: 'There is no implicit zero default; the map simply has no entry.',
      c: 'Unboxing Integer to int is a legal implicit conversion, so this compiles.',
      d: 'An int variable cannot hold null, which is exactly what causes the exception.',
    },
    h: 'What does the implicit conversion from Integer to int actually call?',
    v: throws('NullPointerException'),
  },
  {
    id: '006',
    d: 'hard',
    k: 'bug',
    p: 'This is the classic binary-search midpoint bug. What does the program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int lo = 2000000000;
        int hi = 2000000001;
        System.out.println((lo + hi) / 2);
        System.out.println(lo + (hi - lo) / 2);
    }
}`,
    o: {
      a: '2000000000 then 2000000000',
      b: '-147483647 then 2000000000',
      c: '2000000000 then -147483647',
      d: 'It throws ArithmeticException',
    },
    a: 'b',
    e: 'lo + hi is just over 4 billion and overflows int, wrapping to a negative value whose half is -147483647 — an invalid index. The second form never exceeds hi, so it stays correct. This exact bug sat in many published binary searches for years.',
    w: {
      a: 'The naive midpoint overflows, so the first line is not the expected value.',
      c: 'It is the first expression that overflows; the second is the safe rewrite.',
      d: 'Integer overflow in Java is silent — nothing is thrown, which is what makes it dangerous.',
    },
    h: 'How large is lo + hi compared with Integer.MAX_VALUE?',
    v: out('-147483647\n2000000000'),
  },
  {
    id: '007',
    d: 'medium',
    k: 'bug',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int total = 7;
        int count = 2;
        System.out.println(total / count);
        System.out.println((double) total / count);
        System.out.println((double) (total / count));
    }
}`,
    o: {
      a: '3, 3.5, 3.5',
      b: '3, 3.5, 3.0',
      c: '3.5, 3.5, 3.5',
      d: '3, 3.0, 3.5',
    },
    a: 'b',
    e: 'The first is int division: 3. The second casts before dividing, so the division is floating point: 3.5. The third divides first (getting 3) and only then widens, giving 3.0 — the cast is in the wrong place.',
    w: {
      a: 'The third expression has already lost the remainder before the cast applies.',
      c: 'The first expression has two int operands and truncates.',
      d: 'The second expression casts the numerator before dividing, so it keeps the 0.5.',
    },
    h: 'Where exactly does each cast apply?',
    v: out('3\n3.5\n3.0'),
  },
  {
    id: '008',
    d: 'hard',
    k: 'bug',
    p: 'This nested loop is meant to sum every cell. What does it actually print?',
    c: `
class Main {
    public static void main(String[] args) {
        int[][] grid = {{1, 2}, {3, 4}};
        int sum = 0;
        for (int i = 0; i < grid.length; i++) {
            for (int j = 0; j < grid[i].length; j++) {
                sum += grid[i][i];
            }
        }
        System.out.println(sum);
    }
}`,
    o: { a: '10', b: '5', c: '6', d: '8' },
    a: 'a',
    e: 'The inner index is i rather than j, so each row adds its diagonal element once per column: grid[0][0] = 1 twice and grid[1][1] = 4 twice, giving 2 + 8 = 10. It coincidentally equals the correct total 1+2+3+4, which is exactly how such bugs survive testing.',
    w: {
      b: '5 is the true diagonal sum 1 + 4, counted once each rather than once per column.',
      c: '6 does not correspond to any of the sums the loop can produce.',
      d: '8 is only the second row’s contribution.',
    },
    h: 'Look very carefully at the two indices inside the loop body.',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'easy',
    k: 'bug',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String input = " yes ";
        System.out.println(input.equals("yes") + " " + input.trim().equals("yes"));
    }
}`,
    o: { a: 'true true', b: 'false true', c: 'false false', d: 'true false' },
    a: 'b',
    e: 'equals compares every character, surrounding whitespace included, so the raw input does not match. trim() removes the leading and trailing spaces first, and then it does.',
    w: {
      a: 'The untrimmed string has extra spaces, so it is not equal to "yes".',
      c: 'After trimming, the strings are identical.',
      d: 'The two results are the other way round.',
    },
    h: 'Count the characters in " yes " and in "yes".',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        char c = '5';
        System.out.println(c - '0');
        System.out.println((int) c);
    }
}`,
    o: { a: '5 then 53', b: '5 then 5', c: '53 then 53', d: '0 then 53' },
    a: 'a',
    e: 'Subtracting the character 0 converts a digit character to its numeric value: 53 - 48 = 5. Casting the char directly yields its code point, 53.',
    w: {
      b: 'An explicit cast to int exposes the character code, not the digit value.',
      c: 'The subtraction maps the code back down to the digit it represents.',
      d: 'c - 0 would be 53; it is subtracting the character 0 (48) that gives 5.',
    },
    h: 'The character 5 and the number 5 have different values.',
    v: out('5\n53'),
  },
  {
    id: '011',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<String>[] buckets = new List<String>[10];
        System.out.println(buckets.length);
    }
}`,
    o: {
      a: 'It prints 10',
      b: 'It fails to compile — generic array creation is not allowed',
      c: 'It throws ArrayStoreException',
      d: 'It prints 0',
    },
    a: 'b',
    e: 'Arrays check their element type at runtime, but generic type arguments are erased, so the check could not be performed. Java therefore forbids generic array creation outright. The usual workaround is a List<List<String>>.',
    w: {
      a: 'The array is never created — the declaration itself is rejected.',
      c: 'ArrayStoreException needs a live array; this one cannot be constructed.',
      d: 'The length would be 10 if the array existed at all.',
    },
    h: 'Arrays know their element type at runtime. Do generics?',
    v: COMPILE_ERR,
  },
  {
    id: '012',
    d: 'hard',
    k: 'bug',
    p: 'This loop is meant to remove every "b". What does it actually print?',
    c: `
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<String> l = new ArrayList<>(Arrays.asList("a", "b", "b", "c"));
        for (int i = 0; i < l.size(); i++) {
            if (l.get(i).equals("b")) {
                l.remove(i);
            }
        }
        System.out.println(l);
    }
}`,
    o: { a: '[a, c]', b: '[a, b, c]', c: '[a, b, b, c]', d: 'It throws ConcurrentModificationException' },
    a: 'b',
    e: 'Removing index 1 shifts the second "b" down into index 1, but i has already advanced to 2, so that element is skipped. One "b" survives. Iterating backwards, or using removeIf, avoids the skip.',
    w: {
      a: 'That is the intention, but the index advance past the shifted element prevents it.',
      c: 'One removal does succeed.',
      d: 'An index-based for loop uses no iterator, so there is no modification check to trip.',
    },
    h: 'What happens to the remaining elements’ indices after a removal?',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'hard',
    k: 'bug',
    p: 'What does this program print?',
    c: `
class Main {
    static int sum(int[] a) {
        int total = 0;
        for (int i = 1; i < a.length - 1; i++) {
            total += a[i];
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(sum(new int[] {1, 2, 3, 4, 5}));
    }
}`,
    o: { a: '15', b: '9', c: '14', d: '12' },
    a: 'b',
    e: 'The loop starts at 1 and stops before a.length - 1 = 4, so it visits indices 1, 2 and 3 only: 2 + 3 + 4 = 9. Both the first and last elements are skipped — two off-by-one errors.',
    w: {
      a: '15 is the full sum, which needs i from 0 to a.length - 1.',
      c: '14 skips only the first element.',
      d: '12 skips only the last element (1+2+3+... does not produce 12 either way).',
    },
    h: 'List exactly which indices the loop visits.',
    v: JAVA_OUT,
  },
];

export const l3Debug = expand(3, 'l3-debug', 'L3-DBG', seeds);
