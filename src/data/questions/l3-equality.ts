import { expand, JAVA_OUT, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        Integer a = 127;
        Integer b = 127;
        Integer c = 128;
        Integer d = 128;
        System.out.println((a == b) + " " + (c == d));
    }
}`,
    o: { a: 'true true', b: 'true false', c: 'false false', d: 'false true' },
    a: 'b',
    e: 'Autoboxing uses a cache for values from -128 to 127, so both 127 boxes are the same object and == is true. 128 falls outside the cache, producing two distinct Integers, so == is false. Always compare wrappers with equals.',
    w: {
      a: '128 is outside the cached range, so two separate objects are created.',
      c: '127 is inside the cache, so those two references are identical.',
      d: 'The results are the other way round: the small value is cached, the large one is not.',
    },
    h: 'There is a cached range for boxed integers. Where does it end?',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'hard',
    k: 'bug',
    p: 'What does this program print?',
    c: `
import java.util.HashSet;
import java.util.Set;

class P {
    int x;

    P(int x) {
        this.x = x;
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof P && ((P) o).x == this.x;
    }
}

class Main {
    public static void main(String[] args) {
        Set<P> s = new HashSet<>();
        s.add(new P(1));
        s.add(new P(1));
        System.out.println(s.size());
    }
}`,
    o: { a: '1', b: '2', c: '0', d: 'It throws an exception' },
    a: 'b',
    e: 'equals was overridden but hashCode was not, so the two equal objects inherit Object’s identity-based hash codes and land in different buckets. HashSet never compares them, and both are stored. Overriding equals without hashCode is the classic contract violation.',
    w: {
      a: '1 is what you get once hashCode is overridden consistently with equals.',
      c: 'Both add calls succeed, so the set is not empty.',
      d: 'Nothing throws; the collection simply behaves incorrectly, which is worse.',
    },
    h: 'Which method does HashSet use to decide where to look first?',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.HashSet;
import java.util.Set;

class P {
    int x;

    P(int x) {
        this.x = x;
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof P && ((P) o).x == this.x;
    }

    @Override
    public int hashCode() {
        return x;
    }
}

class Main {
    public static void main(String[] args) {
        Set<P> s = new HashSet<>();
        s.add(new P(1));
        s.add(new P(1));
        System.out.println(s.size());
    }
}`,
    o: { a: '2', b: '1', c: '0', d: 'It throws an exception' },
    a: 'b',
    e: 'With equals and hashCode consistent, both objects hash to the same bucket and compare equal, so the second add is rejected as a duplicate and the size is 1.',
    w: {
      a: '2 is the result when hashCode is left unoverridden.',
      c: 'The first add always succeeds.',
      d: 'This is the correct, well-behaved case.',
    },
    h: 'Equal objects must produce equal hash codes.',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String a = "hello";
        String b = "hel" + "lo";
        String c = new String("hello");
        System.out.println((a == b) + " " + (a == c) + " " + (a == c.intern()));
    }
}`,
    o: {
      a: 'true false true',
      b: 'true true true',
      c: 'false false true',
      d: 'true false false',
    },
    a: 'a',
    e: '"hel" + "lo" is a compile-time constant expression, so the compiler folds it into the literal "hello" and interns it — a == b is true. new String forces a fresh object, so a == c is false. intern() returns the pooled instance, so a == c.intern() is true.',
    w: {
      b: 'new String(...) exists precisely to create an object outside the pool.',
      c: 'Constant folding happens at compile time, so b is the same pooled literal as a.',
      d: 'intern() is defined to return the canonical pooled String, which is the same object as a.',
    },
    h: 'One of these three is folded by the compiler before the pool is even consulted.',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String a = "hello";
        String part = "hel";
        String b = part + "lo";
        System.out.println((a == b) + " " + a.equals(b));
    }
}`,
    o: { a: 'true true', b: 'false true', c: 'false false', d: 'true false' },
    a: 'b',
    e: 'part is a variable, not a constant, so the concatenation happens at runtime and builds a brand-new String outside the pool. == is false, but the characters match so equals is true. This is why String comparison always uses equals.',
    w: {
      a: 'Runtime concatenation produces a new object; only compile-time constant expressions are folded and interned.',
      c: 'The contents are identical, so equals is true.',
      d: 'The references differ, so == is false.',
    },
    h: 'Is the concatenation a compile-time constant here?',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'hard',
    k: 'bug',
    p: 'What does this program print?',
    c: `
import java.util.HashMap;
import java.util.Map;

class Key {
    int n;

    Key(int n) {
        this.n = n;
    }

    @Override
    public boolean equals(Object o) {
        return o instanceof Key && ((Key) o).n == this.n;
    }

    @Override
    public int hashCode() {
        return n;
    }
}

class Main {
    public static void main(String[] args) {
        Map<Key, String> m = new HashMap<>();
        Key k = new Key(1);
        m.put(k, "one");
        k.n = 2;
        System.out.println(m.get(k) + " " + m.get(new Key(1)) + " " + m.size());
    }
}`,
    o: { a: 'one one 1', b: 'null null 1', c: 'one null 1', d: 'null one 1' },
    a: 'b',
    e: 'The entry was filed under hash 1. Mutating the key changes its hash to 2, so m.get(k) looks in the wrong bucket and finds nothing. A fresh Key(1) finds the right bucket but then fails equals against the stored key, which now holds 2. The entry is stranded — still counted, but unreachable.',
    w: {
      a: 'Neither lookup can succeed once the stored key’s hash no longer matches where it lives.',
      c: 'm.get(k) uses the key’s current hash of 2 and searches the wrong bucket.',
      d: 'The new Key(1) reaches the right bucket but the stored key no longer equals it.',
    },
    h: 'What does the map use to locate an entry, and when was that value computed?',
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        double d = 0.0 / 0.0;
        System.out.println((d == d) + " " + Double.valueOf(d).equals(Double.valueOf(d)));
    }
}`,
    o: { a: 'true true', b: 'false true', c: 'false false', d: 'true false' },
    a: 'b',
    e: 'd is NaN, and IEEE 754 defines NaN as not equal to anything, including itself — so == is false. Double.equals compares the raw bit patterns via doubleToLongBits, which treats NaN as equal to NaN, so equals is true.',
    w: {
      a: 'NaN == NaN is false by definition; it is the standard test for NaN.',
      c: 'Double.equals deliberately differs from == so that NaN works as a collection key.',
      d: 'The two results are the other way round.',
    },
    h: 'NaN breaks reflexivity for ==, but collections need reflexivity to work.',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println((0.0 == -0.0) + " " + Double.valueOf(0.0).equals(Double.valueOf(-0.0)));
    }
}`,
    o: { a: 'true true', b: 'true false', c: 'false true', d: 'false false' },
    a: 'b',
    e: 'IEEE 754 says positive and negative zero compare equal with ==. Double.equals compares bit patterns instead, and the two zeros differ in their sign bit, so equals is false — the mirror image of the NaN case.',
    w: {
      a: 'The bit patterns differ, so equals returns false.',
      c: 'Numerically the two zeros are equal, so == is true.',
      d: '== follows IEEE numeric comparison, which makes the zeros equal.',
    },
    h: 'Same two methods as the NaN question, opposite answers.',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.Objects;

class Main {
    public static void main(String[] args) {
        String s = "a";
        String n = null;
        System.out.println(s.equals(null) + " " + Objects.equals(n, null) + " " + Objects.equals(n, s));
    }
}`,
    o: { a: 'false true false', b: 'true true false', c: 'NullPointerException', d: 'false false false' },
    a: 'a',
    e: 'A correct equals returns false for null rather than throwing, so s.equals(null) is false. Objects.equals handles nulls on both sides: two nulls are equal, and null against a non-null is not.',
    w: {
      b: 'The equals contract requires that nothing equals null.',
      c: 'Calling equals(null) is safe. It would only throw if the receiver itself were null.',
      d: 'Objects.equals(null, null) is defined to be true.',
    },
    h: 'Objects.equals is the null-safe wrapper; what does it do when both sides are null?',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        Integer i = 1;
        Long l = 1L;
        System.out.println(i.equals(l) + " " + (i.intValue() == l.longValue()));
    }
}`,
    o: { a: 'true true', b: 'false true', c: 'false false', d: 'true false' },
    a: 'b',
    e: 'Integer.equals first checks that the argument is an Integer. A Long is not, so it returns false regardless of the numeric value. Unwrapping to primitives compares the numbers themselves, which are equal.',
    w: {
      a: 'Wrapper equals is type-sensitive; a Long never equals an Integer.',
      c: '1 and 1L are numerically equal, so the primitive comparison is true.',
      d: 'The two results are the other way round.',
    },
    h: 'What is the first thing a wrapper’s equals checks?',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        StringBuilder a = new StringBuilder("x");
        StringBuilder b = new StringBuilder("x");
        System.out.println(a.equals(b) + " " + a.toString().equals(b.toString()));
    }
}`,
    o: { a: 'true true', b: 'false true', c: 'false false', d: 'true false' },
    a: 'b',
    e: 'StringBuilder does not override equals, so it inherits identity comparison and two separate builders are never equal. Converting to String first gives you String.equals, which compares characters.',
    w: {
      a: 'Having identical contents is not enough — StringBuilder never overrode equals.',
      c: 'The two Strings do have the same characters, so the second comparison is true.',
      d: 'The two results are the other way round.',
    },
    h: 'Does StringBuilder override equals?',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'hard',
    k: 'concept',
    p: 'Your `equals` uses `o instanceof Point`. A subclass `Point3D` extends `Point` and adds a z coordinate without overriding equals. What breaks?',
    o: {
      a: 'Nothing — instanceof is the recommended approach in every case',
      b: 'Symmetry can break: a Point may equal a Point3D while the reverse comparison disagrees once Point3D overrides equals',
      c: 'The code no longer compiles',
      d: 'hashCode starts returning negative values',
    },
    a: 'b',
    e: 'With instanceof, a Point happily equals a Point3D that shares x and y. As soon as Point3D overrides equals to also compare z, p3d.equals(p) is false while p.equals(p3d) is true — asymmetric, and collections then behave inconsistently. Using getClass() comparison, or favouring composition over inheritance, avoids it.',
    w: {
      a: 'instanceof is fine for a final class or when no subclass adds state to the comparison, but not in general.',
      c: 'This is a contract problem, not a compilation problem.',
      d: 'hashCode may legitimately be negative; it is unrelated to this issue.',
    },
    h: 'Compare p.equals(p3d) with p3d.equals(p).',
  },
  {
    id: '013',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.ArrayList;
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<Integer> l = new ArrayList<>();
        l.add(1000);
        System.out.println(l.contains(1000) + " " + (l.get(0) == 1000) + " " + l.get(0).equals(1000));
    }
}`,
    o: { a: 'true false true', b: 'false true true', c: 'true true true', d: 'true false false' },
    a: 'c',
    e: 'contains uses equals, so it finds the value. In l.get(0) == 1000 the right operand is an int, so the Integer is unboxed and a numeric comparison is performed — true even though 1000 is outside the Integer cache. equals compares values too.',
    w: {
      a: 'Comparing an Integer with an int literal triggers unboxing, so == compares numbers, not references. Two Integer variables would have been a different story.',
      b: 'contains(1000) boxes the argument and compares with equals, which succeeds.',
      d: 'Integer.equals(Integer) compares the wrapped values, which match.',
    },
    h: 'What happens to the boxed value when one side of == is a primitive?',
    v: JAVA_OUT,
  },
];

export const l3Equality = expand(3, 'l3-equality', 'L3-EQU', seeds);
