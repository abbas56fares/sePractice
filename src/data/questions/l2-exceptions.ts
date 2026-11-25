import { expand, JAVA_OUT, COMPILE_ERR, out, throws, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int f() {
        try {
            return 1;
        } finally {
            System.out.println("finally");
        }
    }

    public static void main(String[] args) {
        System.out.println(f());
    }
}`,
    o: { a: '1 then finally', b: 'finally then 1', c: '1 only', d: 'finally only' },
    a: 'b',
    e: 'The return value is computed, then the finally block runs before control actually leaves the method, and only then does the caller receive 1. So "finally" is printed first.',
    w: {
      a: 'The caller cannot print the result until f() has returned, and finally runs before that.',
      c: 'A finally block runs on every exit path, including a normal return.',
      d: 'The method still returns 1, which main prints.',
    },
    h: 'Does finally run before or after control leaves the method?',
    v: out('finally\n1'),
  },
  {
    id: '002',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int f() {
        try {
            return 1;
        } finally {
            return 2;
        }
    }

    public static void main(String[] args) {
        System.out.println(f());
    }
}`,
    o: { a: '1', b: '2', c: 'Compilation error', d: '3' },
    a: 'b',
    e: 'A return in finally replaces whatever the try block was returning — and would equally discard a pending exception. This is why returning from finally is considered a bug waiting to happen.',
    w: {
      a: 'The try block’s return value is abandoned when finally completes with its own return.',
      c: 'It compiles; most linters warn about it, but javac accepts it.',
      d: 'Nothing adds the two values.',
    },
    h: 'What happens to the first return when finally returns as well?',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
import java.io.IOException;

class Main {
    static void f() {
        throw new IOException("boom");
    }

    public static void main(String[] args) {
        f();
    }
}`,
    o: {
      a: 'It throws IOException at runtime',
      b: 'It fails to compile — IOException is checked and is neither caught nor declared',
      c: 'It compiles and prints boom',
      d: 'It fails to compile — you cannot throw an exception you created with new',
    },
    a: 'b',
    e: 'IOException is a checked exception, so every method that may throw it must either catch it or declare `throws IOException`. f() does neither, so the compiler reports an unreported exception.',
    w: {
      a: 'The program never compiles, so it cannot reach runtime.',
      c: 'Nothing prints the message, and compilation fails regardless.',
      d: 'throw new SomeException(...) is the normal way to raise an exception.',
    },
    h: 'Is IOException checked or unchecked, and what does that require?',
    v: COMPILE_ERR,
  },
  {
    id: '004',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    public static void main(String[] args) {
        try {
            System.out.println(10 / 0);
        } catch (Exception e) {
            System.out.println("general");
        } catch (ArithmeticException e) {
            System.out.println("arithmetic");
        }
    }
}`,
    o: {
      a: 'It prints general',
      b: 'It prints arithmetic',
      c: 'It fails to compile — ArithmeticException has already been caught',
      d: 'It prints both',
    },
    a: 'c',
    e: 'catch clauses are tried in order, and Exception already covers ArithmeticException, so the second clause is unreachable. The compiler rejects it: "exception ArithmeticException has already been caught". Catch the most specific type first.',
    w: {
      a: 'That would be the behaviour if the unreachable clause were removed — but as written the code does not compile.',
      b: 'The broader clause appears first, so the specific one could never be selected.',
      d: 'At most one catch clause ever runs for a given exception.',
    },
    h: 'Could the second catch clause ever be reached?',
    v: COMPILE_ERR,
  },
  {
    id: '005',
    d: 'easy',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(5 / 0);
    }
}`,
    o: {
      a: 'It prints Infinity',
      b: 'It prints 0',
      c: 'It throws ArithmeticException',
      d: 'It fails to compile',
    },
    a: 'c',
    e: 'Integer division by zero has no representable result, so the JVM throws ArithmeticException with the message "/ by zero".',
    w: {
      a: 'Infinity is what floating-point division gives. Integer arithmetic has no such value.',
      b: 'Java never silently substitutes a result for an invalid division.',
      d: 'The divisor is an ordinary expression as far as the compiler is concerned, so this compiles.',
    },
    h: 'Integer and floating-point division behave differently here.',
    v: throws('ArithmeticException'),
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(5.0 / 0);
        System.out.println(-5.0 / 0);
        System.out.println(0.0 / 0);
    }
}`,
    o: {
      a: 'It throws ArithmeticException',
      b: 'Infinity, -Infinity, NaN',
      c: '0.0, 0.0, 0.0',
      d: 'Infinity, Infinity, 0.0',
    },
    a: 'b',
    e: 'IEEE 754 floating point defines these cases: a non-zero numerator over zero gives a signed infinity, and 0.0 / 0.0 is Not-a-Number. Only integer division by zero throws.',
    w: {
      a: 'Floating-point division never throws for a zero divisor; it produces a special value instead.',
      c: 'Java does not clamp these results to zero.',
      d: 'The sign of the numerator carries into the infinity, and 0.0 / 0.0 is NaN rather than 0.0.',
    },
    h: 'Three distinct special values, not one.',
    v: out('Infinity\n-Infinity\nNaN'),
  },
  {
    id: '007',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        try {
            System.out.println("try");
            throw new RuntimeException("x");
        } catch (RuntimeException e) {
            System.out.println("catch " + e.getMessage());
        } finally {
            System.out.println("finally");
        }
        System.out.println("after");
    }
}`,
    o: {
      a: 'try, catch x, finally, after',
      b: 'try, finally, catch x, after',
      c: 'try, catch x, after',
      d: 'try, catch x, finally',
    },
    a: 'a',
    e: 'The try body runs until the throw, the matching catch handles it, finally runs next, and because the exception was handled execution continues normally to "after".',
    w: {
      b: 'finally runs after the catch block completes, not before it.',
      c: 'A finally block always runs; it is never skipped.',
      d: 'The exception was caught, so the method does not terminate — "after" still runs.',
    },
    v: out('try\ncatch x\nfinally\nafter'),
  },
  {
    id: '008',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(Arrays.asList(10, 20, 30));
        list.remove(1);
        System.out.println(list);
    }
}`,
    o: { a: '[10, 20, 30]', b: '[20, 30]', c: '[10, 30]', d: '[10, 20]' },
    a: 'c',
    e: 'List has both remove(int index) and remove(Object). An int literal matches the index overload exactly, so element 1 (the value 20) is removed by position, leaving [10, 30]. To remove by value you need remove(Integer.valueOf(1)).',
    w: {
      a: 'An element really is removed.',
      b: '[20, 30] would be the result of removing index 0.',
      d: '[10, 20] would be the result of removing index 2.',
    },
    h: 'Which of the two remove overloads does an int argument select?',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.HashMap;
import java.util.Map;

class Main {
    public static void main(String[] args) {
        Map<String, Integer> m = new HashMap<>();
        System.out.println(m.put("a", 1));
        System.out.println(m.put("a", 2));
        System.out.println(m.get("a"));
    }
}`,
    o: { a: '1, 2, 2', b: 'null, 1, 2', c: 'null, null, 2', d: 'null, 1, 1' },
    a: 'b',
    e: 'put returns the value previously associated with the key, or null if there was none. So the first call returns null, the second returns the displaced 1, and the stored value is now 2.',
    w: {
      a: 'put returns the old value, not the one being stored.',
      c: 'The second put displaces the existing 1 and therefore returns it.',
      d: 'The second put overwrote the value, so get returns 2.',
    },
    h: 'What does Map.put hand back?',
    v: out('null\n1\n2'),
  },
  {
    id: '010',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

class Main {
    public static void main(String[] args) {
        Set<String> s = new HashSet<>(Arrays.asList("a", "b", "a", "c"));
        System.out.println(s.size());
    }
}`,
    o: { a: '4', b: '3', c: '2', d: 'It throws IllegalArgumentException' },
    a: 'b',
    e: 'A Set holds no duplicates. The repeated "a" is discarded, leaving the three distinct elements a, b and c.',
    w: {
      a: '4 is the number of items offered, not the number stored.',
      c: '2 would discard one distinct element as well as the duplicate.',
      d: 'The HashSet constructor silently ignores duplicates. It is Set.of(...) that rejects them with an exception.',
    },
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'hard',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<String> list = new ArrayList<>(Arrays.asList("a", "b", "c", "d"));
        for (String s : list) {
            if (s.equals("b")) {
                list.remove(s);
            }
        }
        System.out.println(list);
    }
}`,
    o: {
      a: 'It prints [a, c, d]',
      b: 'It throws ConcurrentModificationException',
      c: 'It prints [a, b, c, d]',
      d: 'It throws IndexOutOfBoundsException',
    },
    a: 'b',
    e: 'A for-each loop uses an iterator, which checks on every step that the collection has not been structurally modified behind its back. Removing during iteration trips that check. Use Iterator.remove() or removeIf instead.',
    w: {
      a: 'That is the intended result, but the iterator refuses to continue after the structural change.',
      c: 'The removal does happen — it is the next iteration step that fails.',
      d: 'The iterator detects the modification count mismatch before any index goes out of range.',
    },
    h: 'What does the iterator verify each time you ask it for the next element?',
    v: throws('ConcurrentModificationException'),
  },
  {
    id: '012',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.Map;
import java.util.TreeMap;

class Main {
    public static void main(String[] args) {
        Map<String, Integer> m = new TreeMap<>();
        m.put("c", 3);
        m.put("a", 1);
        m.put("b", 2);
        System.out.println(m);
    }
}`,
    o: {
      a: '{c=3, a=1, b=2}',
      b: '{a=1, b=2, c=3}',
      c: '{a=1, c=3, b=2}',
      d: 'The order is unpredictable',
    },
    a: 'b',
    e: 'A TreeMap keeps its keys sorted by their natural ordering, so iteration and toString come out alphabetically regardless of insertion order.',
    w: {
      a: 'Insertion order is what LinkedHashMap preserves, not TreeMap.',
      c: 'TreeMap sorts fully; it does not partially preserve insertion order.',
      d: 'Unpredictable ordering describes HashMap. TreeMap guarantees sorted order.',
    },
    h: 'Which of the three main Map implementations sorts its keys?',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'easy',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(Integer.parseInt("12a"));
    }
}`,
    o: {
      a: 'It prints 12',
      b: 'It prints 0',
      c: 'It throws NumberFormatException',
      d: 'It fails to compile',
    },
    a: 'c',
    e: 'parseInt requires the whole string to be a valid integer. It does not stop at the first bad character, so "12a" throws NumberFormatException (a subclass of IllegalArgumentException, and therefore unchecked).',
    w: {
      a: 'Java does not parse a valid prefix and ignore the rest.',
      b: 'There is no silent fallback value.',
      d: 'The argument is a String, which is exactly what parseInt takes, so it compiles.',
    },
    h: 'Does parseInt accept a partially numeric string?',
    v: throws('NumberFormatException'),
  },
  {
    id: '014',
    d: 'medium',
    k: 'concept',
    p: 'Which statement about checked and unchecked exceptions is true?',
    o: {
      a: 'RuntimeException and its subclasses are checked',
      b: 'A method must declare `throws` for unchecked exceptions it may raise',
      c: 'Checked exceptions extend Exception but not RuntimeException, and must be caught or declared',
      d: 'Error and Exception are both checked',
    },
    a: 'c',
    e: 'The checked category is Exception minus RuntimeException and its subclasses. Those must be handled or declared. RuntimeException and Error are unchecked, because they signal programming mistakes and unrecoverable conditions respectively.',
    w: {
      a: 'RuntimeException is the root of the unchecked branch.',
      b: 'Declaring unchecked exceptions is optional documentation, never a requirement.',
      d: 'Error is unchecked — things like OutOfMemoryError are not meant to be caught and handled.',
    },
    h: 'Draw the Throwable hierarchy and mark which branch the compiler enforces.',
  },
];

export const l2Exceptions = expand(2, 'l2-exceptions', 'L2-EXC', seeds);
