import { expand, JAVA_OUT, COMPILE_ERR, out, throws, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int[] nums = new int[3];
        System.out.println(nums[0]);
    }
}`,
    o: { a: 'null', b: '0', c: 'Nothing — the array is empty', d: 'ArrayIndexOutOfBoundsException' },
    a: 'b',
    e: 'new int[3] allocates three int slots, each initialised to the default value for int, which is 0.',
    w: {
      a: 'null is the default only for reference types. int is a primitive and cannot be null.',
      c: 'The array has length 3 from the moment it is created; the elements simply hold default values.',
      d: 'Index 0 is valid for any array of length 3.',
    },
    h: 'What is the default value of an int field or array element?',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String[] names = new String[2];
        System.out.println(names[0]);
    }
}`,
    o: { a: '""', b: 'null', c: '0', d: 'NullPointerException' },
    a: 'b',
    e: 'Array elements of a reference type default to null, and println(Object) prints the text "null" rather than throwing.',
    w: {
      a: 'Java does not initialise String elements to the empty string — they start as null.',
      c: '0 is the default for numeric primitives, not for references.',
      d: 'Printing a null reference is safe. You would only get an NPE if you called a method on it, e.g. names[0].length().',
    },
    h: 'Default values depend on whether the element type is a primitive or a reference.',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'easy',
    k: 'output',
    p: 'What happens when this program runs?',
    c: `
class Main {
    public static void main(String[] args) {
        int[] nums = {10, 20, 30};
        System.out.println(nums[3]);
    }
}`,
    o: {
      a: 'It prints 30',
      b: 'It prints 0',
      c: 'It throws ArrayIndexOutOfBoundsException',
      d: 'It fails to compile',
    },
    a: 'c',
    e: 'Valid indices for a length-3 array are 0, 1 and 2. Index 3 is one past the end, so the JVM throws ArrayIndexOutOfBoundsException at runtime.',
    w: {
      a: 'The last element, 30, is at index 2. Arrays are zero-based.',
      b: 'Java checks every array access at runtime instead of reading past the end like C does.',
      d: 'The index is a runtime value as far as the bounds rule is concerned, so this compiles cleanly and fails only when executed.',
    },
    h: 'Count the valid indices of a three-element array.',
    v: throws('ArrayIndexOutOfBoundsException'),
  },
  {
    id: '004',
    d: 'easy',
    k: 'compile',
    p: 'What happens when this program is compiled?',
    c: `
class Main {
    public static void main(String[] args) {
        int[] nums = {1, 2, 3};
        System.out.println(nums.length());
    }
}`,
    o: {
      a: 'It prints 3',
      b: 'It fails to compile — length is a field on arrays, not a method',
      c: 'It prints 2',
      d: 'It throws an exception at runtime',
    },
    a: 'b',
    e: 'Arrays expose a final field called length, so the correct form is nums.length with no parentheses. Only String has a length() method.',
    w: {
      a: 'nums.length would print 3, but nums.length() does not compile.',
      c: '3 is the length; 2 is the last valid index.',
      d: 'The compiler rejects the unknown method before any code runs.',
    },
    h: 'Arrays and String spell this differently.',
    v: COMPILE_ERR,
  },
  {
    id: '005',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String s = "hello";
        s.toUpperCase();
        System.out.println(s);
    }
}`,
    o: { a: 'HELLO', b: 'hello', c: 'Hello', d: 'Compilation error' },
    a: 'b',
    e: 'String is immutable. toUpperCase() returns a new String and leaves the original untouched; the return value is discarded here, so s still refers to "hello".',
    w: {
      a: 'You would need to reassign: s = s.toUpperCase().',
      c: 'Nothing in the code capitalises only the first letter.',
      d: 'Calling a method and ignoring its result is legal Java, just pointless.',
    },
    h: 'Does any String method modify the string it is called on?',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String s = "hello";
        System.out.println(s.substring(1, 3));
    }
}`,
    o: { a: 'ell', b: 'el', c: 'he', d: 'llo' },
    a: 'b',
    e: 'substring(begin, end) includes begin and excludes end, so indices 1 and 2 are taken: "el".',
    w: {
      a: '"ell" would be substring(1, 4) — the end index is exclusive.',
      c: '"he" is substring(0, 2).',
      d: '"llo" is substring(2).',
    },
    h: 'Is the second argument inclusive or exclusive?',
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
        String a = "java";
        String b = "java";
        String c = new String("java");
        System.out.println((a == b) + " " + (a == c) + " " + a.equals(c));
    }
}`,
    o: {
      a: 'true true true',
      b: 'true false true',
      c: 'false false true',
      d: 'true false false',
    },
    a: 'b',
    e: 'Identical String literals are interned, so a and b point at the same object and a == b is true. new String(...) forces a separate object, so a == c is false. equals() compares characters, so a.equals(c) is true.',
    w: {
      a: 'new String("java") deliberately creates a distinct object, so a == c cannot be true.',
      c: 'Literals are pooled, so a == b is true.',
      d: 'equals() compares content, not identity, so a.equals(c) is true.',
    },
    h: 'Two of these three refer to the same pooled object; the third does not.',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int[][] grid = new int[2][3];
        System.out.println(grid.length + " " + grid[0].length);
    }
}`,
    o: { a: '2 3', b: '3 2', c: '6 6', d: '2 2' },
    a: 'a',
    e: 'A 2D array is an array of arrays. grid.length is the number of rows (2) and grid[0].length is the length of the first row (3).',
    w: {
      b: 'The first dimension in new int[2][3] is the row count, so grid.length is 2.',
      c: '6 is the total element count, which no single length expression reports.',
      d: 'grid[0].length is the row width, 3, not the row count.',
    },
    h: 'Which dimension does the outer length describe?',
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String csv = "a,b,,c";
        System.out.println(csv.split(",").length);
    }
}`,
    o: { a: '3', b: '4', c: '5', d: '2' },
    a: 'b',
    e: 'split keeps empty strings that appear between separators, so the result is ["a", "b", "", "c"] — four elements. Only trailing empty strings are dropped.',
    w: {
      a: '3 assumes the empty field between the two commas is discarded, but only trailing empties are.',
      c: '5 would need an extra separator; there are three commas, so at most four fields.',
      d: '2 would require split to collapse consecutive separators, which it does not.',
    },
    h: 'split drops trailing empty strings, but not empty strings in the middle.',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println("10" + 5);
        System.out.println(10 + 5);
    }
}`,
    o: { a: '15 then 15', b: '105 then 15', c: '105 then 105', d: 'Compilation error' },
    a: 'b',
    e: 'When either operand of + is a String, + concatenates: "10" + 5 gives "105". With two ints it adds: 10 + 5 gives 15.',
    w: {
      a: 'Java never parses "10" into a number implicitly — you would need Integer.parseInt.',
      c: 'The second statement has no String operand, so it is ordinary addition.',
      d: 'Concatenating a String with an int is valid; the int is converted to its text form.',
    },
    h: 'The + operator does two different jobs depending on operand types.',
    v: out('105\n15'),
  },
  {
    id: '011',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        StringBuilder sb = new StringBuilder("abc");
        sb.append("de").reverse();
        System.out.println(sb);
    }
}`,
    o: { a: 'abcde', b: 'edcba', c: 'cbade', d: 'abc' },
    a: 'b',
    e: 'StringBuilder is mutable and its methods return the same builder, so the calls chain: "abc" becomes "abcde", then reverse() flips it in place to "edcba".',
    w: {
      a: 'reverse() mutates the builder, so the printed value is not the appended order.',
      c: 'reverse() is applied after the append, so it reverses the whole "abcde", not just "abc".',
      d: 'Unlike String, StringBuilder mutates itself — the append is not discarded.',
    },
    h: 'Both calls act on the same object, in order.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String s = "Hello";
        System.out.println(s.replace('l', 'L'));
    }
}`,
    o: { a: 'HeLlo', b: 'HeLLo', c: 'Hello', d: 'HELLO' },
    a: 'b',
    e: 'replace replaces every occurrence, not just the first, so both lowercase l characters become L: "HeLLo".',
    w: {
      a: 'Only replaceFirst-style behaviour would change a single occurrence; replace changes all of them.',
      c: 'replace returns a new String, and here it is passed straight to println, so the change is visible.',
      d: 'Only the l characters are touched; the rest of the string keeps its case.',
    },
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        char[] letters = {'J', 'a', 'v', 'a'};
        System.out.println(letters);
    }
}`,
    o: {
      a: 'Java',
      b: '[C@1b6d3586 (an object hash)',
      c: '[J, a, v, a]',
      d: 'Compilation error',
    },
    a: 'a',
    e: 'println is overloaded with a char[] version that prints the characters directly, so this prints Java. Any other array type would fall through to println(Object) and print a type-and-hash string.',
    w: {
      b: 'That is what you get for, say, an int[] — or for "" + letters, which selects String concatenation instead of the char[] overload.',
      c: 'Arrays.toString(letters) produces that bracketed form; println does not.',
      d: 'The char[] overload of println exists precisely for this case.',
    },
    h: 'println has one array overload. Which element type is it for?',
    v: JAVA_OUT,
  },
  {
    id: '014',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String s = "banana";
        System.out.println(s.indexOf("na") + " " + s.lastIndexOf("na"));
    }
}`,
    o: { a: '2 4', b: '2 2', c: '4 2', d: '1 5' },
    a: 'a',
    e: '"banana" has "na" starting at index 2 and again at index 4. indexOf scans from the left and returns 2; lastIndexOf scans from the right and returns 4.',
    w: {
      b: 'lastIndexOf finds the final occurrence, which starts at index 4.',
      c: 'The two results are printed in the order written: indexOf first.',
      d: 'Both methods return the index of the first character of the match, and indices are zero-based.',
    },
    v: JAVA_OUT,
  },
  {
    id: '015',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String s = "Java";
        System.out.println(s.charAt(2));
    }
}`,
    o: { a: 'a', b: 'v', c: 'J', d: 'IndexOutOfBoundsException' },
    a: 'b',
    e: 'Indexing is zero-based: J is 0, a is 1, v is 2. charAt(2) returns v.',
    w: {
      a: 'a is at index 1 (and 3).',
      c: 'J is at index 0.',
      d: 'Index 2 is well inside a four-character string.',
    },
    v: JAVA_OUT,
  },
];

export const l1Arrays = expand(1, 'l1-arrays', 'L1-ARR', seeds);
