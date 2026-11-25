import { expand, JAVA_OUT, COMPILE_ERR, throws, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Animal {
    void eat() {
    }
}

class Dog extends Animal {
    void fetch() {
        System.out.println("fetching");
    }
}

class Main {
    public static void main(String[] args) {
        Animal a = new Dog();
        a.fetch();
    }
}`,
    o: {
      a: 'It prints fetching',
      b: 'It fails to compile — Animal has no fetch() method',
      c: 'It throws an exception at runtime',
      d: 'It prints nothing',
    },
    a: 'b',
    e: 'The declared type decides which methods you may call. a is an Animal, and Animal declares no fetch(), so the call is rejected even though the object really is a Dog. A cast — ((Dog) a).fetch() — is needed.',
    w: {
      a: 'The object could do it, but the compiler only knows about Animal’s members.',
      c: 'This is caught statically; the program never runs.',
      d: 'A compile error means there is no program to produce output.',
    },
    h: 'Which type does the compiler consult to check a method call?',
    v: COMPILE_ERR,
  },
  {
    id: '002',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
    void eat() {
    }
}

class Dog extends Animal {
    void fetch() {
        System.out.println("fetching");
    }
}

class Main {
    public static void main(String[] args) {
        Animal a = new Dog();
        ((Dog) a).fetch();
    }
}`,
    o: { a: 'fetching', b: 'Compilation error', c: 'ClassCastException', d: 'It prints nothing' },
    a: 'a',
    e: 'The downcast tells the compiler to trust that a really refers to a Dog. The object genuinely is one, so the cast succeeds at runtime and fetch() runs.',
    w: {
      b: 'A cast from a supertype to a subtype is legal to write; the compiler defers the check to runtime.',
      c: 'ClassCastException only occurs when the runtime type is not actually compatible. Here it is a Dog.',
      d: 'fetch() prints unconditionally.',
    },
    h: 'Does the object actually have the type the cast claims?',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'medium',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
class Animal {
}

class Dog extends Animal {
}

class Cat extends Animal {
}

class Main {
    public static void main(String[] args) {
        Animal a = new Cat();
        Dog d = (Dog) a;
        System.out.println(d);
    }
}`,
    o: {
      a: 'It fails to compile',
      b: 'It throws ClassCastException',
      c: 'It prints null',
      d: 'It prints a Cat description',
    },
    a: 'b',
    e: 'Dog and Cat are siblings, so the compiler allows the cast (a could in principle hold a Dog) but the runtime check fails: "class Cat cannot be cast to class Dog".',
    w: {
      a: 'Casting from the common supertype Animal to Dog is statically plausible, so it compiles.',
      c: 'a holds a real object; the failure is the type check, not a null.',
      d: 'The cast throws before println is reached.',
    },
    h: 'The compiler allows the cast; what does the JVM check when it runs?',
    v: throws('ClassCastException'),
  },
  {
    id: '004',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
}

class Dog extends Animal {
}

class Main {
    public static void main(String[] args) {
        Animal a = new Dog();
        System.out.println((a instanceof Dog) + " " + (a instanceof Animal));
    }
}`,
    o: { a: 'true true', b: 'false true', c: 'true false', d: 'false false' },
    a: 'a',
    e: 'instanceof tests the runtime type against a type and its supertypes. The object is a Dog, and a Dog is also an Animal, so both tests are true.',
    w: {
      b: 'The runtime type is Dog, not merely Animal, so the first test passes.',
      c: 'Every Dog is an Animal by inheritance, so the second test also passes.',
      d: 'Both tests succeed — instanceof consults the runtime type, which satisfies both.',
    },
    h: 'instanceof is true for the exact type and every supertype.',
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
        String s = null;
        System.out.println(s instanceof String);
    }
}`,
    o: { a: 'true', b: 'false', c: 'NullPointerException', d: 'Compilation error' },
    a: 'b',
    e: 'instanceof is null-safe by definition: null is not an instance of anything, so the test is false rather than throwing. This is why instanceof needs no separate null check.',
    w: {
      a: 'The declared type is String, but instanceof examines the value, and there is no object.',
      c: 'instanceof never dereferences its operand, so null is handled gracefully.',
      d: 'Testing a reference variable with instanceof is valid regardless of its value.',
    },
    h: 'Is null an instance of any type?',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
    String sound() {
        return "?";
    }
}

class Dog extends Animal {
    String sound() {
        return "woof";
    }
}

class Cat extends Animal {
    String sound() {
        return "meow";
    }
}

class Main {
    public static void main(String[] args) {
        Animal[] pets = {new Dog(), new Cat(), new Animal()};
        StringBuilder sb = new StringBuilder();
        for (Animal p : pets) {
            sb.append(p.sound()).append(" ");
        }
        System.out.println(sb.toString().trim());
    }
}`,
    o: { a: '? ? ?', b: 'woof meow ?', c: 'woof woof woof', d: 'Compilation error' },
    a: 'b',
    e: 'The array’s element type is Animal, but each element keeps its own runtime type, so sound() dispatches individually: woof, meow, then the inherited ?.',
    w: {
      a: 'Dispatch uses the runtime type of each element, not the array’s declared element type.',
      c: 'Each element is a different class, so they give different answers.',
      d: 'Storing subclass instances in a superclass-typed array is standard polymorphism.',
    },
    h: 'Each element answers for itself.',
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
        Object o = "hello";
        if (o instanceof String s) {
            System.out.println(s.length());
        } else {
            System.out.println("not a String");
        }
    }
}`,
    o: { a: 'not a String', b: '5', c: 'Compilation error', d: 'hello' },
    a: 'b',
    e: 'This is the pattern-matching form of instanceof (standard since Java 16). When the test succeeds, s is bound to the value already cast to String, so s.length() is 5.',
    w: {
      a: 'The object genuinely is a String, so the test succeeds.',
      c: 'A pattern variable in instanceof is valid modern Java and removes the redundant cast.',
      d: 'The code prints the length, not the string.',
    },
    h: 'The variable after the type name is bound automatically when the test passes.',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    public static void main(String[] args) {
        String s = "42";
        Integer i = (Integer) s;
        System.out.println(i);
    }
}`,
    o: {
      a: 'It prints 42',
      b: 'It throws ClassCastException',
      c: 'It fails to compile — inconvertible types',
      d: 'It prints null',
    },
    a: 'c',
    e: 'String and Integer are unrelated — neither is a subtype of the other — so no object could ever satisfy the cast. The compiler rejects it outright: "incompatible types: String cannot be converted to Integer".',
    w: {
      a: 'Casting does not parse text. Integer.parseInt(s) or Integer.valueOf(s) would be needed.',
      b: 'A runtime failure requires the cast to be statically plausible first. This one is not.',
      d: 'There is no program to run.',
    },
    h: 'Is there any object that is both a String and an Integer?',
    v: COMPILE_ERR,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Animal {
}

class Dog extends Animal {
}

class Main {
    public static void main(String[] args) {
        Object o = new Dog();
        System.out.println(o.getClass().getSimpleName());
    }
}`,
    o: { a: 'Object', b: 'Animal', c: 'Dog', d: 'Compilation error' },
    a: 'c',
    e: 'getClass() reports the actual runtime class of the object, which is unaffected by how wide the declared reference type is. The object was created with new Dog().',
    w: {
      a: 'Object is only the declared type of the variable.',
      b: 'Animal is a supertype, not the class the object was instantiated from.',
      d: 'getClass() is declared on Object, so it is callable through any reference.',
    },
    h: 'Does the declared type influence what getClass() returns?',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
abstract class Shape {
    abstract int area();
}

class Square extends Shape {
    int side;

    Square(int side) {
        this.side = side;
    }

    int area() {
        return side * side;
    }
}

class Rect extends Shape {
    int w;
    int h;

    Rect(int w, int h) {
        this.w = w;
        this.h = h;
    }

    int area() {
        return w * h;
    }
}

class Main {
    public static void main(String[] args) {
        Shape[] shapes = {new Square(3), new Rect(2, 5)};
        int total = 0;
        for (Shape s : shapes) {
            total += s.area();
        }
        System.out.println(total);
    }
}`,
    o: { a: '19', b: '13', c: '25', d: '9' },
    a: 'a',
    e: 'Each element dispatches to its own area(): the square gives 3 * 3 = 9 and the rectangle gives 2 * 5 = 10, totalling 19. The loop needs no knowledge of the concrete types.',
    w: {
      b: '13 would be 3 + 10, treating the square’s area as its side.',
      c: '25 would be 5 * 5 — the wrong dimensions for both shapes.',
      d: '9 is only the square’s contribution.',
    },
    h: 'Compute each shape separately, then add.',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    String name() {
        return "A";
    }
}

class B extends A {
    String name() {
        return "B";
    }

    String extra() {
        return "x";
    }
}

class Main {
    public static void main(String[] args) {
        A ref = new B();
        System.out.println(ref.name() + ((B) ref).extra());
    }
}`,
    o: { a: 'Ax', b: 'Bx', c: 'AB', d: 'Compilation error' },
    a: 'b',
    e: 'name() is overridden, so dispatch on the runtime type B gives "B". The cast then lets the B-only method extra() be called, appending "x".',
    w: {
      a: 'A ref = new B() still dispatches name() to B’s override — the declared type does not change behaviour.',
      c: 'Only one name() implementation runs, and extra() returns "x" rather than a class name.',
      d: 'The cast makes extra() legal, and the object really is a B, so both calls succeed.',
    },
    h: 'Declared type gates what you may call; runtime type decides what actually runs.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
interface Payable {
    double pay();
}

class Hourly implements Payable {
    public double pay() {
        return 20 * 8;
    }
}

class Salaried implements Payable {
    public double pay() {
        return 1000;
    }
}

class Main {
    static double totalPayroll(Payable[] staff) {
        double total = 0;
        for (Payable p : staff) {
            total += p.pay();
        }
        return total;
    }

    public static void main(String[] args) {
        System.out.println(totalPayroll(new Payable[] {new Hourly(), new Salaried()}));
    }
}`,
    o: { a: '1160.0', b: '1160', c: '1028.0', d: 'Compilation error' },
    a: 'a',
    e: 'Hourly pays 20 * 8 = 160 and Salaried pays 1000, so the total is 1160. total is a double, so the printed value is 1160.0.',
    w: {
      b: 'The accumulator is a double, so println shows a decimal point.',
      c: '1028.0 would add 28 rather than 160.',
      d: 'Both classes implement the interface fully, so the array and the loop are valid.',
    },
    h: 'Watch the declared type of the accumulator as well as the arithmetic.',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'medium',
    k: 'concept',
    p: 'Why is `List<String> names = new ArrayList<>();` usually preferred over `ArrayList<String> names = new ArrayList<>();`?',
    o: {
      a: 'It is faster at runtime',
      b: 'It restricts the variable to the interface contract, so the implementation can be swapped without changing the surrounding code',
      c: 'It uses less memory',
      d: 'ArrayList cannot be assigned to its own type',
    },
    a: 'b',
    e: 'Declaring the variable as the interface keeps the dependency on the contract rather than a concrete class. Switching to LinkedList or an immutable list then touches one line instead of every use site.',
    w: {
      a: 'Dispatch cost is effectively identical; the JIT devirtualises monomorphic call sites either way.',
      c: 'The object created is the same ArrayList, so memory use is unchanged.',
      d: 'Declaring it as ArrayList is perfectly legal — just more tightly coupled.',
    },
    h: 'Think about what has to change later if you swap the implementation.',
  },
];

export const l2Poly = expand(2, 'l2-poly', 'L2-POL', seeds);
