import { expand, JAVA_OUT, COMPILE_ERR, out, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Dog {
    String name;

    Dog(String name) {
        this.name = name;
    }
}

class Main {
    public static void main(String[] args) {
        Dog d = new Dog();
        System.out.println(d.name);
    }
}`,
    o: {
      a: 'It prints null',
      b: 'It fails to compile — there is no no-argument constructor',
      c: 'It prints an empty line',
      d: 'It compiles because Java always supplies a default constructor',
    },
    a: 'b',
    e: 'The compiler only inserts a default no-argument constructor when a class declares none. Dog declares Dog(String), so new Dog() has no matching constructor and compilation fails.',
    w: {
      a: 'The field would be null, but the program never gets as far as creating the object.',
      c: 'Nothing is printed because there is no runnable program.',
      d: 'The implicit default constructor disappears as soon as you write any constructor of your own.',
    },
    h: 'When does Java add a default constructor for you?',
    v: COMPILE_ERR,
  },
  {
    id: '002',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Box {
    int w;
    int h;

    Box() {
        this(1, 1);
    }

    Box(int w, int h) {
        this.w = w;
        this.h = h;
    }
}

class Main {
    public static void main(String[] args) {
        Box b = new Box();
        System.out.println(b.w + "x" + b.h);
    }
}`,
    o: { a: '0x0', b: '1x1', c: 'Compilation error', d: 'It recurses forever' },
    a: 'b',
    e: 'this(1, 1) delegates from the no-arg constructor to the two-arg one, which assigns both fields. The object ends up 1 by 1.',
    w: {
      a: '0x0 would be the field defaults, but the delegated constructor overwrites them.',
      c: 'Constructor delegation with this(...) as the first statement is exactly the supported form.',
      d: 'The two constructors have different signatures, so the delegation terminates immediately.',
    },
    h: 'What does this(...) do inside a constructor?',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Init {
    int x = log("field");

    Init() {
        log("constructor");
    }

    static int log(String s) {
        System.out.println(s);
        return 0;
    }
}

class Main {
    public static void main(String[] args) {
        new Init();
    }
}`,
    o: {
      a: 'constructor then field',
      b: 'field then constructor',
      c: 'constructor only',
      d: 'field only',
    },
    a: 'b',
    e: 'Instance field initialisers run before the body of the constructor, in declaration order. So "field" prints first, then "constructor".',
    w: {
      a: 'The constructor body runs last, after the implicit super() call and all field initialisers.',
      c: 'The field initialiser is not optional — it runs on every instantiation.',
      d: 'The constructor body runs too; it just runs second.',
    },
    h: 'Which runs first on `new`: the field initialisers or the constructor body?',
    v: out('field\nconstructor'),
  },
  {
    id: '004',
    d: 'hard',
    k: 'bug',
    p: 'What happens when this program is compiled?',
    c: `
class Box {
    int size;

    void Box(int size) {
        this.size = size;
    }
}

class Main {
    public static void main(String[] args) {
        Box b = new Box(5);
        System.out.println(b.size);
    }
}`,
    o: {
      a: 'It prints 5',
      b: 'It prints 0',
      c: 'It fails to compile — Box(int) is a method, not a constructor',
      d: 'It fails to compile — a constructor cannot have a parameter named like its field',
    },
    a: 'c',
    e: 'A constructor has no return type. Writing void in front makes it an ordinary method that happens to be named Box, so the class keeps only its implicit no-arg constructor and new Box(5) finds no match.',
    w: {
      a: 'The method is never called, and the call new Box(5) does not compile.',
      b: 'Nothing runs — compilation stops first.',
      d: 'Shadowing a field with a parameter is legal, which is exactly why this.size exists.',
    },
    h: 'Look at what appears immediately before the name Box.',
    v: COMPILE_ERR,
  },
  {
    id: '005',
    d: 'hard',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Port {
    int number;

    Port() {
        System.out.println("defaulting");
        this(8080);
    }

    Port(int number) {
        this.number = number;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Port().number);
    }
}`,
    o: {
      a: 'It prints defaulting then 8080',
      b: 'It prints defaulting then 0',
      c: 'It fails to compile — the this(...) call must be the first statement',
      d: 'It fails to compile — two constructors cannot share a class',
    },
    a: 'c',
    e: 'A this(...) or super(...) call must be the very first statement in a constructor, so the base object is fully set up before anything else runs. The println in front of it is a compile error.',
    w: {
      a: 'That is what the author intended, but the ordering rule makes the code illegal.',
      b: 'The program never compiles, so no value is printed.',
      d: 'Overloaded constructors are entirely normal; the problem is the statement order.',
    },
    h: 'There is a strict rule about where this(...) may appear.',
    v: COMPILE_ERR,
  },
  {
    id: '006',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Config {
    final int port;

    Config() {
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Config().port);
    }
}`,
    o: {
      a: 'It prints 0',
      b: 'It fails to compile — the final field port is never initialised',
      c: 'It prints null',
      d: 'It compiles and port defaults to 0 like any other int field',
    },
    a: 'b',
    e: 'A final instance field must be assigned exactly once, either at its declaration or in every constructor. Leaving it unassigned is an error: "variable port might not have been initialized".',
    w: {
      a: 'Default initialisation does not satisfy the final rule — the compiler insists on an explicit assignment.',
      c: 'port is an int, which can never be null.',
      d: 'That is true of non-final fields. final removes the implicit-default shortcut.',
    },
    h: 'How many times must a final field be assigned, and where?',
    v: COMPILE_ERR,
  },
  {
    id: '007',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Temperature {
    private double celsius;

    void setCelsius(double c) {
        celsius = c;
    }

    double getFahrenheit() {
        return celsius * 9 / 5 + 32;
    }
}

class Main {
    public static void main(String[] args) {
        Temperature t = new Temperature();
        t.setCelsius(100);
        System.out.println(t.getFahrenheit());
    }
}`,
    o: { a: '212.0', b: '212', c: '132.0', d: '180.0' },
    a: 'a',
    e: 'celsius is a double, so celsius * 9 is 900.0, / 5 is 180.0, + 32 is 212.0. The method returns double, so println prints 212.0.',
    w: {
      b: 'The return type is double, so the printed form carries a decimal point.',
      c: '132.0 would be 100 + 32, skipping the multiplication and division.',
      d: '180.0 is the value before adding 32.',
    },
    h: 'Watch the return type as well as the arithmetic.',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Student {
    String name;
    int year;

    Student(String name) {
        this.name = name;
        this.year = 1;
    }

    Student(String name, int year) {
        this.name = name;
        this.year = year;
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Student("Ann").year + " " + new Student("Bo", 3).year);
    }
}`,
    o: { a: '1 3', b: '0 3', c: '1 1', d: 'Compilation error' },
    a: 'a',
    e: 'Overload resolution picks the constructor matching each argument list: the one-arg version defaults year to 1, and the two-arg version takes 3 from the caller.',
    w: {
      b: 'The one-arg constructor explicitly assigns year = 1, overriding the default 0.',
      c: 'The second object was built with the two-arg constructor, which stores 3.',
      d: 'Constructors may be overloaded just like methods, as long as the parameter lists differ.',
    },
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Widget {
    static int created;
    int id;

    Widget() {
        created++;
        id = created;
    }
}

class Main {
    public static void main(String[] args) {
        new Widget();
        new Widget();
        Widget w = new Widget();
        System.out.println(Widget.created + " " + w.id);
    }
}`,
    o: { a: '3 3', b: '1 1', c: '3 1', d: '1 3' },
    a: 'a',
    e: 'created is static, so it is shared by every instance and reaches 3 after three constructions. The third object copies that value into its own id, which is also 3.',
    w: {
      b: 'A static field is not reset per instance — it keeps accumulating.',
      c: 'id is assigned from created after the increment, so the third widget gets 3.',
      d: 'created counts all three constructions, so it is 3 rather than 1.',
    },
    h: 'One of these fields is shared across all instances.',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Simple {
    int n = 7;
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Simple().n);
    }
}`,
    o: { a: '0', b: '7', c: 'Compilation error — no constructor is declared', d: 'null' },
    a: 'b',
    e: 'Because Simple declares no constructor, the compiler supplies a no-argument one. It runs the field initialiser, so n is 7.',
    w: {
      a: '0 is the default before the initialiser runs; the initialiser then sets 7.',
      c: 'A class with no explicit constructor gets an implicit default constructor, so new Simple() is fine.',
      d: 'n is an int and cannot be null.',
    },
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'medium',
    k: 'concept',
    p: 'Which set of choices makes a class immutable?',
    o: {
      a: 'Mark every field private and add a getter for each',
      b: 'Mark the class final and make every field public',
      c: 'Make every field private and final, assign them in the constructor, and provide no setters',
      d: 'Make every field static final',
    },
    a: 'c',
    e: 'Immutability means no observable state can change after construction: private final fields assigned once in the constructor, and no method that mutates them. (With mutable field types you also defensively copy on the way in and out.)',
    w: {
      a: 'private fields with getters still allow internal mutation and say nothing about setters.',
      b: 'final on the class only blocks subclassing; public fields remain writable from anywhere.',
      d: 'static final fields are shared class constants, not per-instance state — that changes what the class means rather than making instances immutable.',
    },
    h: 'Think about what has to be true after the constructor returns.',
  },
  {
    id: '012',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Item {
    String label = "default";

    Item() {
        this.label = upper(label);
    }

    String upper(String s) {
        return s.toUpperCase();
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Item().label);
    }
}`,
    o: { a: 'default', b: 'DEFAULT', c: 'null', d: 'NullPointerException' },
    a: 'b',
    e: 'Field initialisers run before the constructor body, so label already holds "default" when the constructor calls upper on it. The field is then reassigned to "DEFAULT".',
    w: {
      a: 'The constructor reassigns the field, so the original lowercase value does not survive.',
      c: 'The initialiser has already run by the time the constructor body executes, so label is not null.',
      d: 'There is nothing null to dereference — the ordering guarantees the initialiser ran first.',
    },
    h: 'Has the field initialiser already run when the constructor body starts?',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Rect {
    private int w;
    private int h;

    Rect(int w, int h) {
        this.w = w;
        this.h = h;
    }

    int area() {
        return w * h;
    }

    void scale(int factor) {
        w *= factor;
        h *= factor;
    }
}

class Main {
    public static void main(String[] args) {
        Rect r = new Rect(2, 3);
        r.scale(2);
        System.out.println(r.area());
    }
}`,
    o: { a: '6', b: '12', c: '24', d: '36' },
    a: 'c',
    e: 'scale doubles both sides, giving 4 by 6, so the area is 24. Scaling both dimensions by 2 multiplies the area by 4.',
    w: {
      a: '6 is the area before scaling.',
      b: '12 would be the area if only one side were doubled.',
      d: '36 would require a 6 by 6 rectangle.',
    },
    v: JAVA_OUT,
  },
];

export const l1Ctor = expand(1, 'l1-ctor', 'L1-CTR', seeds);
