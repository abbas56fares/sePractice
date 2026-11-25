import { expand, JAVA_OUT, COMPILE_ERR, throws, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Box {
    int count;
    String label;
    boolean open;
}

class Main {
    public static void main(String[] args) {
        Box b = new Box();
        System.out.println(b.count + " " + b.label + " " + b.open);
    }
}`,
    o: { a: '0 null false', b: '0  false', c: 'null null false', d: '0 null true' },
    a: 'a',
    e: 'Uninitialised instance fields get their type’s default: 0 for int, null for any reference type, and false for boolean.',
    w: {
      b: 'A null String prints as the four characters "null", not as an empty string.',
      c: 'int cannot be null — its default is 0.',
      d: 'The default for boolean is false.',
    },
    h: 'Unlike local variables, fields always get a default value.',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Counter {
    int value;
}

class Main {
    public static void main(String[] args) {
        Counter a = new Counter();
        Counter b = a;
        b.value = 5;
        System.out.println(a.value);
    }
}`,
    o: { a: '0', b: '5', c: 'Compilation error', d: 'NullPointerException' },
    a: 'b',
    e: 'b = a copies the reference, not the object. Both names point at the same Counter, so writing through b is visible through a.',
    w: {
      a: '0 would be right only if b referred to a separate object.',
      c: 'Assigning one reference of the same type to another is perfectly valid.',
      d: 'a was assigned a real object, so nothing is null.',
    },
    h: 'How many Counter objects does this program create?',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Point {
    int x;
    int y;
}

class Main {
    public static void main(String[] args) {
        Point p = new Point();
        p.x = 1;
        Point q = p;
        q = new Point();
        q.x = 9;
        System.out.println(p.x + " " + q.x);
    }
}`,
    o: { a: '9 9', b: '1 9', c: '1 1', d: '0 9' },
    a: 'b',
    e: 'q initially aliases p, but then q is reassigned to a brand-new Point. Writing q.x = 9 touches only that new object, so p.x keeps its earlier value of 1.',
    w: {
      a: 'After the reassignment the two references point at different objects, so p is unaffected.',
      c: 'q.x was explicitly set to 9 on the new object.',
      d: 'p.x was set to 1 before the aliasing, and nothing resets it.',
    },
    h: 'Track which object each name points at after every statement.',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'easy',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
class Box {
    int count = 1;
}

class Main {
    public static void main(String[] args) {
        Box b = null;
        System.out.println(b.count);
    }
}`,
    o: {
      a: 'It prints 1',
      b: 'It prints 0',
      c: 'It throws NullPointerException',
      d: 'It fails to compile',
    },
    a: 'c',
    e: 'b holds no object, so there is no count field to read. Dereferencing a null reference throws NullPointerException at runtime.',
    w: {
      a: 'The initialiser count = 1 only runs when an object is actually created with new.',
      b: 'Field defaults belong to objects; with no object there is nothing to default.',
      d: 'Assigning null to a reference variable is legal, so this compiles and fails only when run.',
    },
    h: 'Does b point at an object when the field is read?',
    v: throws('NullPointerException'),
  },
  {
    id: '005',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Point {
    int x;
    int y;
}

class Main {
    public static void main(String[] args) {
        Point p = new Point();
        Point q = new Point();
        p.x = 1;
        p.y = 2;
        q.x = 3;
        System.out.println(p.x + p.y + q.x + q.y);
    }
}`,
    o: { a: '6', b: '1230', c: '5', d: '0' },
    a: 'a',
    e: 'Each new creates independent state, so q.y is still the default 0. All four operands are ints, so + adds them: 1 + 2 + 3 + 0 = 6.',
    w: {
      b: 'There is no String in the expression, so + is addition rather than concatenation.',
      c: '5 would omit q.x or miscount one of the values.',
      d: 'Only q.y is zero; the other three fields were assigned.',
    },
    h: 'Two objects, and no String anywhere in the expression.',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Account {
    private double balance = 100.0;
}

class Main {
    public static void main(String[] args) {
        Account a = new Account();
        System.out.println(a.balance);
    }
}`,
    o: {
      a: 'It prints 100.0',
      b: 'It prints 0.0',
      c: 'It fails to compile — balance has private access',
      d: 'It compiles because both classes are in the same package',
    },
    a: 'c',
    e: 'private restricts access to the declaring class itself, not to the package. Main cannot read Account.balance, so the compiler reports "balance has private access in Account".',
    w: {
      a: 'The value is 100.0, but no code outside Account is allowed to read it.',
      b: 'The field initialiser runs, so it is never 0.0 — but it is unreadable from here regardless.',
      d: 'Same-package access is what the default (package-private) modifier grants. private is stricter than that.',
    },
    h: 'How far does private reach: the class, the file, or the package?',
    v: COMPILE_ERR,
  },
  {
    id: '007',
    d: 'medium',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
class Item {
    String name = "widget";
}

class Main {
    public static void main(String[] args) {
        Item[] items = new Item[2];
        System.out.println(items[0].name);
    }
}`,
    o: {
      a: 'It prints widget',
      b: 'It prints null',
      c: 'It throws NullPointerException',
      d: 'It throws ArrayIndexOutOfBoundsException',
    },
    a: 'c',
    e: 'new Item[2] creates an array of two references, both null. No Item object has been constructed, so reading .name on items[0] throws NullPointerException.',
    w: {
      a: 'Allocating the array does not call any constructor, so no field initialiser has run.',
      b: 'println(items[0]) would print null; reading a field on that null reference throws instead.',
      d: 'Index 0 is valid for a length-2 array. The problem is the element’s value, not the index.',
    },
    h: 'Creating an array of objects does not create the objects.',
    v: throws('NullPointerException'),
  },
  {
    id: '008',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Temp {
    int value;

    void setGood(int value) {
        this.value = value;
    }

    void setBad(int value) {
        value = value;
    }
}

class Main {
    public static void main(String[] args) {
        Temp t = new Temp();
        t.setBad(9);
        System.out.print(t.value);
        t.setGood(9);
        System.out.println(" " + t.value);
    }
}`,
    o: { a: '9 9', b: '0 9', c: '0 0', d: 'Compilation error' },
    a: 'b',
    e: 'In setBad the parameter shadows the field, so value = value assigns the parameter to itself and the field stays 0. setGood disambiguates with this.value, so the field becomes 9.',
    w: {
      a: 'setBad never touches the field — the unqualified name refers to the nearer declaration, the parameter.',
      c: 'setGood does update the field via this.value.',
      d: 'Self-assignment compiles fine; some compilers warn about it, but it is not an error.',
    },
    h: 'When a parameter and a field share a name, which one does the bare name mean?',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Id {
    int n;
}

class Main {
    public static void main(String[] args) {
        Id a = new Id();
        Id b = new Id();
        a.n = 1;
        b.n = 1;
        System.out.println((a == b) + " " + a.equals(b));
    }
}`,
    o: { a: 'true true', b: 'false true', c: 'false false', d: 'true false' },
    a: 'c',
    e: 'Id does not override equals, so it inherits Object.equals, which is identity comparison — exactly the same test as ==. Two distinct objects give false both times.',
    w: {
      a: 'a and b are separate objects, so == is false.',
      b: 'equals() only compares field values when a class overrides it. Id does not.',
      d: '== compares references, and these are two different objects.',
    },
    h: 'What does Object.equals do if a class does not override it?',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Wallet {
    int cash = 10;
}

class Main {
    static void spend(Wallet w, int amount) {
        w.cash -= amount;
    }

    public static void main(String[] args) {
        Wallet w = new Wallet();
        spend(w, 4);
        spend(w, 3);
        System.out.println(w.cash);
    }
}`,
    o: { a: '10', b: '6', c: '3', d: '7' },
    a: 'c',
    e: 'Both calls mutate the same Wallet object through the shared reference: 10 - 4 = 6, then 6 - 3 = 3.',
    w: {
      a: 'Mutating an object through a reference parameter is visible to the caller, so the field does change.',
      b: '6 is the state after only the first call.',
      d: '7 would be 10 - 3, missing the first call.',
    },
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'easy',
    k: 'concept',
    p: 'A class has a private field `score` and you want code outside the class to read it but never change it. What should the class expose?',
    o: {
      a: 'A public field instead of a private one',
      b: 'A public getScore() method and no setter',
      c: 'A public setScore(int) method only',
      d: 'Nothing — private fields are already readable from other classes',
    },
    a: 'b',
    e: 'That is the core of encapsulation: keep the field private and publish only the accessor you actually want. A getter with no setter gives read-only access from outside.',
    w: {
      a: 'A public field allows unrestricted writes as well as reads, which is the opposite of the requirement.',
      c: 'A setter grants write access and still leaves the value unreadable.',
      d: 'private means the field is invisible outside its own class.',
    },
    h: 'Expose only the operation you want to allow.',
  },
  {
    id: '012',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Node {
    int value;
    Node next;
}

class Main {
    public static void main(String[] args) {
        Node first = new Node();
        first.value = 1;
        first.next = new Node();
        first.next.value = 2;
        System.out.println(first.next.value + " " + (first.next.next == null));
    }
}`,
    o: { a: '2 true', b: '2 false', c: '1 true', d: 'NullPointerException' },
    a: 'a',
    e: 'first.next points at a second Node whose value was set to 2. That node’s own next field was never assigned, so it is still the default null, making the comparison true.',
    w: {
      b: 'An unassigned reference field defaults to null, so first.next.next == null is true.',
      c: '1 is first.value, not first.next.value.',
      d: 'Every reference that is dereferenced here was assigned a real object; only the final next is null, and it is compared rather than dereferenced.',
    },
    h: 'Reading a null reference is fine; only dereferencing it is not.',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Flag {
    boolean on;

    boolean toggle() {
        on = !on;
        return on;
    }
}

class Main {
    public static void main(String[] args) {
        Flag f = new Flag();
        System.out.println(f.toggle() + " " + f.toggle() + " " + f.on);
    }
}`,
    o: { a: 'true false false', b: 'true true true', c: 'false true false', d: 'true false true' },
    a: 'a',
    e: 'The three operands are evaluated left to right. on starts false, so the first toggle returns true, the second flips it back and returns false, and f.on is then read as false.',
    w: {
      b: 'The second call flips the field again, so it cannot return true.',
      c: 'The field starts at the boolean default false, so the first toggle returns true.',
      d: 'f.on is read after both toggles, which cancel out, leaving false.',
    },
    h: 'Concatenation operands are evaluated strictly left to right, side effects included.',
    v: JAVA_OUT,
  },
];

export const l1Classes = expand(1, 'l1-classes', 'L1-CLS', seeds);
