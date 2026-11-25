import { expand, JAVA_OUT, COMPILE_ERR, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
}

class Dog extends Animal {
}

class Main {
    static void feed(Animal a) {
        System.out.println("animal");
    }

    static void feed(Dog d) {
        System.out.println("dog");
    }

    public static void main(String[] args) {
        Animal a = new Dog();
        feed(a);
    }
}`,
    o: { a: 'dog', b: 'animal', c: 'Compilation error — ambiguous call', d: 'It prints nothing' },
    a: 'b',
    e: 'Overloads are selected at compile time from the declared type of the argument. a is declared Animal, so feed(Animal) is chosen even though the object is really a Dog. Only overriding consults the runtime type.',
    w: {
      a: 'dog would require the choice to be made at runtime, which is what overriding does, not overloading.',
      c: 'feed(Animal) is applicable and feed(Dog) is not (an Animal reference cannot be passed to a Dog parameter), so there is exactly one candidate.',
      d: 'One of the two methods definitely runs.',
    },
    h: 'Overload selection happens before the program runs.',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
    String sound() {
        return "generic";
    }
}

class Dog extends Animal {
    String sound() {
        return "woof";
    }
}

class Main {
    public static void main(String[] args) {
        Animal a = new Dog();
        System.out.println(a.sound());
    }
}`,
    o: { a: 'generic', b: 'woof', c: 'Compilation error', d: 'genericwoof' },
    a: 'b',
    e: 'An overridden instance method is dispatched on the object’s runtime type, which is Dog. The declared type Animal only decides which methods you are allowed to call.',
    w: {
      a: 'generic would be printed only if Dog did not override sound, or if you called super.sound().',
      c: 'The override has the same name, parameters and return type, so it is valid.',
      d: 'Only one implementation runs; the override replaces rather than extends the parent version.',
    },
    h: 'For instance methods, the runtime type wins.',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    static String who() {
        return "A";
    }
}

class B extends A {
    static String who() {
        return "B";
    }
}

class Main {
    public static void main(String[] args) {
        A ref = new B();
        System.out.println(ref.who());
    }
}`,
    o: { a: 'B', b: 'A', c: 'Compilation error', d: 'null' },
    a: 'b',
    e: 'static methods are hidden, not overridden. The call is resolved from the declared type A at compile time, so A.who() runs. (Calling a static method through a reference is legal but misleading, and most compilers warn about it.)',
    w: {
      a: 'B would require dynamic dispatch, which static methods never get.',
      c: 'It compiles — a warning at most, because static access via an instance reference is poor style rather than an error.',
      d: 'Both methods return a literal String.',
    },
    h: 'Can a static method participate in dynamic dispatch?',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Calc {
    int f() {
        return 1;
    }

    double f() {
        return 1.0;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Calc().f());
    }
}`,
    o: {
      a: 'It prints 1',
      b: 'It prints 1.0',
      c: 'It fails to compile — f() is already defined',
      d: 'It compiles; the int version is preferred',
    },
    a: 'c',
    e: 'Return type is not part of a method signature. Both methods are f() with no parameters, so they are duplicates and the compiler reports "method f() is already defined in class Calc".',
    w: {
      a: 'Neither version is callable because the class does not compile.',
      b: 'Same problem — the duplicate declaration is rejected first.',
      d: 'Java has no rule for picking between methods that differ only in return type, because such a pair can never exist.',
    },
    h: 'Which parts of a declaration form the signature the compiler compares?',
    v: COMPILE_ERR,
  },
  {
    id: '005',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
    Animal copy() {
        return new Animal();
    }

    String tag() {
        return "animal";
    }
}

class Dog extends Animal {
    Dog copy() {
        return new Dog();
    }

    String tag() {
        return "dog";
    }
}

class Main {
    public static void main(String[] args) {
        Animal a = new Dog();
        System.out.println(a.copy().tag());
    }
}`,
    o: { a: 'animal', b: 'dog', c: 'Compilation error — return types differ', d: 'null' },
    a: 'b',
    e: 'Java allows a covariant return type: an override may return a subtype of the declared return type. Dog.copy() runs by dynamic dispatch and returns a Dog, whose tag() also overrides, giving "dog".',
    w: {
      a: 'animal would need Animal.copy() to run, but the runtime type is Dog.',
      c: 'Narrowing the return type to a subtype has been legal since Java 5.',
      d: 'copy() always returns a freshly constructed object.',
    },
    h: 'Is an override allowed to return a more specific type?',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class A {
    public void run() {
        System.out.println("A");
    }
}

class B extends A {
    private void run() {
        System.out.println("B");
    }
}

class Main {
    public static void main(String[] args) {
        new B().run();
    }
}`,
    o: {
      a: 'It prints B',
      b: 'It prints A',
      c: 'It fails to compile — the override assigns weaker access privileges',
      d: 'It compiles, and the private method simply hides the public one',
    },
    a: 'c',
    e: 'An override may widen access but never narrow it. Reducing public to private would let an A-typed reference call a method that is not accessible, breaking substitutability, so the compiler rejects it.',
    w: {
      a: 'The class never compiles, so nothing runs.',
      b: 'The declaration itself is the error; resolution never gets a chance to happen.',
      d: 'Hiding applies to fields and static methods. An instance method with a matching signature is an override attempt and must obey the access rule.',
    },
    h: 'Could an A-typed reference still call run() if the override were private?',
    v: COMPILE_ERR,
  },
  {
    id: '007',
    d: 'medium',
    k: 'bug',
    p: 'What happens when this program is compiled?',
    c: `
class Task {
    void start() {
        System.out.println("starting");
    }
}

class Job extends Task {
    @Override
    void strat() {
        System.out.println("job starting");
    }
}

class Main {
    public static void main(String[] args) {
        new Job().start();
    }
}`,
    o: {
      a: 'It prints starting',
      b: 'It prints job starting',
      c: 'It fails to compile — strat does not override anything',
      d: 'It compiles with a warning and prints starting',
    },
    a: 'c',
    e: 'The method name is misspelled, so it overrides nothing. @Override turns that silent mistake into a compile error: "method does not override or implement a method from a supertype". This is exactly why the annotation is worth writing.',
    w: {
      a: 'Without @Override this is what would happen — a silently ignored method. The annotation makes it fail loudly instead.',
      b: 'strat is never called by anything.',
      d: '@Override produces an error, not a warning, when nothing matches.',
    },
    h: 'Compare the two method names character by character.',
    v: COMPILE_ERR,
  },
  {
    id: '008',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void f(long n) {
        System.out.println("long");
    }

    static void f(Integer n) {
        System.out.println("Integer");
    }

    public static void main(String[] args) {
        f(5);
    }
}`,
    o: { a: 'Integer', b: 'long', c: 'Compilation error — ambiguous', d: 'It prints 5' },
    a: 'b',
    e: 'Overload resolution tries phases in order: exact match, then widening primitive conversion, then boxing, then varargs. Widening int to long succeeds in phase two, so boxing to Integer is never considered.',
    w: {
      a: 'Boxing is only reached if no candidate works with widening alone.',
      c: 'The phased algorithm resolves this deterministically, so there is no ambiguity.',
      d: 'Neither method prints its argument.',
    },
    h: 'Widening beats boxing in overload resolution.',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    void set(int n) {
        System.out.println("A-int");
    }
}

class B extends A {
    void set(String s) {
        System.out.println("B-String");
    }
}

class Main {
    public static void main(String[] args) {
        A ref = new B();
        ref.set(1);
    }
}`,
    o: { a: 'B-String', b: 'A-int', c: 'Compilation error', d: 'It prints nothing' },
    a: 'b',
    e: 'B.set(String) has a different parameter type, so it overloads rather than overrides. A.set(int) is still the only method matching an int argument, and it is never overridden, so A’s version runs.',
    w: {
      a: 'set(String) cannot accept an int, so it is not even a candidate.',
      c: 'Adding an overload in a subclass is perfectly legal.',
      d: 'A.set(int) is inherited by B and runs normally.',
    },
    h: 'Do the two set methods have the same signature?',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void f(String s) {
        System.out.println("String");
    }

    static void f(Object o) {
        System.out.println("Object");
    }

    public static void main(String[] args) {
        f(null);
    }
}`,
    o: { a: 'Object', b: 'String', c: 'Compilation error — ambiguous', d: 'NullPointerException' },
    a: 'b',
    e: 'null is assignable to both parameters, so the compiler picks the most specific applicable method. String is a subtype of Object, so f(String) wins.',
    w: {
      a: 'Object is the less specific candidate and is only used when nothing more specific applies.',
      c: 'It would be ambiguous only if the two types were unrelated, e.g. f(String) and f(Integer).',
      d: 'Passing null is harmless here — neither method dereferences its parameter.',
    },
    h: 'When several overloads accept null, the most specific type wins.',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void f(int a) {
        System.out.println("one");
    }

    static void f(int... a) {
        System.out.println("varargs");
    }

    public static void main(String[] args) {
        f(1);
    }
}`,
    o: { a: 'varargs', b: 'one', c: 'Compilation error — ambiguous', d: 'It prints 1' },
    a: 'b',
    e: 'Varargs are considered only in the final phase of overload resolution, after exact and widening matches have failed. f(int) matches exactly, so it wins.',
    w: {
      a: 'The varargs form is the fallback, chosen only when no fixed-arity method applies.',
      c: 'The phase ordering makes this unambiguous.',
      d: 'Neither method prints its argument.',
    },
    h: 'Varargs are the last resort in overload resolution.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class A {
    final void lock() {
        System.out.println("locked");
    }
}

class B extends A {
    void lock() {
        System.out.println("unlocked");
    }
}

class Main {
    public static void main(String[] args) {
        new B().lock();
    }
}`,
    o: {
      a: 'It prints unlocked',
      b: 'It prints locked',
      c: 'It fails to compile — lock() in A is final and cannot be overridden',
      d: 'It fails to compile — B must declare lock() as final too',
    },
    a: 'c',
    e: 'A final method is a promise that its behaviour cannot be replaced, so any attempt to override it is a compile error: "lock() in B cannot override lock() in A; overridden method is final".',
    w: {
      a: 'The override is rejected, so B.lock() never exists.',
      b: 'No program is produced at all.',
      d: 'Repeating final would not help — the problem is that the method is being overridden at all.',
    },
    h: 'What does final mean when applied to a method rather than a field?',
    v: COMPILE_ERR,
  },
  {
    id: '013',
    d: 'hard',
    k: 'bug',
    p: 'What does this program print?',
    c: `
class Id {
    int n;

    Id(int n) {
        this.n = n;
    }

    public boolean equals(Id other) {
        return this.n == other.n;
    }
}

class Main {
    public static void main(String[] args) {
        Object a = new Id(1);
        Object b = new Id(1);
        System.out.println(a.equals(b));
    }
}`,
    o: { a: 'true', b: 'false', c: 'Compilation error', d: 'ClassCastException' },
    a: 'b',
    e: 'equals(Id) overloads rather than overrides Object.equals(Object) — the parameter type differs. Through Object-typed references the compiler binds to Object.equals, which compares identity, so the result is false. Adding @Override would have caught this.',
    w: {
      a: 'The hand-written comparison is never called through an Object reference, so the field values are never compared.',
      c: 'Declaring an extra overload called equals is legal, which is what makes the bug so easy to miss.',
      d: 'Nothing is cast here; the mis-signature simply means the wrong method is selected.',
    },
    h: 'What is the exact parameter type of the equals method Object declares?',
    v: JAVA_OUT,
  },
];

export const l2Override = expand(2, 'l2-override', 'L2-OVR', seeds);
