import { expand, JAVA_OUT, out, type Seed } from './seed';

const seeds: Seed[] = [
  {
    id: '001',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.println(Math.round(-2.5));
        System.out.println(Math.round(2.5));
        System.out.println(Math.floor(-2.5));
    }
}`,
    o: {
      a: '-3, 3, -3.0',
      b: '-2, 3, -3.0',
      c: '-2, 2, -2.0',
      d: '-3, 3, -2.0',
    },
    a: 'b',
    e: 'Math.round breaks ties by rounding toward positive infinity, so -2.5 becomes -2 and 2.5 becomes 3. Math.floor always rounds down, giving -3.0 — and it returns a double, hence the decimal point.',
    w: {
      a: '-2.5 rounds up to -2 because Math.round adds 0.5 and floors, which favours positive infinity.',
      c: '2.5 rounds away to 3, not down to 2.',
      d: 'floor(-2.5) is -3.0; -2.0 would be the result of ceil or of truncation.',
    },
    h: 'Math.round is defined as floor(x + 0.5). Apply that to both values.',
    v: out('-2\n3\n-3.0'),
  },
  {
    id: '002',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        System.out.printf("%.2f%n", 3.14159);
        System.out.printf("%5d|%n", 42);
        System.out.printf("%-5d|%n", 42);
    }
}`,
    o: {
      a: '3.14 / "   42|" / "42   |"',
      b: '3.14159 / "42|" / "42|"',
      c: '3.142 / "42   |" / "   42|"',
      d: '3.14 / "42   |" / "   42|"',
    },
    a: 'a',
    e: '%.2f rounds to two decimals. %5d pads to width 5, right-aligned by default, so 42 gets three leading spaces. The minus flag in %-5d left-aligns instead, putting the padding after the number.',
    w: {
      b: 'A precision of 2 truncates the display to 3.14, and the width specifiers do pad.',
      c: '%.2f gives two decimal places, not three, and the alignment is reversed.',
      d: 'Without a minus flag the padding goes on the left, so %5d is right-aligned.',
    },
    h: 'The minus flag controls which side the padding goes on.',
    v: out('3.14\n   42|\n42   |'),
  },
  {
    id: '003',
    d: 'medium',
    k: 'output',
    p: 'What does this program print?',
    c: `
import java.util.Arrays;

class Main {
    public static void main(String[] args) {
        int[] a = {3, 1, 2};
        int[] b = a;
        Arrays.sort(b);
        System.out.println(Arrays.toString(a) + " " + (a == b));
    }
}`,
    o: {
      a: '[3, 1, 2] false',
      b: '[1, 2, 3] true',
      c: '[3, 1, 2] true',
      d: '[1, 2, 3] false',
    },
    a: 'b',
    e: 'b = a copies the reference, so there is one array. Arrays.sort sorts it in place and the change is visible through a. Both names still point at the same object, so == is true.',
    w: {
      a: 'No copy was made, so a sees the sorted order and the references are identical.',
      c: 'Arrays.sort mutates the array rather than returning a sorted copy.',
      d: 'Both variables reference the same array object.',
    },
    h: 'How many arrays exist, and does sort return a new one?',
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
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= 5; i++) {
            if (i % 15 == 0) {
                sb.append("FizzBuzz");
            } else if (i % 3 == 0) {
                sb.append("Fizz");
            } else if (i % 5 == 0) {
                sb.append("Buzz");
            } else {
                sb.append(i);
            }
            sb.append(" ");
        }
        System.out.println(sb.toString().trim());
    }
}`,
    o: {
      a: '1 2 Fizz 4 Buzz',
      b: '1 2 3 4 5',
      c: '1 2 Fizz 4 5',
      d: 'Fizz Buzz 1 2 4',
    },
    a: 'a',
    e: 'Only 3 and 5 are special in this range: 3 is divisible by 3 (Fizz) and 5 by 5 (Buzz). The order of the branches matters — the 15 test must come first, though no value here reaches it.',
    w: {
      b: 'The divisibility branches replace 3 and 5 with words.',
      c: '5 is divisible by 5, so it becomes Buzz.',
      d: 'Values are appended in loop order, not grouped.',
    },
    v: JAVA_OUT,
  },
  {
    id: '005',
    d: 'hard',
    k: 'output',
    p: 'What does this program print?',
    c: `
class Main {
    public static void main(String[] args) {
        String s = "a,b,c";
        String[] parts = s.split(",");
        StringBuilder sb = new StringBuilder();
        for (int i = parts.length - 1; i >= 0; i--) {
            sb.append(parts[i]);
            if (i > 0) {
                sb.append("-");
            }
        }
        System.out.println(sb);
    }
}`,
    o: { a: 'a-b-c', b: 'c-b-a', c: 'c-b-a-', d: '-c-b-a' },
    a: 'b',
    e: 'The loop walks the array backwards, appending each part, and adds a separator only when more parts remain. The result is "c-b-a" with no trailing dash.',
    w: {
      a: 'The loop counts down, so the order is reversed.',
      c: 'The i > 0 guard suppresses the separator after the last appended element.',
      d: 'The separator is appended after each element, not before.',
    },
    v: JAVA_OUT,
  },
  {
    id: '006',
    d: 'medium',
    k: 'sql',
    p: 'Given these two tables, how many rows does the query return?',
    c: `-- employees              departments
-- id | dept_id            id | name
--  1 |      10            10 | Engineering
--  2 |      10            20 | Sales
--  3 |      20
--  4 |    NULL

SELECT COUNT(*)
FROM employees e
INNER JOIN departments d ON e.dept_id = d.id;`,
    lang: 'sql',
    o: { a: '4', b: '3', c: '2', d: '5' },
    a: 'b',
    e: 'An INNER JOIN keeps only rows where the condition is true. Employees 1, 2 and 3 match a department; employee 4 has a NULL dept_id, and NULL = 10 is UNKNOWN rather than true, so that row is dropped. The count is 3.',
    w: {
      a: '4 would be the LEFT JOIN result, which keeps the unmatched employee with NULL department columns.',
      c: '2 is the number of departments, not the number of matched employee rows.',
      d: '5 exceeds the number of employee rows.',
    },
    h: 'What does NULL = 10 evaluate to in SQL?',
  },
  {
    id: '007',
    d: 'medium',
    k: 'sql',
    p: 'Given this table, what does the query return?',
    c: `-- scores
-- value
--    10
--  NULL
--    20

SELECT COUNT(*), COUNT(value), SUM(value), AVG(value)
FROM scores;`,
    lang: 'sql',
    o: {
      a: '3, 3, 30, 10',
      b: '3, 2, 30, 15',
      c: '2, 2, 30, 15',
      d: '3, 2, NULL, NULL',
    },
    a: 'b',
    e: 'COUNT(*) counts rows, including the NULL one, giving 3. COUNT(value) counts non-NULL values, giving 2. SUM and AVG both ignore NULLs, so the sum is 30 and the average is 30/2 = 15 — not 30/3.',
    w: {
      a: 'COUNT(column) skips NULLs, and AVG divides by the non-NULL count, giving 15.',
      c: 'COUNT(*) counts every row regardless of NULLs, so it is 3.',
      d: 'Aggregates skip NULLs rather than being poisoned by them.',
    },
    h: 'Two of these four treat the NULL row differently from the others.',
  },
  {
    id: '008',
    d: 'medium',
    k: 'sql',
    p: 'Given this table, what does the query return?',
    c: `-- orders
-- customer | amount
--        A |     10
--        A |     20
--        B |      5
--        C |     40

SELECT customer, SUM(amount) AS total
FROM orders
GROUP BY customer
HAVING SUM(amount) > 15
ORDER BY total DESC;`,
    lang: 'sql',
    o: {
      a: 'C 40, then A 30',
      b: 'A 30, then C 40',
      c: 'A 30, B 5, C 40',
      d: 'C 40, A 30, B 5',
    },
    a: 'a',
    e: 'GROUP BY collapses the two A rows into a total of 30. HAVING filters the groups, dropping B (5). ORDER BY total DESC then puts C (40) ahead of A (30).',
    w: {
      b: 'The ordering is descending, so the larger total comes first.',
      c: 'HAVING removes group B because its total is not greater than 15.',
      d: 'B is filtered out by the HAVING clause.',
    },
    h: 'Apply the clauses in execution order: GROUP BY, then HAVING, then ORDER BY.',
  },
  {
    id: '009',
    d: 'medium',
    k: 'sql',
    p: 'A table has 10 rows, 4 of which have a NULL `email`. How many rows does this query return?',
    c: `SELECT * FROM users WHERE email = NULL;`,
    lang: 'sql',
    o: { a: '4', b: '6', c: '0', d: '10' },
    a: 'c',
    e: 'Any comparison with NULL using = yields UNKNOWN, never true, so WHERE filters every row out. The correct form is WHERE email IS NULL.',
    w: {
      a: '4 is what IS NULL would return.',
      b: '6 is what IS NOT NULL would return.',
      d: 'The predicate is never true, so no rows survive.',
    },
    h: 'NULL means "unknown", so what is the result of comparing it to anything?',
  },
  {
    id: '010',
    d: 'hard',
    k: 'sql',
    p: 'What is the difference between WHERE and HAVING?',
    c: `SELECT dept, COUNT(*) AS headcount
FROM employees
WHERE active = 1
GROUP BY dept
HAVING COUNT(*) > 5;`,
    lang: 'sql',
    o: {
      a: 'They are interchangeable; HAVING is just older syntax',
      b: 'WHERE filters individual rows before grouping; HAVING filters groups after aggregation',
      c: 'WHERE works on numbers and HAVING on text',
      d: 'HAVING filters rows and WHERE filters groups',
    },
    a: 'b',
    e: 'WHERE runs before GROUP BY, so it can reduce which rows are grouped but cannot reference an aggregate. HAVING runs after grouping, so it can test COUNT(*), SUM(...) and friends. Here WHERE drops inactive employees and HAVING drops small departments.',
    w: {
      a: 'They operate at different stages of query execution and are not interchangeable.',
      c: 'Neither clause cares about data type; the difference is when it is applied.',
      d: 'That is exactly backwards.',
    },
    h: 'Think about the order in which SQL evaluates clauses.',
  },
  {
    id: '011',
    d: 'medium',
    k: 'react',
    p: 'A user clicks the button once. What does the counter show afterwards?',
    c: `function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(count + 1);
    setCount(count + 1);
  }

  return <button onClick={handleClick}>{count}</button>;
}`,
    lang: 'tsx',
    o: { a: '2', b: '1', c: '0', d: 'It throws an error' },
    a: 'b',
    e: 'count is captured from the render that produced this handler, so both calls compute 0 + 1 and the second overwrites the first. React batches the updates and renders once with 1. Passing an updater function — setCount(c => c + 1) twice — would give 2.',
    w: {
      a: '2 requires the functional updater form, which reads the latest pending value rather than the captured one.',
      c: 'One update does apply, so the count is not left at 0.',
      d: 'Calling a setter twice is perfectly legal.',
    },
    h: 'What value does the closure over `count` hold during this render?',
  },
  {
    id: '012',
    d: 'medium',
    k: 'react',
    p: 'An array `items` is empty. What does this component render?',
    c: `function List({ items }) {
  return (
    <div>
      {items.length && <ul>{items.map((i) => <li key={i.id}>{i.name}</li>)}</ul>}
    </div>
  );
}`,
    lang: 'tsx',
    o: {
      a: 'Nothing inside the div',
      b: 'The literal text 0',
      c: 'An empty <ul>',
      d: 'It throws an error',
    },
    a: 'b',
    e: 'items.length is 0, and && returns that 0 rather than a boolean. React skips rendering false, null and undefined but does render the number 0, so a stray "0" appears. Use items.length > 0 && ... instead.',
    w: {
      a: 'React would skip a false value, but 0 is a renderable number.',
      c: 'The && short-circuits before the <ul> is ever created.',
      d: 'Rendering a number is valid; it just is not what was intended.',
    },
    h: 'What exactly does `0 && x` evaluate to in JavaScript, and how does React treat that value?',
  },
  {
    id: '013',
    d: 'medium',
    k: 'react',
    p: 'When does this effect run?',
    c: `useEffect(() => {
  fetchData(userId);
}, [userId]);`,
    lang: 'tsx',
    o: {
      a: 'After every render',
      b: 'Once after the first render only',
      c: 'After the first render, and again whenever userId changes between renders',
      d: 'Before the first render, synchronously',
    },
    a: 'c',
    e: 'A dependency array makes the effect re-run only when one of its values changes (compared with Object.is), plus the initial run after mount. An empty array would mean mount only; omitting the array entirely would mean every render.',
    w: {
      a: 'That is the behaviour when the dependency array is omitted altogether.',
      b: 'That is the behaviour of an empty array, [].',
      d: 'Effects run after the DOM has been updated, never before the first render.',
    },
    h: 'The array controls re-runs; the initial run happens regardless.',
  },
  {
    id: '014',
    d: 'medium',
    k: 'react',
    p: 'Why does this list produce a React warning, and what goes wrong without a stable key?',
    c: `{todos.map((todo, index) => (
  <TodoItem key={index} todo={todo} />
))}`,
    lang: 'tsx',
    o: {
      a: 'Nothing is wrong — the array index is the recommended key',
      b: 'Keys must be strings, so the number must be converted',
      c: 'An index is not tied to the item, so inserting or reordering makes React reuse the wrong component state',
      d: 'Keys are only needed on plain DOM elements, not components',
    },
    a: 'c',
    e: 'React uses the key to match an element to the component instance it rendered last time. An index shifts when items are inserted, removed or reordered, so state such as an input value or a selection can follow the wrong row. Use a stable id from the data.',
    w: {
      a: 'An index is only safe when the list is static, never reordered and never filtered.',
      b: 'Numbers are valid keys; React coerces them. The problem is stability, not type.',
      d: 'Keys are required on any element produced by a list, component or DOM node alike.',
    },
    h: 'Think about what happens to every index when an item is inserted at the front.',
  },
];

export const l3Screening = expand(3, 'l3-screening', 'L3-SCR', seeds);
