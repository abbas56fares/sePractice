import { expand, JAVA_OUT, COMPILE_ERR, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Counter {
    static int shared;
    int own;
}

class Main {
    public static void main(String[] args) {
        Counter a = new Counter();
        Counter b = new Counter();
        Counter.shared = 5;
        a.own = 1;
        b.own = 2;
        System.out.println(b.shared + " " + a.own + " " + b.own);
    }
}`,
    o: { a: '5 1 2', b: '0 1 2', c: '5 1 1', d: '0 0 0' },
    a: 'a',
    e: 'A static field belongs to the class, so there is exactly one copy that every instance sees — b.shared reads the same 5 that was assigned through the class name. Instance fields are per-object, so own differs.',
    w: {
      b: 'b.shared is not a separate variable; it resolves to the single static field.',
      c: 'b.own was assigned 2, independently of a.own.',
      d: 'All three values were explicitly assigned.',
    },
    h: 'How many copies of a static field exist, regardless of instance count?',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Holder {
    int n = 1;

    static int get() {
        return n;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(Holder.get());
    }
}`,
    o: {
      a: 'It prints 1',
      b: 'It prints 0',
      c: 'It fails to compile — a non-static field cannot be referenced from a static context',
      d: 'It throws NullPointerException',
    },
    a: 'c',
    e: 'A static method runs without any instance, so there is no object whose n it could read. The compiler reports "non-static variable n cannot be referenced from a static context".',
    w: {
      a: 'Which object’s n would it be? There is none, so the reference is meaningless.',
      b: 'There is no instance at all, so not even a default value exists.',
      d: 'The problem is detected at compile time; nothing runs.',
    },
    h: 'Which object does a static method belong to?',
    v: COMPILE_ERR,
  },
  {
    id: '003',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        final int[] a = {1, 2, 3};
        a[0] = 9;
        System.out.println(a[0] + " " + a.length);
    }
}`,
    o: {
      a: 'Compilation error — a is final',
      b: '9 3',
      c: '1 3',
      d: 'It throws an exception at runtime',
    },
    a: 'b',
    e: 'final freezes the reference, not the object it points at. The variable can never be reassigned to a different array, but the array’s elements remain writable, so a[0] becomes 9.',
    w: {
      a: 'Only a = somethingElse would be rejected. Writing to an element is not a reassignment of a.',
      c: 'The element assignment succeeds, so a[0] is 9.',
      d: 'Index 0 is valid and final imposes no runtime check.',
    },
    h: 'What exactly does final make immutable: the variable, or the object?',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'easy',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
final class Engine {
}

class TurboEngine extends Engine {
}

class Main {
    public static void main(String[] args) {
        System.out.println(new TurboEngine());
    }
}`,
    o: {
      a: 'It prints a TurboEngine description',
      b: 'It fails to compile — Engine is final and cannot be subclassed',
      c: 'It fails to compile — TurboEngine must also be final',
      d: 'It compiles with a warning',
    },
    a: 'b',
    e: 'final on a class forbids subclassing entirely, which is why String and the wrapper types are final. The compiler reports "cannot inherit from final Engine".',
    w: {
      a: 'TurboEngine never compiles, so no object is created.',
      c: 'Marking the subclass final would not help — extending a final class is the error.',
      d: 'Inheriting from a final class is an error, not a warning.',
    },
    h: 'What does final mean on a class declaration?',
    v: COMPILE_ERR,
  },
  {
    id: '005',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    private void hidden() {
        System.out.println("A");
    }

    void call() {
        hidden();
    }
}

class B extends A {
    private void hidden() {
        System.out.println("B");
    }
}

class Main {
    public static void main(String[] args) {
        new B().call();
    }
}`,
    o: { a: 'B', b: 'A', c: 'Compilation error', d: 'It prints nothing' },
    a: 'b',
    e: 'A private method is not visible to subclasses, so B.hidden() does not override anything — it is an unrelated method that happens to share a name. The call inside A.call() is bound statically to A.hidden().',
    w: {
      a: 'B would require an override, but private methods cannot be overridden.',
      c: 'Declaring a same-named private method in a subclass is legal; the two are simply independent.',
      d: 'A.hidden() runs and prints.',
    },
    h: 'Can a method the subclass cannot even see be overridden?',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class S {
    static int n;
}

class Main {
    public static void main(String[] args) {
        S a = new S();
        S b = new S();
        a.n++;
        b.n++;
        System.out.println(S.n);
    }
}`,
    o: { a: '0', b: '1', c: '2', d: 'Compilation error' },
    a: 'c',
    e: 'a.n and b.n both resolve to the one static field, so the two increments accumulate on the same variable and S.n is 2. (Touching a static field through an instance reference compiles but is poor style.)',
    w: {
      a: 'Both increments did take effect.',
      b: '1 would be the result if each instance had its own copy, which is what a non-static field would give.',
      d: 'It compiles — a warning at most for accessing a static member via an instance.',
    },
    h: 'Do a.n and b.n name the same storage?',
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Util {
    static String hi() {
        return "hi";
    }
}

class Main {
    public static void main(String[] args) {
        Util u = null;
        System.out.println(u.hi());
    }
}`,
    o: { a: 'hi', b: 'NullPointerException', c: 'Compilation error', d: 'null' },
    a: 'a',
    e: 'A static call is resolved from the declared type at compile time and the reference is never dereferenced, so the null is irrelevant. The compiler rewrites this to Util.hi() — surprising, and a good reason never to call statics through instances.',
    w: {
      b: 'No instance is needed, so there is nothing to dereference and nothing to throw.',
      c: 'It compiles, usually with a style warning about static access via an instance.',
      d: 'The method returns the literal "hi".',
    },
    h: 'Does calling a static method require an object to exist?',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    static int twice(final int n) {
        n = n * 2;
        return n;
    }

    public static void main(String[] args) {
        System.out.println(twice(5));
    }
}`,
    o: {
      a: 'It prints 10',
      b: 'It prints 5',
      c: 'It fails to compile — a final parameter cannot be reassigned',
      d: 'It fails to compile — parameters cannot be final',
    },
    a: 'c',
    e: 'A final parameter is assigned once, by the caller, and may not be reassigned in the body. The compiler reports "final parameter n may not be assigned".',
    w: {
      a: 'The reassignment is exactly what final forbids.',
      b: 'Nothing runs, so nothing is printed.',
      d: 'final parameters are perfectly legal — they are a way to document that the body will not rebind them.',
    },
    h: 'final means "assign once". Who performs that assignment for a parameter?',
    v: COMPILE_ERR,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Box {
    final StringBuilder sb = new StringBuilder("a");
}

class Main {
    public static void main(String[] args) {
        Box b = new Box();
        b.sb.append("b");
        System.out.println(b.sb);
    }
}`,
    o: { a: 'a', b: 'ab', c: 'Compilation error — sb is final', d: 'b' },
    a: 'b',
    e: 'final prevents sb from being pointed at a different builder; it says nothing about the builder’s contents. append mutates the object, so "ab" is printed. A final field is not the same as an immutable object.',
    w: {
      a: 'The append genuinely mutates the shared builder.',
      c: 'Calling a method on a final field is always allowed. Only b.sb = ... would be rejected.',
      d: 'The builder started as "a" and "b" was appended to it.',
    },
    h: 'final restricts the reference, not the referent.',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'medium',
    k: 'concept',
    p: 'Which modifier makes a member visible to subclasses in other packages, but not to unrelated classes in other packages?',
    o: { a: 'private', b: 'no modifier (package-private)', c: 'protected', d: 'public' },
    a: 'c',
    e: 'protected grants access to the declaring class, the whole package, and any subclass anywhere — including other packages. That subclass-across-packages reach is what distinguishes it from package-private.',
    w: {
      a: 'private is the narrowest level: the declaring class only.',
      b: 'Package-private stops at the package boundary, so a subclass in another package cannot see it.',
      d: 'public is visible to everything, including unrelated classes.',
    },
    h: 'Order the four levels from narrowest to widest and find the one that crosses packages only for subclasses.',
  },
  {
    id: '011',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Registry {
    static int nextId = 1;
    final int id;

    Registry() {
        this.id = nextId++;
    }
}

class Main {
    public static void main(String[] args) {
        Registry a = new Registry();
        Registry b = new Registry();
        Registry c = new Registry();
        System.out.println(a.id + " " + b.id + " " + c.id + " " + Registry.nextId);
    }
}`,
    o: { a: '1 2 3 4', b: '0 1 2 3', c: '1 1 1 2', d: '1 2 3 3' },
    a: 'a',
    e: 'nextId is shared, so each construction takes the current value and then increments it: 1, 2, 3. After three objects the counter sits at 4.',
    w: {
      b: 'nextId is initialised to 1, not 0, so the first id is 1.',
      c: 'The post-increment advances the shared counter on every construction.',
      d: 'The third object consumed the value 3 and left nextId at 4.',
    },
    h: 'Post-increment hands back the old value and advances the shared field.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Config {
    static final int MAX = 10;
    static int current = 3;

    static String describe() {
        return current + "/" + MAX;
    }
}

class Main {
    public static void main(String[] args) {
        Config.current = 7;
        System.out.println(Config.describe());
    }
}`,
    o: { a: '3/10', b: '7/10', c: '7/7', d: 'Compilation error' },
    a: 'b',
    e: 'MAX is a static final constant and stays 10. current is static but mutable, so the assignment to 7 is visible to describe(), which reads the same shared field.',
    w: {
      a: 'current was reassigned to 7 before describe() ran.',
      c: 'MAX cannot change — it is final.',
      d: 'Only MAX is final; assigning to current is allowed.',
    },
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Outer {
    int value = 5;

    static class Nested {
        int read() {
            return value;
        }
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Outer.Nested().read());
    }
}`,
    o: {
      a: 'It prints 5',
      b: 'It prints 0',
      c: 'It fails to compile — a static nested class has no enclosing instance',
      d: 'It fails to compile — nested classes are not allowed to have methods',
    },
    a: 'c',
    e: 'A static nested class is created without an outer instance, so there is no Outer whose value it could read. Dropping static would make it an inner class, which does hold a reference to its enclosing instance.',
    w: {
      a: 'Reading value would require an enclosing Outer object, and a static nested class has none.',
      b: 'There is no instance at all, so not even a default value applies.',
      d: 'Nested classes are ordinary classes and may declare whatever members they like.',
    },
    h: 'Does a static nested class carry a reference to an enclosing object?',
    v: COMPILE_ERR,
  },
];

export const l2Modifiers = expand(2, 'l2-modifiers', 'L2-MOD', seeds);
