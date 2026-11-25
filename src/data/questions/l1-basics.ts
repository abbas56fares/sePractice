import { expand, JAVA_OUT, COMPILE_ERR, out, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(7 / 2);
    }
}`,
    o: { a: '3.5', b: '3', c: '4', d: '3.0' },
    a: 'b',
    e: 'Both operands are int, so Java performs integer division and truncates the fractional part toward zero. 7 / 2 is 3.',
    w: {
      a: 'You only get 3.5 if at least one operand is a floating-point type, e.g. 7 / 2.0.',
      c: 'Integer division truncates, it does not round. Rounding up would give 4, but Java discards the remainder.',
      d: 'The expression is int, not double, so println prints 3 with no decimal point.',
    },
    h: 'Look at the types of both operands before you divide.',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(-7 / 2);
        System.out.println(-7 % 2);
    }
}`,
    o: { a: '-4 then -1', b: '-3 then -1', c: '-3 then 1', d: '-4 then 1' },
    a: 'b',
    e: 'Integer division truncates toward zero, so -7 / 2 is -3 (not -4). The remainder then takes the sign of the dividend, so -7 % 2 is -1.',
    w: {
      a: 'Java truncates toward zero rather than flooring, so the quotient is -3. Flooring would give -4.',
      c: 'In Java the sign of % follows the left operand, so a negative dividend gives a negative remainder.',
      d: 'Both parts are wrong: the quotient truncates to -3 and the remainder keeps the dividend’s sign.',
    },
    h: 'Java truncates toward zero, and % takes the sign of the left-hand operand.',
    v: out('-3\n-1'),
  },
  {
    id: '003',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        char c = 'A';
        System.out.println(c + 1);
    }
}`,
    o: { a: 'B', b: 'A1', c: '66', d: 'Compilation error' },
    a: 'c',
    e: 'Arithmetic on a char promotes it to int, so the char A (code 65) plus 1 evaluates to the int 66 and println prints 66.',
    w: {
      a: 'You would need an explicit cast back to char — System.out.println((char) (c + 1)) prints B.',
      b: 'There is no String in the expression, so + is addition, not concatenation.',
      d: 'The code is valid: char widens to int automatically in arithmetic expressions.',
    },
    h: 'What type does the + operator produce when one side is a char?',
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
        System.out.println(1 + 2 + "3" + 4 + 5);
    }
}`,
    o: { a: '3345', b: '12345', c: '1239', d: '3 345' },
    a: 'a',
    e: '+ is left-associative. 1 + 2 is the int 3; then "3" turns the running value into the String "33"; the remaining 4 and 5 are appended as text, giving "3345".',
    w: {
      b: 'The leading 1 + 2 happens before any String is involved, so they add to 3 instead of staying separate digits.',
      c: 'Once the expression becomes a String, 4 and 5 are concatenated, not added together.',
      d: 'No space is ever concatenated into the result.',
    },
    h: 'Evaluate strictly left to right and track when the running value becomes a String.',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int x = 5;
        System.out.println(x++ + ++x);
    }
}`,
    o: { a: '10', b: '11', c: '12', d: '13' },
    a: 'c',
    e: 'x++ yields 5 and leaves x as 6. ++x then increments x to 7 and yields 7. The sum is 5 + 7 = 12.',
    w: {
      a: '10 would be 5 + 5, which ignores both increments.',
      b: '11 would be 5 + 6, which misses that ++x increments before producing its value.',
      d: '13 would be 6 + 7, but x++ produces the value before incrementing, so the left operand is 5.',
    },
    h: 'Post-increment yields the old value; pre-increment yields the new one.',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        byte b = (byte) 200;
        System.out.println(b);
    }
}`,
    o: { a: '200', b: '-56', c: '127', d: '-128' },
    a: 'b',
    e: 'A byte holds -128..127. Casting 200 keeps the low 8 bits (11001000), which as a signed two’s-complement byte is 200 - 256 = -56.',
    w: {
      a: '200 does not fit in a byte, and the explicit cast discards the higher bits rather than preserving the value.',
      c: 'Java does not clamp to the maximum value on narrowing; it truncates the bit pattern.',
      d: '-128 is the minimum byte value, not the result of truncating 200.',
    },
    h: 'Narrowing casts truncate bits; then read the remaining 8 bits as two’s complement.',
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(0.1 + 0.2);
    }
}`,
    o: {
      a: '0.3',
      b: '0.30000000000000004',
      c: '0.2999999999999999',
      d: '0.30000000000000001',
    },
    a: 'b',
    e: 'Neither 0.1 nor 0.2 is exactly representable in binary floating point. The nearest double to their sum prints as 0.30000000000000004, which is why money is never stored in double.',
    w: {
      a: '0.3 is what exact decimal arithmetic would give; double arithmetic carries a tiny representation error.',
      c: 'The error here is above 0.3, not below it.',
      d: 'Java prints the shortest decimal that round-trips to the same double, which is 0.30000000000000004.',
    },
    h: 'Think about what binary fractions can represent exactly.',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(Integer.MAX_VALUE + 1);
    }
}`,
    o: { a: '2147483648', b: '-2147483648', c: '0', d: 'Runtime exception' },
    a: 'b',
    e: 'int arithmetic wraps around silently on overflow. One past Integer.MAX_VALUE (2147483647) wraps to Integer.MIN_VALUE, -2147483648.',
    w: {
      a: '2147483648 does not fit in an int. You would need a long: Integer.MAX_VALUE + 1L.',
      c: 'Overflow wraps to the minimum value, it does not reset to zero.',
      d: 'Java throws nothing on integer overflow — that silence is exactly what makes the bug dangerous.',
    },
    h: 'Integer overflow in Java is silent. Where does the value wrap to?',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int a = 5;
        a += 2.5;
        System.out.println(a);
    }
}`,
    o: { a: 'Compilation error', b: '7', c: '7.5', d: '8' },
    a: 'b',
    e: 'A compound assignment carries an implicit narrowing cast, so a += 2.5 means a = (int) (a + 2.5). That is (int) 7.5, which truncates to 7.',
    w: {
      a: 'This is the classic trap: a = a + 2.5 would not compile, but a += 2.5 does, because of the implicit cast.',
      c: 'a is an int, so it cannot hold a fractional value.',
      d: 'The implicit cast truncates rather than rounds, so 7.5 becomes 7, not 8.',
    },
    h: 'Compound assignment operators quietly insert a cast back to the left-hand type.',
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
        int i = 0;
        boolean result = (i > 0) && (i++ > -1);
        System.out.println(result + " " + i);
    }
}`,
    o: { a: 'false 1', b: 'false 0', c: 'true 1', d: 'true 0' },
    a: 'b',
    e: '&& short-circuits: because (i > 0) is false the right operand is never evaluated, so i++ never runs. The result is false and i is still 0.',
    w: {
      a: 'The i++ on the right is skipped entirely, so i is never incremented.',
      c: 'i starts at 0, so i > 0 is false and the whole && expression is false.',
      d: 'i is indeed still 0, but the expression evaluates to false, not true.',
    },
    h: 'Does && ever evaluate its right-hand side when the left side is false?',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'easy',
    k: 'compile',
    p: 'What happens when this program is compiled and run?',
    c: `
class Main {
    public static void main(String[] args) {
        final int limit = 10;
        limit = 20;
        System.out.println(limit);
    }
}`,
    o: {
      a: 'It prints 20',
      b: 'It prints 10',
      c: 'It fails to compile because a final variable cannot be reassigned',
      d: 'It compiles but throws an exception at runtime',
    },
    a: 'c',
    e: 'final means the variable may be assigned exactly once. The second assignment is rejected at compile time with "cannot assign a value to final variable limit".',
    w: {
      a: 'The reassignment never compiles, so nothing is printed.',
      b: 'The program does not run at all — compilation stops first.',
      d: 'This is a compile-time error, not a runtime one. The compiler can prove the rule is broken without running anything.',
    },
    h: 'How many times may a final variable be assigned?',
    v: COMPILE_ERR,
  },
  {
    id: '012',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(5 / 2.0);
    }
}`,
    o: { a: '2', b: '2.5', c: '2.0', d: '3' },
    a: 'b',
    e: 'One operand is a double, so the int 5 is promoted to 5.0 and the division is floating point: 2.5.',
    w: {
      a: '2 would be the result of int division, which happens only when both operands are integers.',
      c: '2.0 would require truncation before the division — the real quotient is 2.5.',
      d: 'Java never rounds a division result up.',
    },
    h: 'Mixed int/double arithmetic promotes to double.',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'medium',
    k: 'concept',
    p: 'Which declaration below does NOT compile?',
    o: {
      a: 'long big = 10000000000L;',
      b: 'float f = 3.14f;',
      c: 'int n = 10000000000;',
      d: 'double d = 10;',
    },
    a: 'c',
    e: '10000000000 is an int literal by default and exceeds Integer.MAX_VALUE, so the compiler reports "integer number too large". It needs an L suffix.',
    w: {
      a: 'The L suffix makes this a long literal, which comfortably holds 10 billion.',
      b: 'The f suffix makes 3.14 a float literal, which is exactly what a float variable needs.',
      d: 'int widens to double implicitly, so d simply becomes 10.0.',
    },
    h: 'Integer literals have a default type. What is it, and what is its range?',
  },
  {
    id: '014',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int x = 10;
        int y = 3;
        System.out.println(x / y + " " + x % y);
    }
}`,
    o: { a: '3 1', b: '3.33 1', c: '3 3', d: '1 3' },
    a: 'a',
    e: '10 / 3 is integer division, giving 3, and 10 % 3 is the remainder, 1. The output is "3 1".',
    w: {
      b: 'x / y is int division, so there is no fractional part to print.',
      c: 'The remainder of 10 divided by 3 is 1, not 3.',
      d: 'The quotient is printed first and the remainder second, in the order written.',
    },
    v: JAVA_OUT,
  },
  {
    id: '015',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int i = 1;
        i = i++ + i++;
        System.out.println(i);
    }
}`,
    o: { a: '3', b: '4', c: '2', d: '5' },
    a: 'a',
    e: 'The right-hand side is evaluated first: the first i++ yields 1 (i becomes 2), the second yields 2 (i becomes 3), so the sum is 3. That 3 is then assigned to i, overwriting the increments.',
    w: {
      b: '4 would be 2 + 2; post-increment yields the value before the increment, so the first operand is 1.',
      c: '2 ignores the second increment entirely.',
      d: '5 would be 2 + 3, which again misreads post-increment as pre-increment.',
    },
    h: 'Evaluate the whole right-hand side first, then assign — the assignment wins.',
    v: JAVA_OUT,
  },
];

export const l1Basics = expand(1, 'l1-basics', 'L1-VAR', seeds);
