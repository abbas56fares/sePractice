import { expand, JAVA_OUT, COMPILE_ERR, throws, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
import java.util.ArrayList;
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<Object> items = new ArrayList<String>();
        items.add(42);
        System.out.println(items);
    }
}`,
    o: {
      a: 'It prints [42]',
      b: 'It fails to compile — List<String> is not a List<Object>',
      c: 'It throws ClassCastException',
      d: 'It compiles because String is a subtype of Object',
    },
    a: 'b',
    e: 'Generics are invariant: even though String is a subtype of Object, List<String> is not a subtype of List<Object>. If it were, this code would let you store an Integer in a list of Strings — exactly what the rule prevents.',
    w: {
      a: 'The assignment is rejected, so nothing runs.',
      c: 'The error is caught statically, which is the whole point of generics.',
      d: 'Subtyping of the element type does not propagate to the generic type. Use List<? extends Object> for a read-only view.',
    },
    h: 'If this were allowed, what could you then put in the list?',
    v: COMPILE_ERR,
  },
  {
    id: '002',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
import java.util.List;

class Main {
    static void addOne(List<? extends Number> list) {
        list.add(1);
    }

    public static void main(String[] args) {
        System.out.println("done");
    }
}`,
    o: {
      a: 'It prints done',
      b: 'It fails to compile — nothing can be added through a `? extends` wildcard',
      c: 'It throws UnsupportedOperationException',
      d: 'It compiles because 1 is a Number',
    },
    a: 'b',
    e: 'List<? extends Number> could be a List<Double> or a List<Long>, so the compiler cannot prove an Integer is acceptable. An upper-bounded wildcard is a producer: you can read Numbers out but not write anything in (except null).',
    w: {
      a: 'The method body does not compile, so there is no program.',
      c: 'This is a compile-time restriction, not a runtime one.',
      d: '1 is an Integer, but the list’s actual element type is unknown — it might be List<Double>.',
    },
    h: 'Remember PECS: producer extends, consumer super.',
    v: COMPILE_ERR,
  },
  {
    id: '003',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.ArrayList;

class Main {
    public static void main(String[] args) {
        System.out.println(new ArrayList<String>().getClass() == new ArrayList<Integer>().getClass());
    }
}`,
    o: { a: 'false', b: 'true', c: 'Compilation error', d: 'It prints the class name' },
    a: 'b',
    e: 'Type arguments are erased at compile time, so both expressions produce the same runtime class, java.util.ArrayList. There is exactly one Class object for it, so == is true.',
    w: {
      a: 'false would require the type argument to survive into the runtime type, which erasure removes.',
      c: 'Comparing two Class references with == is valid.',
      d: 'The expression is a boolean comparison, so println prints true or false.',
    },
    h: 'Does the JVM know the type argument at runtime?',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
import java.util.List;

class Main {
    static void f(List<String> l) {
        System.out.println("String");
    }

    static void f(List<Integer> l) {
        System.out.println("Integer");
    }

    public static void main(String[] args) {
        System.out.println("done");
    }
}`,
    o: {
      a: 'It prints done',
      b: 'It fails to compile — both methods have the same erasure',
      c: 'It prints String',
      d: 'It compiles because the type arguments differ',
    },
    a: 'b',
    e: 'After erasure both methods become f(List), which is a duplicate declaration. The compiler reports "name clash: both methods have the same erasure". Distinguish them by name or by a non-generic parameter.',
    w: {
      a: 'The duplicate declaration is rejected before main matters.',
      c: 'Neither method is callable, because the class does not compile.',
      d: 'Type arguments are not part of the erased signature the JVM sees, so they cannot distinguish overloads.',
    },
    h: 'What do both signatures look like after the type arguments are removed?',
    v: COMPILE_ERR,
  },
  {
    id: '005',
    d: 'hard',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
class Main {
    public static void main(String[] args) {
        Object[] objs = new String[2];
        objs[0] = 42;
        System.out.println(objs[0]);
    }
}`,
    o: {
      a: 'It prints 42',
      b: 'It fails to compile',
      c: 'It throws ArrayStoreException',
      d: 'It throws ClassCastException',
    },
    a: 'c',
    e: 'Arrays are covariant, so String[] can be assigned to Object[] and the compiler sees nothing wrong with storing an Integer. The array itself remembers its real element type and rejects the write at runtime with ArrayStoreException. Generics avoid this class of bug by being invariant instead.',
    w: {
      a: 'The store never succeeds — the runtime type check fails first.',
      b: 'Storing an Object into an Object[] is statically fine; array covariance is what makes it compile.',
      d: 'ClassCastException comes from a bad cast. This is a bad array store, which has its own exception type.',
    },
    h: 'Compare how arrays and generics handle subtyping.',
    v: throws('ArrayStoreException'),
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.LinkedHashMap;
import java.util.Map;

class Main {
    public static void main(String[] args) {
        Map<String, Integer> m = new LinkedHashMap<>();
        m.put("b", 2);
        m.put("a", 1);
        m.put("c", 3);
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, Integer> e : m.entrySet()) {
            sb.append(e.getKey()).append(e.getValue());
        }
        System.out.println(sb);
    }
}`,
    o: { a: 'a1b2c3', b: 'b2a1c3', c: 'c3a1b2', d: 'The order is unpredictable' },
    a: 'b',
    e: 'LinkedHashMap preserves insertion order, so iteration follows the order the keys were put: b, a, c.',
    w: {
      a: 'Sorted key order is what TreeMap gives.',
      c: 'Nothing reverses the order.',
      d: 'Unspecified iteration order describes HashMap; LinkedHashMap deliberately fixes it.',
    },
    h: 'Three Map implementations, three different iteration guarantees.',
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Pair<A, B> {
    A first;
    B second;

    Pair(A first, B second) {
        this.first = first;
        this.second = second;
    }

    String show() {
        return first + ":" + second;
    }
}

class Main {
    public static void main(String[] args) {
        Pair<String, Integer> p = new Pair<>("x", 7);
        System.out.println(p.show());
    }
}`,
    o: { a: 'x:7', b: 'null:null', c: 'Compilation error', d: 'x:null' },
    a: 'a',
    e: 'The diamond operator infers Pair<String, Integer> from the declared type, and the constructor stores both arguments. String concatenation then renders them as "x:7".',
    w: {
      b: 'Both fields are assigned in the constructor.',
      c: 'A generic class with two type parameters and a diamond-inferred constructor call is ordinary Java.',
      d: 'second holds the boxed Integer 7, not null.',
    },
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'hard',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<Integer> l = List.of(1, 2, 3);
        System.out.println(l.size());
        l.add(4);
    }
}`,
    o: {
      a: 'It prints 3 then 4',
      b: 'It prints 3 then throws UnsupportedOperationException',
      c: 'It fails to compile',
      d: 'It prints 3 then throws IllegalStateException',
    },
    a: 'b',
    e: 'List.of returns a genuinely immutable list. Every mutator is present on the interface but throws UnsupportedOperationException, so the size prints and then add fails.',
    w: {
      a: 'The list cannot grow, so the add never succeeds.',
      c: 'add is declared on List, so the call compiles; immutability is enforced at runtime.',
      d: 'The conventional exception for an unsupported mutation is UnsupportedOperationException.',
    },
    h: 'Immutability here is enforced when the method runs, not when it is compiled.',
    v: throws('UnsupportedOperationException'),
  },
  {
    id: '009',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.Arrays;
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<String> l = Arrays.asList("a", "b");
        l.set(0, "z");
        System.out.println(l);
    }
}`,
    o: {
      a: 'It throws UnsupportedOperationException',
      b: '[z, b]',
      c: '[a, b]',
      d: 'It fails to compile',
    },
    a: 'b',
    e: 'Arrays.asList returns a fixed-size view backed by the array. It cannot grow or shrink, so add and remove throw — but set writes straight through to the backing array and is allowed.',
    w: {
      a: 'Only the size-changing operations throw. set keeps the size the same.',
      c: 'The set call does take effect on the view and its backing array.',
      d: 'set is a normal List method and the types line up.',
    },
    h: 'Which operations would change the list’s size?',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static <T extends Comparable<T>> T max(T a, T b) {
        return a.compareTo(b) >= 0 ? a : b;
    }

    public static void main(String[] args) {
        System.out.println(max("apple", "banana") + " " + max(3, 7));
    }
}`,
    o: { a: 'apple 3', b: 'banana 7', c: 'apple 7', d: 'Compilation error' },
    a: 'b',
    e: 'The bound T extends Comparable<T> guarantees compareTo exists. "apple".compareTo("banana") is negative, so banana wins; 3.compareTo(7) is negative, so 7 wins. The ints are autoboxed to Integer, which is Comparable.',
    w: {
      a: 'The method returns the larger argument, and apple sorts before banana.',
      c: 'The String comparison picks banana, not apple.',
      d: 'Both String and Integer satisfy the Comparable bound, so both calls infer successfully.',
    },
    h: 'compareTo returns a negative number when the receiver sorts first.',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.ArrayList;
import java.util.List;

class Main {
    public static void main(String[] args) {
        List<?> l = new ArrayList<String>();
        l.add(null);
        System.out.println(l.size());
    }
}`,
    o: { a: '0', b: '1', c: 'Compilation error', d: 'NullPointerException' },
    a: 'b',
    e: 'With an unbounded wildcard the element type is unknown, so the only value the compiler can prove is acceptable is null. That single legal add succeeds and the size becomes 1.',
    w: {
      a: 'The add does take effect — null is a valid element.',
      c: 'add(null) is the one mutation a List<?> permits; l.add("x") would be the compile error.',
      d: 'ArrayList stores null elements happily; size() does not dereference them.',
    },
    h: 'What is the one value assignable to every reference type?',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'medium',
    k: 'concept',
    p: 'You need a collection that keeps items unique and lets you check membership in constant time, with no ordering requirement. Which fits best?',
    o: {
      a: 'ArrayList', b: 'HashSet', c: 'TreeSet', d: 'LinkedList' },
    a: 'b',
    e: 'HashSet enforces uniqueness and gives average O(1) add, remove and contains. Ordering is not guaranteed, which the requirement explicitly allows.',
    w: {
      a: 'ArrayList allows duplicates, and contains is O(n) because it scans.',
      c: 'TreeSet is unique but sorted, costing O(log n) per operation for an ordering you do not need.',
      d: 'LinkedList allows duplicates and has O(n) search, plus O(n) indexed access.',
    },
    h: 'Match each guarantee in the requirement to a property of the implementation.',
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
    static void addAll(List<? super Integer> sink) {
        sink.add(1);
        sink.add(2);
    }

    public static void main(String[] args) {
        List<Number> nums = new ArrayList<>();
        addAll(nums);
        System.out.println(nums);
    }
}`,
    o: { a: '[1, 2]', b: '[]', c: 'Compilation error', d: 'It throws UnsupportedOperationException' },
    a: 'a',
    e: 'A lower-bounded wildcard (? super Integer) is a consumer: whatever the list’s real element type is, it is Integer or a supertype, so adding Integers is always safe. List<Number> satisfies the bound and receives both values.',
    w: {
      b: 'Both add calls succeed, so the list is not empty.',
      c: 'This is exactly the case `? super` exists for — the consumer half of PECS.',
      d: 'A plain ArrayList is mutable.',
    },
    h: 'PECS: which half of it permits writing?',
    v: JAVA_OUT,
  },
];

export const l3Generics = expand(3, 'l3-generics', 'L3-GEN', seeds);
