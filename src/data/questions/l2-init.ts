import { expand, JAVA_OUT, COMPILE_ERR, out, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Demo {
    static {
        System.out.println("static block");
    }

    {
        System.out.println("instance block");
    }

    Demo() {
        System.out.println("constructor");
    }
}

class Main {
    public static void main(String[] args) {
        new Demo();
        new Demo();
    }
}`,
    o: {
      a: 'static block, instance block, constructor, static block, instance block, constructor',
      b: 'static block, instance block, constructor, instance block, constructor',
      c: 'instance block, constructor, instance block, constructor, static block',
      d: 'static block, constructor, instance block, constructor, instance block',
    },
    a: 'b',
    e: 'The static block runs once, when the class is first initialised. The instance block then runs before the constructor body on every instantiation, so the second new repeats only those two.',
    w: {
      a: 'A static block is per-class, not per-instance, so it never runs a second time.',
      c: 'Class initialisation happens before any instance of that class can be created.',
      d: 'The instance initialiser block runs before the constructor body, not after it.',
    },
    h: 'One of these three runs once; the other two run per object.',
    v: out('static block\ninstance block\nconstructor\ninstance block\nconstructor'),
  },
  {
    id: '002',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Order {
    int a = log("a");
    int b = log("b");

    static int log(String s) {
        System.out.print(s);
        return 0;
    }
}

class Main {
    public static void main(String[] args) {
        new Order();
        System.out.println();
    }
}`,
    o: { a: 'ba', b: 'ab', c: 'a', d: 'Nothing is printed' },
    a: 'b',
    e: 'Instance field initialisers execute in the order they appear in the source, top to bottom, so "a" prints before "b".',
    w: {
      a: 'Initialisation is textual order, not reverse order.',
      c: 'Both initialisers run — every field with an initialiser is processed.',
      d: 'Creating the object triggers both initialisers.',
    },
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'hard',
    k: 'bug',
    p: 'What does this program print?',
    c: `
class Base {
    Base() {
        print();
    }

    void print() {
        System.out.println("base");
    }
}

class Child extends Base {
    int value = 5;

    void print() {
        System.out.println("child " + value);
    }
}

class Main {
    public static void main(String[] args) {
        new Child();
    }
}`,
    o: { a: 'child 5', b: 'child 0', c: 'base', d: 'NullPointerException' },
    a: 'b',
    e: 'Base’s constructor runs before Child’s field initialisers. print() is overridden, so Child’s version is dispatched — but value is still at its default 0 at that moment. This is why calling an overridable method from a constructor is a well-known hazard.',
    w: {
      a: 'value = 5 has not executed yet; subclass field initialisers run only after the superclass constructor returns.',
      c: 'Dynamic dispatch applies even during construction, so the override is what runs.',
      d: 'value is an int, which is never null — it is simply 0.',
    },
    h: 'Has Child’s field initialiser run by the time Base’s constructor calls print()?',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Holder {
    static int count = init();

    static int init() {
        System.out.println("init");
        return 1;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println("start");
        System.out.println(Holder.count);
        System.out.println(Holder.count);
    }
}`,
    o: {
      a: 'init, start, 1, 1',
      b: 'start, init, 1, 1',
      c: 'start, init, 1, init, 1',
      d: 'start, 1, 1',
    },
    a: 'b',
    e: 'Class initialisation is lazy — it happens on first active use, which is the first read of Holder.count, after "start" has printed. It also happens exactly once, so the second read does not re-run it.',
    w: {
      a: 'Holder is not initialised until something touches it, so "start" prints first.',
      c: 'Static initialisation runs once per class, never again.',
      d: 'The static initialiser does run, printing "init" once.',
    },
    h: 'When exactly does a class get initialised, and how often?',
    v: out('start\ninit\n1\n1'),
  },
  {
    id: '005',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class X {
    X() {
        System.out.println(n);
    }

    int n = 7;
}

class Main {
    public static void main(String[] args) {
        new X();
    }
}`,
    o: { a: '0', b: '7', c: 'Compilation error', d: 'null' },
    a: 'b',
    e: 'Declaration position in the source does not matter: all instance field initialisers run after the implicit super() call but before the constructor body. So n is already 7 when the constructor prints it.',
    w: {
      a: '0 would be the value only if the field had no initialiser, or if it were read from the superclass constructor.',
      c: 'A constructor may appear before the fields it uses; only initialiser expressions have a forward-reference restriction.',
      d: 'n is an int and cannot hold null.',
    },
    h: 'Field initialisers all complete before the constructor body starts.',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Y {
    int a = b + 1;
    int b = 2;
}

class Main {
    public static void main(String[] args) {
        Y y = new Y();
        System.out.println(y.a + " " + y.b);
    }
}`,
    o: {
      a: 'It prints 3 2',
      b: 'It prints 1 2',
      c: 'It fails to compile — illegal forward reference to b',
      d: 'It prints 0 2',
    },
    a: 'c',
    e: 'An initialiser may not read a field declared later in the class by its simple name. The compiler rejects this as an illegal forward reference rather than silently using the default value.',
    w: {
      a: '3 would require b to already be 2, but b is initialised after a.',
      b: '1 would be 0 + 1, which is what you might expect if Java allowed the read — it does not.',
      d: 'a has an explicit initialiser, so it never keeps the default.',
    },
    h: 'Look at the declaration order of a and b.',
    v: COMPILE_ERR,
  },
  {
    id: '007',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Base {
    Base() {
        System.out.println("Base ctor");
    }
}

class Child extends Base {
    int n = log();

    Child() {
        System.out.println("Child ctor n=" + n);
    }

    static int log() {
        System.out.println("Child field");
        return 9;
    }
}

class Main {
    public static void main(String[] args) {
        new Child();
    }
}`,
    o: {
      a: 'Child field, Base ctor, Child ctor n=9',
      b: 'Base ctor, Child field, Child ctor n=9',
      c: 'Base ctor, Child ctor n=0, Child field',
      d: 'Child field, Child ctor n=9, Base ctor',
    },
    a: 'b',
    e: 'The full order is: superclass construction, then this class’s field initialisers and instance blocks in source order, then this class’s constructor body. So Base finishes first, n is assigned, and only then does the constructor body see n = 9.',
    w: {
      a: 'Subclass field initialisers cannot run before the superclass is constructed.',
      c: 'Field initialisers precede the constructor body, so n is 9 by the time it prints.',
      d: 'The superclass constructor is always first, not last.',
    },
    h: 'Three stages, always in the same order.',
    v: out('Base ctor\nChild field\nChild ctor n=9'),
  },
  {
    id: '008',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int x;

    static {
        x = 1;
        System.out.println("first " + x);
    }

    static {
        x = 2;
        System.out.println("second " + x);
    }

    public static void main(String[] args) {
        System.out.println("main " + x);
    }
}`,
    o: {
      a: 'first 1, second 2, main 2',
      b: 'second 2, first 1, main 1',
      c: 'main 0, first 1, second 2',
      d: 'Compilation error — only one static block is allowed',
    },
    a: 'a',
    e: 'A class may have any number of static blocks; they run in source order as part of class initialisation, which completes before main is invoked. x therefore holds 2 by the time main runs.',
    w: {
      b: 'Static blocks run top to bottom, not in reverse.',
      c: 'Class initialisation finishes before main is called, so x is already 2.',
      d: 'Multiple static initialiser blocks are legal and run in order.',
    },
    v: out('first 1\nsecond 2\nmain 2'),
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class P {
    {
        System.out.print("init ");
    }

    P() {
        System.out.print("noarg ");
    }

    P(int n) {
        System.out.print("arg ");
    }
}

class Main {
    public static void main(String[] args) {
        new P();
        new P(1);
        System.out.println();
    }
}`,
    o: { a: 'init noarg init arg', b: 'init init noarg arg', c: 'noarg arg init', d: 'init noarg arg' },
    a: 'a',
    e: 'The instance initialiser block is effectively prepended to every constructor, so each of the two objects runs "init" before its own constructor body.',
    w: {
      b: 'The blocks are not hoisted together — each object initialises completely before the next is created.',
      c: 'The initialiser block runs before the constructor body, not after both objects exist.',
      d: 'The block runs once per object, so it appears twice for two objects.',
    },
    h: 'How many times does an instance initialiser block run?',
    v: out('init noarg init arg'),
  },
  {
    id: '010',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Q {
    {
        System.out.print("init ");
    }

    Q() {
        this(1);
        System.out.print("noarg ");
    }

    Q(int n) {
        System.out.print("arg ");
    }
}

class Main {
    public static void main(String[] args) {
        new Q();
        System.out.println();
    }
}`,
    o: { a: 'init arg noarg', b: 'init init arg noarg', c: 'arg init noarg', d: 'init noarg arg' },
    a: 'a',
    e: 'Instance initialisers run exactly once per object, in the constructor that calls super() — here Q(int). Q() delegates with this(1), so the block runs inside Q(int), then "arg", then control returns and "noarg" prints.',
    w: {
      b: 'The block runs once per object, not once per constructor in the chain. A delegating constructor skips it.',
      c: 'The initialiser block precedes the body of the constructor that calls super(), so "init" comes before "arg".',
      d: 'Q(int) is invoked by the delegation, so "arg" prints before "noarg".',
    },
    h: 'Which constructor in the chain actually calls super()?',
    v: out('init arg noarg'),
  },
  {
    id: '011',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    static {
        System.out.println("A static");
    }
}

class B extends A {
    static {
        System.out.println("B static");
    }
}

class Main {
    public static void main(String[] args) {
        new B();
    }
}`,
    o: {
      a: 'B static then A static',
      b: 'A static then B static',
      c: 'B static only',
      d: 'A static only',
    },
    a: 'b',
    e: 'Initialising a class first initialises its superclass, so A’s static block runs before B’s. Static initialisation follows the hierarchy downward, exactly like construction.',
    w: {
      a: 'A superclass is always initialised before its subclass.',
      c: 'Initialising B forces A to be initialised too.',
      d: 'B’s own static block runs as part of initialising B.',
    },
    v: out('A static\nB static'),
  },
  {
    id: '012',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class R {
    final int n;

    R() {
        n = 1;
    }

    R(int n) {
        this.n = n;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new R().n + " " + new R(5).n);
    }
}`,
    o: { a: '1 5', b: '0 5', c: 'Compilation error — final field has no initialiser', d: '1 1' },
    a: 'a',
    e: 'A blank final field may be left unassigned at its declaration as long as every constructor assigns it exactly once. Both constructors do, so the two objects hold 1 and 5.',
    w: {
      b: 'The no-arg constructor explicitly assigns 1.',
      c: 'A blank final is legal precisely because each constructor completes the assignment.',
      d: 'The second object was built with R(5), which stores 5.',
    },
    h: 'What is the rule for a final field with no initialiser at its declaration?',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'medium',
    k: 'concept',
    p: 'Why is calling an overridable method from a constructor considered a hazard?',
    o: {
      a: 'It is slower than calling a final method',
      b: 'The subclass override runs before the subclass fields are initialised, so it can observe default values',
      c: 'The compiler rejects it',
      d: 'It causes infinite recursion',
    },
    a: 'b',
    e: 'The superclass constructor runs before any subclass field initialiser, yet dynamic dispatch already selects the subclass override. The override therefore sees fields at their defaults — 0, false or null. Make such methods final or private, or move the work out of the constructor.',
    w: {
      a: 'Dispatch cost is irrelevant next to the correctness problem.',
      c: 'It compiles without complaint, which is exactly what makes it dangerous.',
      d: 'There is no recursion; the override is simply called too early.',
    },
    h: 'Think about what the subclass fields hold at that moment.',
  },
];

export const l2Init = expand(2, 'l2-init', 'L2-INI', seeds);
