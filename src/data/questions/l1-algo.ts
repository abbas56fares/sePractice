import { expand, JAVA_OUT, throws, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'easy',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int[] a = {3, 7, 2, 8};
        int sum = 0;
        for (int i = 0; i < a.length; i++) {
            sum += a[i];
        }
        System.out.println(sum);
    }
}`,
    o: { a: '20', b: '18', c: '4', d: '12' },
    a: 'a',
    e: 'The loop visits every index from 0 to 3 and accumulates 3 + 7 + 2 + 8 = 20.',
    w: {
      b: '18 would miss the first element.',
      c: '4 is the array length, not the sum.',
      d: '12 omits the final 8.',
    },
    v: JAVA_OUT,
  },
  {
    id: '002',
    d: 'medium',
    k: 'bug',
    p: 'This method is meant to return the highest temperature. What does it print, and why is that a bug?',
    c: `
class Main {
    public static void main(String[] args) {
        int[] temps = {-5, -2, -9};
        int max = 0;
        for (int t : temps) {
            if (t > max) {
                max = t;
            }
        }
        System.out.println(max);
    }
}`,
    o: { a: '-2', b: '-9', c: '0', d: '-5' },
    a: 'c',
    e: 'No element beats the seed value of 0, so max never changes and 0 is printed — a value that is not even in the array. The fix is to seed max with temps[0] (or Integer.MIN_VALUE).',
    w: {
      a: '-2 is the true maximum, but the code cannot reach it because every candidate loses to 0.',
      b: '-9 is the minimum, which this loop never selects.',
      d: '-5 is the first element, but it is never assigned because -5 > 0 is false.',
    },
    h: 'Is the initial value of max a possible answer for this input?',
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
        int a = 1;
        int b = 2;
        int temp = a;
        a = b;
        b = temp;
        System.out.println(a + "" + b);
    }
}`,
    o: { a: '12', b: '21', c: '33', d: '11' },
    a: 'b',
    e: 'The temp variable holds the old a while b is copied into it, so the two values swap: a is 2 and b is 1. Concatenating gives "21".',
    w: {
      a: '12 is the order before the swap.',
      c: '33 would be the sum, but "" makes + concatenate rather than add.',
      d: '11 would mean a was overwritten before being saved — exactly the bug temp prevents.',
    },
    v: JAVA_OUT,
  },
  {
    id: '004',
    d: 'hard',
    k: 'bug',
    p: 'This loop is supposed to reverse the array. What does it actually print?',
    c: `
import java.util.Arrays;

class Main {
    public static void main(String[] args) {
        int[] a = {1, 2, 3, 4};
        for (int i = 0; i < a.length; i++) {
            int t = a[i];
            a[i] = a[a.length - 1 - i];
            a[a.length - 1 - i] = t;
        }
        System.out.println(Arrays.toString(a));
    }
}`,
    o: { a: '[4, 3, 2, 1]', b: '[1, 2, 3, 4]', c: '[4, 2, 3, 1]', d: '[1, 3, 2, 4]' },
    a: 'b',
    e: 'Each pair is swapped twice — once from the left half and again from the right half — so the array is reversed and then reversed back. The loop must stop at a.length / 2.',
    w: {
      a: 'That is the intended result, which you only get by halving the loop bound.',
      c: 'Every pair is double-swapped, not just the outer one.',
      d: 'The inner pair is also restored by its second swap.',
    },
    h: 'Count how many times the pair (0, 3) gets swapped.',
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int find(int[] a, int target) {
        for (int i = 0; i < a.length; i++) {
            if (a[i] == target) {
                return i;
            }
        }
        return -1;
    }

    public static void main(String[] args) {
        int[] data = {4, 8, 15};
        System.out.println(find(data, 15) + " " + find(data, 9));
    }
}`,
    o: { a: '15 -1', b: '2 -1', c: '3 0', d: '2 0' },
    a: 'b',
    e: 'A linear search returns the index of the match, and 15 sits at index 2. For a value that is absent the sentinel -1 is returned.',
    w: {
      a: 'The method returns the index, not the element.',
      c: 'Indices are zero-based, so 15 is at 2, and a miss returns -1 rather than 0.',
      d: '0 is a valid index, which is why -1 is used as the "not found" sentinel.',
    },
    h: 'What exactly does the method return on a hit?',
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
        String s = "mississippi";
        int count = 0;
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == 's') {
                count++;
            }
        }
        System.out.println(count);
    }
}`,
    o: { a: '2', b: '3', c: '4', d: '5' },
    a: 'c',
    e: 'Spelling it out — m i s s i s s i p p i — there are four s characters.',
    w: {
      a: '2 counts only one of the two double-s pairs.',
      b: '3 misses one occurrence.',
      d: '5 is more than the word contains.',
    },
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
        int a = 0;
        int b = 1;
        for (int i = 0; i < 5; i++) {
            int t = a + b;
            a = b;
            b = t;
        }
        System.out.println(a);
    }
}`,
    o: { a: '3', b: '5', c: '8', d: '13' },
    a: 'b',
    e: 'This is the iterative Fibonacci shift. After five iterations the pair (a, b) has moved from (0, 1) to (5, 8), so a is 5.',
    w: {
      a: '3 is the value of a after four iterations.',
      c: '8 is b after five iterations, not a.',
      d: '13 is one step further still.',
    },
    h: 'Tabulate (a, b) after each iteration.',
    v: JAVA_OUT,
  },
  {
    id: '008',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static boolean isPalindrome(String s) {
        int i = 0;
        int j = s.length() - 1;
        while (i < j) {
            if (s.charAt(i) != s.charAt(j)) {
                return false;
            }
            i++;
            j--;
        }
        return true;
    }

    public static void main(String[] args) {
        System.out.println(isPalindrome("racecar") + " " + isPalindrome("java"));
    }
}`,
    o: { a: 'true false', b: 'false true', c: 'true true', d: 'false false' },
    a: 'a',
    e: 'The two pointers walk inward comparing characters. "racecar" matches at every step, so the loop ends and returns true; "java" fails on the first comparison (j vs a) and returns false.',
    w: {
      b: 'The results are printed in call order, and "racecar" is the palindrome.',
      c: '"java" reversed is "avaj", so it is not a palindrome.',
      d: '"racecar" reads the same in both directions.',
    },
    v: JAVA_OUT,
  },
  {
    id: '009',
    d: 'hard',
    k: 'output',
    p: 'What does this program print after a single bubble-sort pass?',
    c: `
import java.util.Arrays;

class Main {
    public static void main(String[] args) {
        int[] a = {5, 1, 4, 2};
        for (int i = 0; i < a.length - 1; i++) {
            if (a[i] > a[i + 1]) {
                int t = a[i];
                a[i] = a[i + 1];
                a[i + 1] = t;
            }
        }
        System.out.println(Arrays.toString(a));
    }
}`,
    o: { a: '[1, 2, 4, 5]', b: '[1, 4, 2, 5]', c: '[1, 4, 5, 2]', d: '[5, 4, 2, 1]' },
    a: 'b',
    e: 'One pass only guarantees that the largest value reaches the end. Tracing: 5,1 swap gives [1,5,4,2]; 5,4 swap gives [1,4,5,2]; 5,2 swap gives [1,4,2,5].',
    w: {
      a: 'A fully sorted array needs repeated passes, not one.',
      c: '[1, 4, 5, 2] is the state midway through the pass, before the last comparison.',
      d: 'The comparison swaps when the left value is larger, which moves large values right, not left.',
    },
    h: 'Carry the swapped value along as you continue the pass.',
    v: JAVA_OUT,
  },
  {
    id: '010',
    d: 'medium',
    k: 'bug',
    p: 'What happens when this program runs?',
    c: `
class Main {
    public static void main(String[] args) {
        int[] a = {1, 2, 3};
        int sum = 0;
        for (int i = 0; i <= a.length; i++) {
            sum += a[i];
        }
        System.out.println(sum);
    }
}`,
    o: {
      a: 'It prints 6',
      b: 'It prints 0',
      c: 'It throws ArrayIndexOutOfBoundsException',
      d: 'It fails to compile',
    },
    a: 'c',
    e: 'The condition i <= a.length lets i reach 3, which is one past the last valid index. The first three additions succeed and then a[3] throws ArrayIndexOutOfBoundsException. The fix is i < a.length.',
    w: {
      a: 'The sum does reach 6, but the loop then runs one extra iteration and throws before printing.',
      b: 'println is never reached at all.',
      d: 'The bound is a runtime value as far as the compiler is concerned, so this compiles.',
    },
    h: 'What is the largest value i reaches, and is it a valid index?',
    v: throws('ArrayIndexOutOfBoundsException'),
  },
  {
    id: '011',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        int n = 1234;
        int sum = 0;
        while (n > 0) {
            sum += n % 10;
            n /= 10;
        }
        System.out.println(sum);
    }
}`,
    o: { a: '1234', b: '10', c: '4', d: '24' },
    a: 'b',
    e: 'n % 10 peels off the last digit and n /= 10 drops it. The digits 4, 3, 2 and 1 are added, giving 10.',
    w: {
      a: '1234 is the original number, not its digit sum.',
      c: '4 is only the first digit extracted.',
      d: '24 would be the product of the digits, not the sum.',
    },
    h: 'This is the standard digit-extraction loop.',
    v: JAVA_OUT,
  },
  {
    id: '012',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    static int gcd(int a, int b) {
        return b == 0 ? a : gcd(b, a % b);
    }

    public static void main(String[] args) {
        System.out.println(gcd(48, 18));
    }
}`,
    o: { a: '2', b: '6', c: '18', d: '3' },
    a: 'b',
    e: 'Euclid’s algorithm: gcd(48,18) to gcd(18,12) to gcd(12,6) to gcd(6,0), which returns 6.',
    w: {
      a: '2 is a common divisor but not the greatest one.',
      c: '18 does not divide 48.',
      d: '3 is also a common divisor, but 6 is larger.',
    },
    h: 'Apply the recurrence until the second argument hits 0.',
    v: JAVA_OUT,
  },
  {
    id: '013',
    d: 'hard',
    k: 'bug',
    p: 'This code is meant to find the second-largest distinct value. What does it print for this input?',
    c: `
class Main {
    public static void main(String[] args) {
        int[] a = {4, 9, 1, 9, 7};
        int max = Integer.MIN_VALUE;
        int second = Integer.MIN_VALUE;
        for (int n : a) {
            if (n > max) {
                second = max;
                max = n;
            } else if (n > second) {
                second = n;
            }
        }
        System.out.println(second);
    }
}`,
    o: { a: '7', b: '9', c: '4', d: '-2147483648' },
    a: 'b',
    e: 'The duplicate 9 fails n > max but passes n > second, so it is accepted as the runner-up. second ends as 9, not the distinct runner-up 7. A guard such as else if (n > second && n != max) fixes it.',
    w: {
      a: '7 is the intended answer, but the duplicate 9 overwrites it before 7 is examined.',
      c: '4 is briefly the runner-up but is replaced by the second 9.',
      d: 'The sentinel is replaced on the very first iteration.',
    },
    h: 'Follow what happens when the second 9 is examined.',
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
        String s = "stream";
        System.out.println(new StringBuilder(s).reverse().toString());
    }
}`,
    o: { a: 'stream', b: 'maerts', c: 'STREAM', d: 'Compilation error' },
    a: 'b',
    e: 'StringBuilder.reverse() reverses the characters in place and returns the same builder, so "stream" becomes "maerts".',
    w: {
      a: 'The original String is untouched, but what is printed is the reversed builder.',
      c: 'reverse changes order, not case.',
      d: 'StringBuilder has a String constructor and a reverse method, so this is valid.',
    },
    v: JAVA_OUT,
  },
];

export const l1Algo = expand(1, 'l1-algo', 'L1-ALG', seeds);
