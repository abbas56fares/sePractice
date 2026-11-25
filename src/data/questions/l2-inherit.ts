import { expand, JAVA_OUT, COMPILE_ERR, out, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    A() {
        System.out.println("A");
    }
}

class B extends A {
    B() {
        System.out.println("B");
    }
}

class Main {
    public static void main(String[] args) {
        new B();
    }
}`,
    o: { a: 'B then A', b: 'A then B', c: 'B only', d: 'A only' },
    a: 'b',
    e: 'Every constructor begins with an implicit super() call, so the superclass constructor finishes before the subclass body runs. Construction proceeds from the top of the hierarchy down.',
    w: {
      a: 'That is the reverse order. A subclass can only build on a fully constructed parent, so A runs first.',
      c: 'The inserted super() call means A’s constructor always runs.',
      d: 'B’s own constructor body runs after the super call.',
    },
    h: 'What does the compiler insert at the start of B’s constructor?',
    v: out('A\nB'),
  },
  {
    id: '002',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class A {
    A(int n) {
    }
}

class B extends A {
    B() {
    }
}

class Main {
    public static void main(String[] args) {
        new B();
    }
}`,
    o: {
      a: 'It compiles and runs with no output',
      b: 'It fails to compile — the implicit super() has no matching constructor in A',
      c: 'It fails to compile — B must declare a field',
      d: 'It compiles because A(int) can be called with a default value of 0',
    },
    a: 'b',
    e: 'B’s constructor gets an implicit super() call, but A only declares A(int), so there is no no-argument constructor to call. The fix is an explicit super(someInt).',
    w: {
      a: 'There is no runnable program — the missing super() match is a compile error.',
      c: 'Classes need no fields at all; the problem is constructor chaining.',
      d: 'Java never invents default argument values. The implicit call is always exactly super().',
    },
    h: 'Which superclass constructor does the implicit super() call target?',
    v: COMPILE_ERR,
  },
  {
    id: '003',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    String name = "A";
}

class B extends A {
    String name = "B";
}

class Main {
    public static void main(String[] args) {
        A ref = new B();
        System.out.println(ref.name);
    }
}`,
    o: { a: 'B', b: 'A', c: 'null', d: 'Compilation error' },
    a: 'b',
    e: 'Fields are not polymorphic. B hides A’s name rather than overriding it, and field access is resolved at compile time from the reference type, which is A. So A’s copy is printed.',
    w: {
      a: 'B would be printed only through a B-typed reference, or if name were accessed via an overridden method.',
      c: 'Both field initialisers run — the object holds two distinct name fields, each with a value.',
      d: 'Hiding a superclass field is legal, if confusing. The compiler permits it.',
    },
    h: 'Only methods are dispatched on the runtime type.',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
    String speak() {
        return "...";
    }
}

class Dog extends Animal {
    String speak() {
        return super.speak() + "woof";
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Dog().speak());
    }
}`,
    o: { a: 'woof', b: '...', c: '...woof', d: 'It recurses forever' },
    a: 'c',
    e: 'super.speak() invokes the superclass implementation directly, bypassing dynamic dispatch, so "..." is produced first and "woof" is appended.',
    w: {
      a: 'The override does not replace the parent output here — it prepends it via super.',
      b: 'Dog’s override is what runs, and it adds "woof" to the parent result.',
      d: 'super.speak() is statically bound to A’s version, so it cannot call back into Dog’s override.',
    },
    h: 'What does super. change about method dispatch?',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    A() {
        System.out.print("A");
    }
}

class B extends A {
    B() {
        System.out.print("B");
    }
}

class C extends B {
    C() {
        System.out.print("C");
    }
}

class Main {
    public static void main(String[] args) {
        new C();
        System.out.println();
    }
}`,
    o: { a: 'CBA', b: 'ABC', c: 'C', d: 'AC' },
    a: 'b',
    e: 'Each constructor calls its own super() first, so the chain unwinds to the top and then runs downward: A, then B, then C.',
    w: {
      a: 'CBA is destruction order, not construction order.',
      c: 'Every ancestor constructor runs, not just the one you named in new.',
      d: 'B sits between A and C in the chain and its constructor runs too.',
    },
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Shape {
    String name;

    Shape(String name) {
        this.name = name;
    }
}

class Circle extends Shape {
    int r;

    Circle(int r) {
        super("circle");
        this.r = r;
    }
}

class Main {
    public static void main(String[] args) {
        Circle c = new Circle(2);
        System.out.println(c.name + " " + c.r);
    }
}`,
    o: { a: 'circle 2', b: 'null 2', c: 'circle 0', d: 'Compilation error' },
    a: 'a',
    e: 'The explicit super("circle") passes the name up to Shape’s constructor, which stores it, and then Circle stores its own radius. Both fields are set.',
    w: {
      b: 'super("circle") does reach Shape, so name is assigned.',
      c: 'this.r = r runs after the super call and assigns 2.',
      d: 'An explicit super(...) as the first statement is exactly the required form.',
    },
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Base {
    int twice(int n) {
        return n * 2;
    }
}

class Sub extends Base {
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Sub().twice(21));
    }
}`,
    o: { a: '21', b: '42', c: '0', d: 'Compilation error — Sub has no twice method' },
    a: 'b',
    e: 'Sub inherits every accessible member of Base, so twice is callable on a Sub instance and returns 42.',
    w: {
      a: '21 is the argument, not the doubled result.',
      c: 'The inherited method body runs normally and returns a real value.',
      d: 'Inheritance means the subclass does not need to redeclare the method.',
    },
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Parent {
    private int secret = 1;
    protected int shared = 2;
}

class Child extends Parent {
    int total() {
        return secret + shared;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Child().total());
    }
}`,
    o: {
      a: 'It prints 3',
      b: 'It prints 2',
      c: 'It fails to compile — secret has private access in Parent',
      d: 'It fails to compile — protected members cannot be used in a subclass',
    },
    a: 'c',
    e: 'private members are not inherited into the subclass’s namespace, so Child cannot name secret. protected exists precisely to grant subclass access, so shared would be fine on its own.',
    w: {
      a: '3 is the intended sum, but the private field makes the expression illegal.',
      b: 'The method does not compile at all, so nothing is printed.',
      d: 'protected is exactly the modifier that permits subclass access — that part of the code is valid.',
    },
    h: 'Which of the two modifiers is designed for subclasses?',
    v: COMPILE_ERR,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    int x = 1;
}

class B extends A {
    int x = 2;

    int both() {
        return x + super.x;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new B().both());
    }
}`,
    o: { a: '2', b: '3', c: '4', d: '1' },
    a: 'b',
    e: 'A B object carries both fields. The unqualified x refers to B’s (2) and super.x reaches the hidden A field (1), so the sum is 3.',
    w: {
      a: '2 is only B’s field; super.x adds A’s as well.',
      c: '4 would mean both names resolved to B’s field, but super.x specifically selects A’s.',
      d: '1 is only A’s hidden field.',
    },
    h: 'How many x fields does a single B object actually contain?',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    A() {
        System.out.print("A0");
    }

    A(int n) {
        System.out.print("A1");
    }
}

class B extends A {
    B() {
        this(5);
        System.out.print("B0");
    }

    B(int n) {
        super(n);
        System.out.print("B1");
    }
}

class Main {
    public static void main(String[] args) {
        new B();
        System.out.println();
    }
}`,
    o: { a: 'A0B1B0', b: 'A1B1B0', c: 'A1B0B1', d: 'A0A1B1B0' },
    a: 'b',
    e: 'B() delegates with this(5) to B(int), which calls super(5) and so runs A(int) printing A1. B(int) then prints B1, control returns to B(), which prints B0.',
    w: {
      a: 'A0 is the no-arg A constructor, which is never reached — super(n) selects A(int).',
      c: 'B0 belongs to the outer constructor and therefore prints last.',
      d: 'Exactly one superclass constructor runs per object, not both.',
    },
    h: 'this(...) delegates before anything else; only one A constructor ends up running.',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
    void describe() {
        System.out.println("I am a " + name());
    }

    String name() {
        return "animal";
    }
}

class Cat extends Animal {
    String name() {
        return "cat";
    }
}

class Main {
    public static void main(String[] args) {
        new Cat().describe();
    }
}`,
    o: { a: 'I am a animal', b: 'I am a cat', c: 'Compilation error', d: 'I am a null' },
    a: 'b',
    e: 'describe is inherited but the call to name() is still dispatched on the runtime type, which is Cat. Overriding therefore changes the behaviour of inherited methods — the basis of the template-method pattern.',
    w: {
      a: 'Animal’s name() is overridden, so it is not the version that runs.',
      c: 'Overriding a method with the same signature and return type is valid.',
      d: 'Both methods return real Strings; nothing is null.',
    },
    h: 'Which name() does the inherited describe() see?',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Point {
    int x = 3;

    public String toString() {
        return "P(" + x + ")";
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Point());
    }
}`,
    o: {
      a: 'Point@1b6d3586 (a type-and-hash string)',
      b: 'P(3)',
      c: '3',
      d: 'Compilation error',
    },
    a: 'b',
    e: 'println(Object) calls toString() on its argument. Point overrides the inherited Object.toString, so the custom text is printed.',
    w: {
      a: 'That is the default Object.toString output, which the override replaces.',
      c: 'println receives the object, not the field, so it goes through toString.',
      d: 'Overriding toString with the public modifier and a String return type is correct.',
    },
    h: 'What does println do with an arbitrary object?',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'medium',
    k: 'concept',
    p: 'Which statement about inheritance in Java is true?',
    o: {
      a: 'A class can extend several classes at once',
      b: 'A class with no extends clause implicitly extends Object',
      c: 'Constructors are inherited by subclasses',
      d: 'A subclass can reduce the visibility of a method it overrides',
    },
    a: 'b',
    e: 'Every class without an explicit superclass extends Object, which is why toString, equals and hashCode are available on every object.',
    w: {
      a: 'Java allows only single class inheritance. Multiple inheritance of *type* comes from interfaces.',
      c: 'Constructors are not members and are not inherited — that is why a subclass must chain with super(...).',
      d: 'An override may widen visibility but never narrow it, or it would break substitutability.',
    },
    h: 'Where do toString and equals come from on a class you just wrote?',
  },
];

export const l2Inherit = expand(2, 'l2-inherit', 'L2-INH', seeds);
