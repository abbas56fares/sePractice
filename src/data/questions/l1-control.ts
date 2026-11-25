import { expand, JAVA_OUT, COMPILE_ERR, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int sum = 0;
        for (int i = 1; i <= 5; i++) {
            sum += i;
        }
        System.out.println(sum);
    }
}`,
    o: { a: '10', b: '15', c: '14', d: '21' },
    a: 'b',
    e: 'The loop runs for i = 1,2,3,4,5 because the condition is i <= 5. The sum is 1+2+3+4+5 = 15.',
    w: {
      a: '10 is 1+2+3+4, which would be the answer if the condition were i < 5.',
      c: '14 skips the first iteration (2+3+4+5).',
      d: '21 adds a sixth iteration (1..6), but i stops at 5.',
    },
    h: 'Write out every value i takes, including the last one.',
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int day = 3;
        String s = "";
        switch (day) {
            case 2: s += "Tue";
            case 3: s += "Wed";
            case 4: s += "Thu";
                break;
            default: s += "Other";
        }
        System.out.println(s);
    }
}`,
    o: { a: 'Wed', b: 'WedThu', c: 'TueWedThu', d: 'WedThuOther' },
    a: 'b',
    e: 'Execution enters at case 3 and falls through into case 4 because case 3 has no break. The break at the end of case 4 stops it, so "Wed" and "Thu" are both appended.',
    w: {
      a: 'Only a break (or the end of the switch) stops fall-through, and case 3 has neither.',
      c: 'case 2 is never entered — fall-through only moves forward from the matched label.',
      d: 'The break in case 4 exits the switch before default is reached.',
    },
    h: 'A case without break falls through to the next one.',
    v: JAVA_OUT,
  },
  {
    id: '003',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int i = 10;
        do {
            System.out.println(i);
            i++;
        } while (i < 5);
    }
}`,
    o: { a: 'Nothing', b: '10', c: '10 11 12 13 14', d: 'It loops forever' },
    a: 'b',
    e: 'A do-while checks its condition after the body, so the body always runs at least once. It prints 10, then i becomes 11, the condition 11 < 5 is false, and the loop ends.',
    w: {
      a: 'A plain while loop would print nothing here, but do-while tests the condition only after executing the body.',
      c: 'The condition is false immediately after the first pass, so there is no second iteration.',
      d: 'i increases, moving away from the condition, so the loop terminates after one pass.',
    },
    h: 'Where is the condition of a do-while checked?',
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int count = 0;
        for (int i = 0; i < 10; i++) {
            if (i % 3 == 0) continue;
            if (i == 7) break;
            count++;
        }
        System.out.println(count);
    }
}`,
    o: { a: '4', b: '5', c: '6', d: '7' },
    a: 'a',
    e: 'i = 0, 3, 6 are skipped by continue. i = 7 breaks out before count++ runs. That leaves i = 1, 2, 4, 5 incrementing count, so count is 4.',
    w: {
      b: '5 would count i = 7 as well, but break exits before count++ on that iteration.',
      c: '6 ignores that the loop stops early at i = 7.',
      d: '7 counts every i except the multiples of 3 up to 9, ignoring the break entirely.',
    },
    h: 'Walk i from 0 to 9 and mark which iterations reach count++.',
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
        int c = 0;
        for (int i = 0; i < 3; i++) {
            for (int j = i; j < 3; j++) {
                c++;
            }
        }
        System.out.println(c);
    }
}`,
    o: { a: '9', b: '6', c: '3', d: '5' },
    a: 'b',
    e: 'The inner loop starts at j = i, so it runs 3 times when i = 0, 2 times when i = 1 and once when i = 2. Total 3 + 2 + 1 = 6.',
    w: {
      a: '9 would be the count if the inner loop always started at j = 0.',
      c: '3 counts only the outer loop iterations.',
      d: '5 is off by one — the triangular sum of 3 is 6.',
    },
    h: 'The inner loop length changes on every outer iteration.',
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'hard',
    k: 'bug',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int i = 0;
        for (int j = 0; j < 5; j++);
            i++;
        System.out.println(i);
    }
}`,
    o: { a: '5', b: '1', c: '0', d: '6' },
    a: 'b',
    e: 'The semicolon right after the for header makes the loop body an empty statement. The indented i++ is not part of the loop at all — it runs once after the loop finishes, so i is 1.',
    w: {
      a: '5 is what the indentation suggests, but indentation is not syntax in Java. The stray semicolon already ended the loop body.',
      c: 'i++ does execute — once — after the loop.',
      d: '6 would require six increments; only one happens.',
    },
    h: 'Read the character immediately after the closing parenthesis of the for header.',
    v: JAVA_OUT,
  },
  {
    id: '007',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int sum = 0;
        for (int i = 5; i > 0; i -= 2) {
            sum += i;
        }
        System.out.println(sum);
    }
}`,
    o: { a: '9', b: '8', c: '6', d: '15' },
    a: 'a',
    e: 'i takes the values 5, 3 and 1 (the next value, -1, fails the condition). The sum is 5 + 3 + 1 = 9.',
    w: {
      b: '8 would be 5 + 3, missing the final i = 1 iteration.',
      c: '6 would be 5 + 1 or 3 + 3 — neither matches the actual sequence.',
      d: '15 is 1+2+3+4+5, which would require a step of 1.',
    },
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
        int x = 10;
        if (x = 5) {
            System.out.println("five");
        }
    }
}`,
    o: {
      a: 'It prints five',
      b: 'It prints nothing',
      c: 'It fails to compile because int cannot be converted to boolean',
      d: 'It fails to compile because x is already initialised',
    },
    a: 'c',
    e: 'x = 5 is an assignment whose value is the int 5. An if condition must be a boolean, and Java performs no int-to-boolean conversion, so the compiler rejects it. (In C this would compile and be truthy.)',
    w: {
      a: 'The program never compiles, so nothing is printed.',
      b: 'A compile failure is not the same as running silently — there is no runnable program at all.',
      d: 'Reassigning a non-final local variable is perfectly legal; the problem is the condition type.',
    },
    h: 'What type must the expression inside if(...) have?',
    v: COMPILE_ERR,
  },
  {
    id: '009',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String role = "admin";
        String label;
        switch (role) {
            case "user":
                label = "Standard";
                break;
            case "admin":
            case "root":
                label = "Elevated";
                break;
            default:
                label = "Unknown";
        }
        System.out.println(label);
    }
}`,
    o: { a: 'Standard', b: 'Elevated', c: 'Unknown', d: 'Compilation error' },
    a: 'b',
    e: 'Java has supported String in switch since Java 7, and it matches with equals(). "admin" is an empty case that falls straight into "root", whose body assigns "Elevated".',
    w: {
      a: 'The "user" case does not match and ends with a break anyway.',
      c: 'default is only reached when no case label matches.',
      d: 'Switching on a String is legal; stacked case labels sharing one body are also legal.',
    },
    h: 'Two case labels can share a single body.',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int n = 0;
        while (n < 3) {
            n++;
            if (n == 2) {
                continue;
            }
            System.out.print(n);
        }
    }
}`,
    o: { a: '13', b: '123', c: '12', d: 'It loops forever' },
    a: 'a',
    e: 'n is incremented before the check, so the values printed are 1 and 3; the continue on n == 2 skips that single print. Output is 13.',
    w: {
      b: 'The continue skips the print for n == 2.',
      c: '3 is also printed — the loop continues after the skipped iteration.',
      d: 'n++ runs before the continue, so the loop still makes progress and terminates.',
    },
    h: 'Check whether the increment happens before or after the continue.',
    v: JAVA_OUT,
  },
  {
    id: '011',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int score = 72;
        String grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : "F";
        System.out.println(grade);
    }
}`,
    o: { a: 'A', b: 'B', c: 'C', d: 'F' },
    a: 'c',
    e: 'The conditional operator is right-associative, so this reads as a chain of else-ifs. 72 fails >= 90 and >= 80 but passes >= 70, giving "C".',
    w: {
      a: '72 is not >= 90.',
      b: '72 is not >= 80.',
      d: 'The "F" branch is only reached when every preceding test fails, and score >= 70 succeeds.',
    },
    h: 'Read the nested ternary as if/else if/else, top to bottom.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int evens = 0;
        for (int i = 1; i <= 10; i++) {
            if (i % 2 == 0) {
                evens++;
            }
        }
        System.out.println(evens);
    }
}`,
    o: { a: '4', b: '5', c: '6', d: '10' },
    a: 'b',
    e: 'Between 1 and 10 inclusive the even numbers are 2, 4, 6, 8 and 10 — five of them.',
    w: {
      a: '4 would exclude 10, but the condition is i <= 10 so 10 is included.',
      c: '6 would count an extra value; there are only five evens in 1..10.',
      d: '10 is the number of loop iterations, not the number of even values.',
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
        int i = 0;
        int total = 0;
        while (i++ < 3) {
            total += i;
        }
        System.out.println(i + " " + total);
    }
}`,
    o: { a: '3 6', b: '4 6', c: '4 3', d: '3 3' },
    a: 'b',
    e: 'i++ compares the old value then increments. The condition passes for old values 0, 1, 2 — inside the body i is already 1, 2, 3, so total is 6. The fourth test compares 3 (fails) but still increments i to 4.',
    w: {
      a: 'The failing test still increments i, so i ends at 4, not 3.',
      c: 'total accumulates the post-increment values 1 + 2 + 3 = 6, not 3.',
      d: 'Both parts are wrong: i ends at 4 and total is 6.',
    },
    h: 'The increment in the condition happens even on the iteration that fails.',
    v: JAVA_OUT,
  },
  {
    id: '014',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        for (int i = 0; i < 3; i++) {
            System.out.print(i);
        }
        System.out.println();
    }
}`,
    o: { a: '123', b: '012', c: '0123', d: '0 1 2' },
    a: 'b',
    e: 'i starts at 0 and the condition stops it before 3, so 0, 1 and 2 are printed with no separator: 012.',
    w: {
      a: 'The loop starts at 0, not 1.',
      c: 'i < 3 excludes 3.',
      d: 'print adds no separator between values.',
    },
    v: JAVA_OUT,
  },
];

export const l1Control = expand(1, 'l1-control', 'L1-CTL', seeds);
