import { expand, JAVA_OUT, COMPILE_ERR, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void bump(int n) {
        n++;
    }

    public static void main(String[] args) {
        int x = 5;
        bump(x);
        System.out.println(x);
    }
}`,
    o: { a: '6', b: '5', c: '0', d: 'Compilation error' },
    a: 'b',
    e: 'Java passes arguments by value. bump receives a copy of x, so incrementing the parameter n has no effect on the caller’s variable. x is still 5.',
    w: {
      a: '6 would require pass-by-reference for primitives, which Java does not have.',
      c: 'x is explicitly initialised to 5 and never reset.',
      d: 'The code is valid — the method simply has no observable effect.',
    },
    h: 'Is n the same storage as x, or a copy of it?',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void fill(int[] a) {
        a[0] = 99;
    }

    public static void main(String[] args) {
        int[] nums = {1, 2, 3};
        fill(nums);
        System.out.println(nums[0]);
    }
}`,
    o: { a: '1', b: '99', c: '0', d: 'Compilation error' },
    a: 'b',
    e: 'The reference is copied, but it still points at the same array object. Writing through that reference mutates the one array both variables share, so nums[0] becomes 99.',
    w: {
      a: 'Pass-by-value copies the reference, not the array. The elements are shared.',
      c: '0 was never assigned; the array was initialised with {1, 2, 3}.',
      d: 'Passing an array to a method that takes int[] is perfectly valid.',
    },
    h: 'What exactly is copied when you pass an array: the array, or the arrow pointing to it?',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void replace(int[] a) {
        a = new int[] {7, 8, 9};
        a[0] = 100;
    }

    public static void main(String[] args) {
        int[] nums = {1, 2, 3};
        replace(nums);
        System.out.println(nums[0]);
    }
}`,
    o: { a: '100', b: '7', c: '1', d: '0' },
    a: 'c',
    e: 'Reassigning the parameter only repoints the local copy of the reference at a brand-new array. The caller’s nums still points at {1, 2, 3}, so nums[0] is 1.',
    w: {
      a: '100 is written into the new array created inside the method, which the caller never sees.',
      b: '7 is the first element of the replacement array, also invisible to the caller.',
      d: 'nums[0] was initialised to 1 and never modified through the shared reference.',
    },
    h: 'Mutating through a reference is visible to the caller; reassigning the reference is not.',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int fact(int n) {
        return n <= 1 ? 1 : n * fact(n - 1);
    }

    public static void main(String[] args) {
        System.out.println(fact(5));
    }
}`,
    o: { a: '15', b: '24', c: '120', d: 'StackOverflowError' },
    a: 'c',
    e: '5 * 4 * 3 * 2 * 1 = 120. The base case n <= 1 returns 1 and stops the recursion.',
    w: {
      a: '15 is 1+2+3+4+5 — a sum, not a product.',
      b: '24 is 4!, which would be fact(4).',
      d: 'The base case is reachable from 5 in five calls, so the stack never overflows.',
    },
    h: 'Expand the calls down to the base case and multiply.',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    static int sign(int n) {
        if (n > 0) {
            return 1;
        }
    }

    public static void main(String[] args) {
        System.out.println(sign(5));
    }
}`,
    o: {
      a: 'It prints 1',
      b: 'It fails to compile — missing return statement',
      c: 'It prints 0 when n is not positive',
      d: 'It throws an exception at runtime',
    },
    a: 'b',
    e: 'A method with a non-void return type must return on every path the compiler can reach. There is no return for the case n <= 0, so compilation fails with "missing return statement".',
    w: {
      a: 'The call would return 1, but the method never compiles, so the program cannot run.',
      c: 'Java does not supply an implicit default return value; the omission is an error.',
      d: 'This is caught at compile time by flow analysis, not at runtime.',
    },
    h: 'Trace the path where the if condition is false.',
    v: COMPILE_ERR,
  },
  {
    id: '006',
    d: 'easy',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    static void log(String msg) {
        System.out.println(msg);
    }

    public static void main(String[] args) {
        int result = log("hi");
        System.out.println(result);
    }
}`,
    o: {
      a: 'It prints hi then 0',
      b: 'It prints hi then 1',
      c: 'It fails to compile — void cannot be converted to int',
      d: 'It prints hi then null',
    },
    a: 'c',
    e: 'A void method produces no value, so it cannot appear on the right of an assignment. The compiler reports "incompatible types: void cannot be converted to int".',
    w: {
      a: 'There is no implicit 0 result from a void call — the assignment itself is illegal.',
      b: 'void methods return nothing at all, not a success code.',
      d: 'null is a reference value; void is the absence of any value, and int could not hold null anyway.',
    },
    h: 'What value does a void method hand back to its caller?',
    v: COMPILE_ERR,
  },
  {
    id: '007',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int total(int... nums) {
        int sum = 0;
        for (int n : nums) {
            sum += n;
        }
        return sum;
    }

    public static void main(String[] args) {
        System.out.println(total() + " " + total(1, 2, 3));
    }
}`,
    o: { a: '0 6', b: 'Compilation error', c: '0 3', d: 'NullPointerException then 6' },
    a: 'a',
    e: 'A varargs parameter accepts any number of arguments, including none. With no arguments nums is an empty array (not null), so the sum is 0; with 1, 2, 3 it is 6.',
    w: {
      b: 'Calling a varargs method with zero arguments is legal — that is one of the main reasons varargs exists.',
      c: '3 would be the argument count, not their sum.',
      d: 'Java passes an empty array for zero varargs, never null, so the for-each loop is safe.',
    },
    h: 'What does the varargs array contain when no arguments are supplied?',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'easy',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            System.out.print(i);
        }
        System.out.println(i);
    }
}`,
    o: {
      a: 'It prints 0123',
      b: 'It prints 0122',
      c: 'It fails to compile — i is out of scope after the loop',
      d: 'It prints 012 then null',
    },
    a: 'c',
    e: 'A variable declared in the for header is scoped to the loop. After the closing brace the name i no longer exists, so the compiler reports "cannot find symbol".',
    w: {
      a: 'That would require i to survive the loop and hold 3.',
      b: 'i is not visible after the loop at all, so no value is printed.',
      d: 'An out-of-scope name is a compile error, not a null value.',
    },
    h: 'Where does the scope of a for-header variable end?',
    v: COMPILE_ERR,
  },
  {
    id: '009',
    d: 'medium',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    int value = 5;

    int getValue() {
        return value;
    }

    public static void main(String[] args) {
        System.out.println(getValue());
    }
}`,
    o: {
      a: 'It prints 5',
      b: 'It prints 0',
      c: 'It fails to compile — a non-static method cannot be called from a static context',
      d: 'It throws NullPointerException',
    },
    a: 'c',
    e: 'main is static, so it runs without an instance. getValue is an instance method and needs one, so the compiler reports "non-static method getValue() cannot be referenced from a static context". You would need new Main().getValue().',
    w: {
      a: 'It would print 5 only via an instance, e.g. new Main().getValue().',
      b: 'value is initialised to 5, but the code does not compile anyway.',
      d: 'There is no reference to dereference — the error is detected at compile time.',
    },
    h: 'Which object would value belong to when main runs?',
    v: COMPILE_ERR,
  },
  {
    id: '010',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void addBang(StringBuilder sb) {
        sb.append("!");
    }

    static void shout(String s) {
        s = s.toUpperCase();
    }

    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("hi");
        String s = "hi";
        addBang(sb);
        shout(s);
        System.out.println(sb + " " + s);
    }
}`,
    o: { a: 'hi! HI', b: 'hi! hi', c: 'hi hi', d: 'hi HI' },
    a: 'b',
    e: 'StringBuilder is mutable, so append changes the shared object and the caller sees "hi!". String is immutable and the parameter is only reassigned locally, so the caller’s s is unchanged.',
    w: {
      a: 'shout only rebinds its local parameter; the caller’s String reference still points at "hi".',
      c: 'append genuinely mutates the builder the caller holds, so the "!" is visible.',
      d: 'Both halves are wrong: the builder does change and the String does not.',
    },
    h: 'One of these two types can be modified in place. Which?',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void f(int n) {
        System.out.println("int");
    }

    static void f(long n) {
        System.out.println("long");
    }

    static void f(double n) {
        System.out.println("double");
    }

    public static void main(String[] args) {
        f('a');
    }
}`,
    o: { a: 'int', b: 'long', c: 'double', d: 'Compilation error — ambiguous call' },
    a: 'a',
    e: 'There is no f(char), so the compiler widens. Widening prefers the smallest type that fits, and char widens to int before long or double, so f(int) is chosen.',
    w: {
      b: 'long is a legal target but a wider one, so it loses to int.',
      c: 'double is the widest candidate and is only chosen when nothing narrower fits.',
      d: 'Overload resolution has a defined preference order here, so the call is not ambiguous.',
    },
    h: 'Widening picks the narrowest applicable type, not the first one declared.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static void down(int n) {
        if (n == 0) {
            return;
        }
        down(n - 1);
        System.out.print(n);
    }

    public static void main(String[] args) {
        down(3);
        System.out.println();
    }
}`,
    o: { a: '321', b: '123', c: '3210', d: '0123' },
    a: 'b',
    e: 'The recursive call happens before the print, so every frame prints only on the way back up the stack. The deepest frame (n = 1) prints first, giving 123.',
    w: {
      a: '321 is what you get if the print comes before the recursive call.',
      c: 'The n == 0 frame returns immediately without printing.',
      d: 'Again, 0 is never printed, and the order starts at 1.',
    },
    h: 'Does each frame print before or after it recurses?',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int half(int n) {
        return n / 2;
    }

    public static void main(String[] args) {
        System.out.println(half(half(20)));
    }
}`,
    o: { a: '10', b: '5', c: '20', d: '2.5' },
    a: 'b',
    e: 'The inner call evaluates first: half(20) is 10, and half(10) is 5.',
    w: {
      a: '10 is the result of only the inner call.',
      c: '20 is the original argument.',
      d: 'The method returns int, so the result cannot have a fractional part.',
    },
    v: JAVA_OUT,
  },
  {
    id: '014',
    d: 'medium',
    k: 'concept',
    p: 'Which pair of methods is a valid overload of each other?',
    o: {
      a: 'int f(int a) and double f(int a)',
      b: 'void f(int a) and void f(int a, int b)',
      c: 'void f(int a) and void f(int b)',
      d: 'static void f(int a) and void f(int a)',
    },
    a: 'b',
    e: 'Overloads must differ in their parameter list. Different arity is the clearest way to do that, so f(int) and f(int, int) coexist happily.',
    w: {
      a: 'Return type is not part of the signature, so these two clash as duplicate methods.',
      c: 'Parameter names are irrelevant — both have the signature f(int), which is a duplicate.',
      d: 'static is a modifier, not part of the signature, so these are also duplicates.',
    },
    h: 'Which parts of a method declaration make up its signature?',
  },
];

export const l1Methods = expand(1, 'l1-methods', 'L1-MTH', seeds);
