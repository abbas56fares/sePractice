import { expand, JAVA_OUT, COMPILE_ERR, out, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'easy',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
abstract class Shape {
    abstract double area();
}

class Main {
    public static void main(String[] args) {
        Shape s = new Shape();
        System.out.println(s.area());
    }
}`,
    o: {
      a: 'It prints 0.0',
      b: 'It fails to compile — Shape is abstract and cannot be instantiated',
      c: 'It throws an exception at runtime',
      d: 'It prints null',
    },
    a: 'b',
    e: 'An abstract class has at least one unimplemented operation, so there is no complete object to create. The compiler reports "Shape is abstract; cannot be instantiated".',
    w: {
      a: 'area() has no body at all, so there is nothing that could return 0.0.',
      c: 'The restriction is enforced at compile time, not when the program runs.',
      d: 'A reference could be null, but new Shape() is rejected outright.',
    },
    h: 'What would area() do if the object existed?',
    v: COMPILE_ERR,
  },
  {
    id: '002',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
abstract class Shape {
    abstract double area();
}

class Circle extends Shape {
    double r = 2;
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Circle().area());
    }
}`,
    o: {
      a: 'It prints 0.0',
      b: 'It prints 12.566370614359172',
      c: 'It fails to compile — Circle does not implement area()',
      d: 'It compiles because Circle inherits an empty area()',
    },
    a: 'c',
    e: 'A concrete subclass must implement every inherited abstract method. Circle does not, so the compiler reports that Circle is not abstract and does not override area(). Either implement it or mark Circle abstract too.',
    w: {
      a: 'There is no implementation to produce a value.',
      b: 'Nothing in the code computes an area — there is no area() body anywhere.',
      d: 'An abstract method has no body to inherit; the obligation to write one passes to the subclass.',
    },
    h: 'What obligation does extending an abstract class create?',
    v: COMPILE_ERR,
  },
  {
    id: '003',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
interface Greeter {
    default String greet() {
        return "hello";
    }
}

class English implements Greeter {
}

class Main {
    public static void main(String[] args) {
        System.out.println(new English().greet());
    }
}`,
    o: { a: 'Compilation error', b: 'hello', c: 'null', d: 'English' },
    a: 'b',
    e: 'A default method carries an implementation in the interface itself, so an implementing class inherits working behaviour and need not override anything.',
    w: {
      a: 'Default methods exist precisely so that an interface can gain a method without breaking every implementor.',
      c: 'The default body returns a literal String.',
      d: 'greet() returns "hello"; nothing prints the class name.',
    },
    h: 'What does the default keyword add to an interface method?',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
interface Config {
    int MAX = 10;
}

class Main {
    public static void main(String[] args) {
        System.out.println(Config.MAX);
    }
}`,
    o: { a: '0', b: '10', c: 'Compilation error — interfaces cannot hold fields', d: 'null' },
    a: 'b',
    e: 'Any field declared in an interface is implicitly public, static and final — a constant. It is read through the interface name, so Config.MAX is 10.',
    w: {
      a: 'The initialiser is mandatory for an interface field (it is final), so it is never left at a default.',
      c: 'Interfaces may declare constants; what they cannot hold is mutable instance state.',
      d: 'MAX is an int and has an explicit value.',
    },
    h: 'What modifiers does Java add to an interface field automatically?',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
interface A {
    default String id() {
        return "A";
    }
}

interface B {
    default String id() {
        return "B";
    }
}

class C implements A, B {
}

class Main {
    public static void main(String[] args) {
        System.out.println(new C().id());
    }
}`,
    o: {
      a: 'It prints A',
      b: 'It prints B',
      c: 'It fails to compile — C inherits unrelated defaults for id()',
      d: 'It fails to compile — a class cannot implement two interfaces',
    },
    a: 'c',
    e: 'Two unrelated default implementations of the same signature create a genuine ambiguity the compiler will not guess at. C must override id(), optionally delegating with A.super.id() or B.super.id().',
    w: {
      a: 'There is no "first interface wins" rule; the order of the implements clause is irrelevant.',
      b: 'Same reason — neither default is preferred over the other.',
      d: 'Implementing many interfaces is normal and encouraged. Only the clashing defaults are a problem.',
    },
    h: 'Which implementation should the compiler pick, and on what basis?',
    v: COMPILE_ERR,
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
abstract class Base {
    Base() {
        System.out.println("base");
    }

    abstract void run();
}

class Impl extends Base {
    void run() {
        System.out.println("run");
    }
}

class Main {
    public static void main(String[] args) {
        new Impl().run();
    }
}`,
    o: { a: 'run only', b: 'base then run', c: 'run then base', d: 'Compilation error' },
    a: 'b',
    e: 'An abstract class can have a constructor; it just cannot be instantiated directly. Creating an Impl chains through Base’s constructor first, printing "base", and then run() prints "run".',
    w: {
      a: 'The superclass constructor always runs as part of creating the subclass instance.',
      c: 'Construction completes before any method can be called on the new object.',
      d: 'Constructors in abstract classes are both legal and common — they initialise shared state.',
    },
    h: 'Abstract classes cannot be instantiated, but they are still constructed.',
    v: out('base\nrun'),
  },
  {
    id: '007',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
interface Runner {
    void run();
}

class Impl implements Runner {
    void run() {
        System.out.println("running");
    }
}

class Main {
    public static void main(String[] args) {
        new Impl().run();
    }
}`,
    o: {
      a: 'It prints running',
      b: 'It fails to compile — the implementation must be public',
      c: 'It fails to compile — Impl must also declare the method abstract',
      d: 'It compiles with a warning',
    },
    a: 'b',
    e: 'Interface methods are implicitly public, and an implementation may not reduce visibility. Declaring run() package-private is "attempting to assign weaker access privileges; was public".',
    w: {
      a: 'Adding public to the method would make this work, but as written it does not compile.',
      c: 'abstract would stop Impl being concrete, which is the opposite of what is wanted.',
      d: 'Narrowing access on an override is an error, never a warning.',
    },
    h: 'What visibility does an interface method have, even when unwritten?',
    v: COMPILE_ERR,
  },
  {
    id: '008',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
interface Util {
    static int twice(int n) {
        return n * 2;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(Util.twice(4));
    }
}`,
    o: { a: '8', b: '4', c: 'Compilation error — interfaces cannot have static methods', d: '16' },
    a: 'a',
    e: 'Since Java 8 an interface may declare static methods with bodies, called through the interface name. Util.twice(4) returns 8. Note that such methods are not inherited by implementing classes.',
    w: {
      b: '4 is the argument, not the doubled result.',
      c: 'Static interface methods have been legal since Java 8 — they are a tidy home for related helpers.',
      d: '16 would be 4 * 4; the method multiplies by 2.',
    },
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
interface Shape {
    double area();
}

class Square implements Shape {
    double side;

    Square(double side) {
        this.side = side;
    }

    public double area() {
        return side * side;
    }
}

class Main {
    public static void main(String[] args) {
        Shape s = new Square(3);
        System.out.println(s.area());
    }
}`,
    o: { a: '9', b: '9.0', c: '6.0', d: 'Compilation error' },
    a: 'b',
    e: 'An interface reference can hold any implementation and dispatches to it. area() returns a double, so 3.0 * 3.0 prints as 9.0.',
    w: {
      a: 'The return type is double, so the printed form includes a decimal point.',
      c: '6.0 is the perimeter of a side-3 square divided differently — the area is side squared.',
      d: 'Assigning a Square to a Shape reference is the whole point of programming to an interface.',
    },
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
interface Vehicle {
    void start();

    void stop();
}

abstract class AbstractVehicle implements Vehicle {
    public void stop() {
        System.out.println("stopped");
    }
}

class Car extends AbstractVehicle {
    public void start() {
        System.out.println("started");
    }
}

class Main {
    public static void main(String[] args) {
        Vehicle v = new Car();
        v.start();
        v.stop();
    }
}`,
    o: {
      a: 'started then stopped',
      b: 'stopped then started',
      c: 'Compilation error — AbstractVehicle does not implement start()',
      d: 'started only',
    },
    a: 'a',
    e: 'An abstract class may implement part of an interface and leave the rest to its subclasses. Car supplies start(), inherits stop(), and the calls run in the order written.',
    w: {
      b: 'The calls execute in source order: start() then stop().',
      c: 'Because AbstractVehicle is abstract it is allowed to leave start() unimplemented.',
      d: 'stop() is inherited from AbstractVehicle and runs normally.',
    },
    h: 'An abstract class is allowed to leave interface methods unimplemented.',
    v: out('started\nstopped'),
  },
  {
    id: '011',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
interface Greeter {
    default String greet() {
        return "hi";
    }
}

class Loud implements Greeter {
    public String greet() {
        return Greeter.super.greet().toUpperCase();
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Loud().greet());
    }
}`,
    o: { a: 'hi', b: 'HI', c: 'Compilation error', d: 'It recurses forever' },
    a: 'b',
    e: 'Greeter.super.greet() calls the interface default implementation directly, returning "hi", which is then uppercased to "HI". This is the interface analogue of super.method().',
    w: {
      a: 'The override uppercases the inherited result before returning it.',
      c: 'InterfaceName.super.method() is the correct syntax for invoking a default implementation.',
      d: 'The qualified super call is statically bound to the interface body, so it does not re-enter the override.',
    },
    h: 'How do you call an interface default method from the class that overrides it?',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'medium',
    k: 'concept',
    p: 'You need a type that several unrelated classes can adopt, while also sharing some protected mutable state between a family of related classes. What fits best?',
    o: {
      a: 'One interface for everything',
      b: 'One abstract class for everything',
      c: 'An interface for the capability, plus an abstract base class holding the shared state',
      d: 'A final class with static helper methods',
    },
    a: 'c',
    e: 'Interfaces give you multiple inheritance of type, so unrelated classes can adopt a capability. Abstract classes give you shared state and single inheritance of implementation. Using both — interface for the contract, abstract base for the reuse — is the standard answer, and it is what the JDK collections do.',
    w: {
      a: 'An interface cannot hold protected mutable instance state; its fields are constants.',
      b: 'A class can extend only one superclass, so unrelated families could not all adopt it.',
      d: 'Static helpers provide neither a shared type nor per-instance state.',
    },
    h: 'Think about what each construct can and cannot carry.',
  },
  {
    id: '013',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
interface Config {
    int MAX = 10;
}

class Main {
    public static void main(String[] args) {
        Config.MAX = 20;
        System.out.println(Config.MAX);
    }
}`,
    o: {
      a: 'It prints 20',
      b: 'It prints 10',
      c: 'It fails to compile — MAX is implicitly final',
      d: 'It throws an exception at runtime',
    },
    a: 'c',
    e: 'Interface fields are implicitly public static final, so MAX is a constant and cannot be assigned. The compiler reports "cannot assign a value to final variable MAX".',
    w: {
      a: 'The assignment is rejected before the program can run.',
      b: 'Nothing is printed, because compilation fails.',
      d: 'Assigning to a final field is a compile-time error, not a runtime one.',
    },
    h: 'Three modifiers are added to every interface field automatically.',
    v: COMPILE_ERR,
  },
];

export const l2Abstract = expand(2, 'l2-abstract', 'L2-ABS', seeds);
