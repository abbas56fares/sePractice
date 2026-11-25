import { expand, JAVA_OUT, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    String id = "A";

    String id() {
        return "A";
    }

    String describe() {
        return id + id();
    }
}

class B extends A {
    String id = "B";

    String id() {
        return "B";
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new B().describe());
    }
}`,
    o: { a: 'AA', b: 'BB', c: 'AB', d: 'BA' },
    a: 'c',
    e: 'describe() lives in A, so the unqualified field name id binds at compile time to A’s field, giving "A". The method call id() is virtual and dispatches on the runtime type B, giving "B". Fields hide, methods override.',
    w: {
      a: 'AA would need id() to be resolved statically too, but instance methods never are.',
      b: 'BB would need field access to be polymorphic, which it is not.',
      d: 'The field comes first in the expression and resolves to A; the method comes second and resolves to B.',
    },
    h: 'One of the two is resolved by the declared type and the other by the runtime type.',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Node {
    static int created = 0;
    int id;
    Node child;

    Node(int depth) {
        created++;
        id = created;
        if (depth > 0) {
            child = new Node(depth - 1);
        }
    }
}

class Main {
    public static void main(String[] args) {
        Node root = new Node(2);
        System.out.println(root.id + " " + root.child.id + " " + root.child.child.id + " " + Node.created);
    }
}`,
    o: { a: '1 2 3 3', b: '3 2 1 3', c: '1 1 1 3', d: '1 2 3 4' },
    a: 'a',
    e: 'Each constructor increments the shared counter before recursing, so ids are handed out from the outside in: 1, 2, 3. Three Nodes are created in total, leaving created at 3.',
    w: {
      b: 'The outermost node is constructed first and therefore takes the lowest id.',
      c: 'id is assigned from the shared counter after it is incremented, so each node gets a distinct value.',
      d: 'Exactly three objects are created — the recursion stops when depth reaches 0.',
    },
    h: 'The counter is incremented before the recursive call.',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.ArrayList;
import java.util.List;

class Item {
    int qty = 1;
}

class Main {
    public static void main(String[] args) {
        List<Item> cart = new ArrayList<>();
        Item apple = new Item();
        cart.add(apple);
        cart.add(apple);
        cart.get(0).qty = 5;
        System.out.println(cart.get(1).qty + " " + cart.size());
    }
}`,
    o: { a: '1 2', b: '5 2', c: '5 1', d: '1 1' },
    a: 'b',
    e: 'Adding the same object twice stores two references to one Item. Mutating through index 0 is therefore visible through index 1, while the list still reports a size of 2.',
    w: {
      a: 'Both slots point at the same object, so the change is visible through either.',
      c: 'A List permits duplicates, so the size is 2. (A Set would have stored it once.)',
      d: 'Both halves are wrong: the quantity is shared and the size is 2.',
    },
    h: 'How many Item objects does this program create?',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    A() {
        System.out.print("A");
        hook();
    }

    void hook() {
        System.out.print("a");
    }
}

class B extends A {
    String s = "init";

    B() {
        super();
        System.out.print("B");
    }

    void hook() {
        System.out.print(s == null ? "null" : s);
    }
}

class Main {
    public static void main(String[] args) {
        new B();
        System.out.println();
    }
}`,
    o: { a: 'AinitB', b: 'AnullB', c: 'AaB', d: 'ABinit' },
    a: 'b',
    e: 'A’s constructor calls the overridden hook() while B’s field initialisers have not yet run, so s is still null and the guard prints "null". Only after super() returns is s set to "init", and then B’s body prints "B".',
    w: {
      a: 'The initialiser s = "init" runs after the superclass constructor, so s is null at the moment hook() executes.',
      c: 'hook() is overridden, so B’s version runs even during A’s constructor.',
      d: 'The field is assigned silently — nothing prints it after construction.',
    },
    h: 'What is the value of s while A’s constructor is still running?',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Box {
    int v;

    Box(int v) {
        this.v = v;
    }
}

class Main {
    static void swap(Box a, Box b) {
        Box t = a;
        a = b;
        b = t;
    }

    static void swapValues(Box a, Box b) {
        int t = a.v;
        a.v = b.v;
        b.v = t;
    }

    public static void main(String[] args) {
        Box x = new Box(1);
        Box y = new Box(2);
        swap(x, y);
        System.out.print(x.v + "" + y.v);
        swapValues(x, y);
        System.out.println(" " + x.v + "" + y.v);
    }
}`,
    o: { a: '21 12', b: '12 21', c: '12 12', d: '21 21' },
    a: 'b',
    e: 'swap only exchanges the method’s local copies of the references, so the caller sees no change: "12". swapValues writes through the references into the shared objects, which the caller does see: "21".',
    w: {
      a: 'The first swap has no effect at all, so the first pair is still 1 and 2.',
      c: 'swapValues does mutate the objects, so the second pair is swapped.',
      d: 'The reference-only swap cannot affect the caller.',
    },
    h: 'Reassigning a parameter versus writing through it.',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static String f(StringBuilder sb) {
        sb.append("x");
        return sb.toString();
    }

    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("a");
        System.out.println(f(sb) + f(sb) + sb.length());
    }
}`,
    o: { a: 'axax2', b: 'axaxx3', c: 'aaxx3', d: 'axxaxx3' },
    a: 'b',
    e: 'Operands are evaluated strictly left to right. The first call makes the builder "ax" and returns that snapshot; the second makes it "axx" and returns that. Finally sb.length() reads 3.',
    w: {
      a: 'The builder keeps growing, so the second call returns a longer string, and its length is 3.',
      c: 'The first call appends before taking its snapshot, so it returns "ax", not "a".',
      d: 'Each call appends exactly one character, so the first snapshot has one x.',
    },
    h: 'Each call mutates the shared builder before taking its snapshot.',
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int n = 0;

    static int next() {
        return ++n;
    }

    public static void main(String[] args) {
        System.out.println(next() + next() * next());
    }
}`,
    o: { a: '7', b: '9', c: '12', d: '6' },
    a: 'a',
    e: 'Precedence decides how the values combine, but evaluation order is still left to right: the three calls yield 1, 2 and 3 in that order. The expression is therefore 1 + 2 * 3 = 7.',
    w: {
      b: '9 would be (1 + 2) * 3, which ignores that * binds tighter than +.',
      c: '12 would be 2 + (... ) with the calls evaluated in a different order — Java fixes the order as left to right.',
      d: '6 is 1 + 2 + 3, treating * as addition.',
    },
    h: 'Precedence and evaluation order are two different things.',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Account {
    protected double balance;

    Account(double b) {
        balance = b;
    }

    void withdraw(double amt) {
        balance -= amt;
    }
}

class Fee extends Account {
    Fee(double b) {
        super(b);
    }

    void withdraw(double amt) {
        super.withdraw(amt + 1);
    }
}

class Main {
    public static void main(String[] args) {
        Account a = new Fee(100);
        a.withdraw(10);
        a.withdraw(10);
        System.out.println(a.balance);
    }
}`,
    o: { a: '80.0', b: '78.0', c: '79.0', d: '100.0' },
    a: 'b',
    e: 'The reference is typed Account but the object is a Fee, so the override runs on both calls and adds a 1.0 fee each time: 100 - 11 - 11 = 78.0.',
    w: {
      a: '80.0 would skip the fee, which is what Account.withdraw alone would do.',
      c: '79.0 applies the fee only once.',
      d: 'Both withdrawals do take effect.',
    },
    h: 'The declared type does not stop the override from running.',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
interface Logger {
    default String prefix() {
        return "[log] ";
    }

    default String log(String m) {
        return prefix() + m;
    }
}

class Timestamped implements Logger {
    public String prefix() {
        return "[ts] ";
    }
}

class Main {
    public static void main(String[] args) {
        System.out.println(new Timestamped().log("hi"));
    }
}`,
    o: { a: '[log] hi', b: '[ts] hi', c: 'hi', d: 'Compilation error' },
    a: 'b',
    e: 'A default method body calls other methods virtually, exactly like a class method. log() is inherited unchanged, but its call to prefix() dispatches to the class override.',
    w: {
      a: 'prefix() is overridden by Timestamped, so the interface default is not used.',
      c: 'log() prepends the prefix to its argument.',
      d: 'Overriding a default method with a public method of the same signature is valid.',
    },
    h: 'Default-method bodies are subject to the same dynamic dispatch as class methods.',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    static String s() {
        return "As";
    }

    String i() {
        return "Ai";
    }

    String both() {
        return s() + i();
    }
}

class B extends A {
    static String s() {
        return "Bs";
    }

    String i() {
        return "Bi";
    }
}

class Main {
    public static void main(String[] args) {
        A ref = new B();
        System.out.println(ref.both());
    }
}`,
    o: { a: 'AsAi', b: 'BsBi', c: 'AsBi', d: 'BsAi' },
    a: 'c',
    e: 'both() is declared in A, so the unqualified static call s() is bound to A.s() at compile time. The instance call i() dispatches on the runtime type and reaches B.i(). Static methods are hidden, never overridden.',
    w: {
      a: 'i() is overridden by B, and overrides always win for instance methods.',
      b: 'B.s() merely hides A.s(); a call inside A’s body still means A.s().',
      d: 'The static part resolves to A and the instance part to B, not the other way round.',
    },
    h: 'Which of the two calls can be redirected at runtime?',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'hard',
    k: 'bug',
    p: 'What does this program print?',
    c: `
class Counter {
    int count = 10;

    void increment() {
        int count = this.count;
        count++;
    }
}

class Main {
    public static void main(String[] args) {
        Counter c = new Counter();
        c.increment();
        c.increment();
        System.out.println(c.count);
    }
}`,
    o: { a: '12', b: '11', c: '10', d: 'Compilation error' },
    a: 'c',
    e: 'The local variable shadows the field. It is initialised from the field and then incremented, but nothing is ever written back, so the field stays 10 no matter how often increment() is called.',
    w: {
      a: '12 would require each call to write the new value back into the field.',
      b: '11 would be one successful increment; in fact none reaches the field.',
      d: 'Shadowing a field with a local variable is legal, which is what makes this bug quiet.',
    },
    h: 'Which variable does count++ modify?',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Chain {
    String name;
    Chain next;

    Chain(String name) {
        this.name = name;
    }

    Chain link(String n) {
        this.next = new Chain(n);
        return this.next;
    }

    String path() {
        return name + (next == null ? "" : "->" + next.path());
    }
}

class Main {
    public static void main(String[] args) {
        Chain a = new Chain("a");
        a.link("b").link("c");
        System.out.println(a.path());
    }
}`,
    o: { a: 'a', b: 'a->b', c: 'a->b->c', d: 'a->c' },
    a: 'c',
    e: 'link returns the newly created node, so the chained call attaches "c" to "b" rather than to "a". path() then walks the whole list recursively: a->b->c.',
    w: {
      a: 'a has a next node, so the recursive branch is taken.',
      b: 'The second link call operates on b (the return value), extending the chain by one more node.',
      d: 'c is attached to b, not directly to a — link returns the new node, not this.',
    },
    h: 'What object does the second link() call run on?',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class A {
    static StringBuilder log = new StringBuilder();

    A() {
        log.append("A");
    }
}

class B extends A {
    {
        log.append("b");
    }

    B() {
        log.append("B");
    }
}

class Main {
    public static void main(String[] args) {
        new B();
        new B();
        System.out.println(A.log);
    }
}`,
    o: { a: 'AbBAbB', b: 'bABbAB', c: 'AbB', d: 'AABBbb' },
    a: 'a',
    e: 'Each construction runs the superclass constructor ("A"), then B’s instance initialiser ("b"), then B’s constructor body ("B"). The log is static, so both objects append to the same buffer: AbB twice.',
    w: {
      b: 'The instance initialiser runs after the superclass constructor, not before it.',
      c: 'Two objects are created, so the sequence appears twice.',
      d: 'Each object completes its own full sequence before the next one starts.',
    },
    h: 'Three stages per object, and one shared buffer.',
    v: JAVA_OUT,
  },
];

export const l3Tracing = expand(3, 'l3-tracing', 'L3-TRC', seeds);
