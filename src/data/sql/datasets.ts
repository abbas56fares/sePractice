/**
 * Practice databases.
 *
 * Three datasets, each small enough to reason about by eye but shaped to
 * expose the things the lessons teach:
 *
 *  - `joins`   the five-row pair from the JOIN lab, where the whole point is
 *              that you can check every join's output by hand
 *  - `company` employees / departments / locations / projects, with NULL
 *              foreign keys, a salary tie, a duplicate email, an empty
 *              department and an unreferenced location
 *  - `sales`   customers / orders / order_items / products, for aggregation,
 *              three-table joins, per-group top-N and "no matching row" work
 *
 * Every value here is also the answer key: the verification script runs each
 * exercise's reference query against these rows, so a dataset edit that breaks
 * a question is caught by `npm run verify:sql`.
 */

import type { SqlDataset } from '../../lib/sql';

/* ------------------------------------------------------------- joins lab */

/**
 * Deliberately tiny. Omar has no department and Finance has no employees, so
 * INNER / LEFT / RIGHT / FULL each produce a visibly different row count.
 */
export const joinsDataset: SqlDataset = {
  id: 'joins',
  name: 'Join lab',
  description:
    'Four employees and three departments. One employee has no department and one department has no employees, so every join type gives a different answer.',
  tables: [
    {
      name: 'employees',
      description: 'Four people. Omar is not assigned to a department.',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'name', type: 'text', nullable: false },
        {
          name: 'department_id',
          type: 'integer',
          references: 'departments.id',
          note: 'NULL when the employee is unassigned',
        },
      ],
      rows: [
        [1, 'Ali', 10],
        [2, 'Sara', 20],
        [3, 'Omar', null],
        [4, 'Maya', 30],
      ],
    },
    {
      name: 'departments',
      description: 'Three departments. Finance has nobody in it.',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'name', type: 'text', nullable: false },
      ],
      rows: [
        [10, 'IT'],
        [20, 'HR'],
        [40, 'Finance'],
      ],
    },
  ],
};

/* --------------------------------------------------------------- company */

export const companyDataset: SqlDataset = {
  id: 'company',
  name: 'Company',
  description:
    'Twelve employees across three staffed departments, plus locations, projects and the assignments linking people to projects.',
  tables: [
    {
      name: 'employees',
      description: 'One row per person. department_id and manager_id may be NULL.',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'name', type: 'text', nullable: false },
        {
          name: 'department_id',
          type: 'integer',
          references: 'departments.id',
          note: 'NULL for an unassigned employee',
        },
        { name: 'salary', type: 'numeric', nullable: false },
        { name: 'hire_date', type: 'date', nullable: false },
        {
          name: 'manager_id',
          type: 'integer',
          references: 'employees.id',
          note: 'Self-reference — NULL for the top of the tree',
        },
        { name: 'email', type: 'text', note: 'Not unique in this dataset, on purpose' },
      ],
      rows: [
        [1, 'Ali', 10, 4800, '2019-03-01', null, 'ali@corp.com'],
        [2, 'Sara', 20, 3900, '2020-07-15', 1, 'sara@corp.com'],
        [3, 'Omar', null, 2500, '2021-01-20', 1, 'omar@corp.com'],
        [4, 'Maya', 30, 5200, '2018-11-05', 1, 'maya@corp.com'],
        [5, 'Youssef', 10, 4800, '2020-02-10', 1, 'youssef@corp.com'],
        [6, 'Amira', 10, 3200, '2022-05-30', 1, 'amira@corp.com'],
        [7, 'Karim', 20, 2800, '2021-09-12', 2, 'karim@corp.com'],
        [8, 'Nadia', 30, 6100, '2017-04-18', 4, 'nadia@corp.com'],
        [9, 'Hassan', 30, 3500, '2023-01-09', 4, 'ali@corp.com'],
        [10, 'Rania', 10, 5600, '2019-08-22', 1, 'rania@corp.com'],
        [11, 'Tarek', 20, 3100, '2022-10-03', 2, 'tarek@corp.com'],
        [12, 'Dina', null, 4100, '2023-06-14', null, 'dina@corp.com'],
      ],
    },
    {
      name: 'departments',
      description: 'Finance has no employees — useful for LEFT JOIN ... IS NULL.',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'name', type: 'text', nullable: false },
        { name: 'location_id', type: 'integer', references: 'locations.id' },
        { name: 'budget', type: 'numeric' },
      ],
      rows: [
        [10, 'IT', 1, 500000],
        [20, 'HR', 2, 200000],
        [30, 'Sales', 1, 350000],
        [40, 'Finance', 3, 300000],
      ],
    },
    {
      name: 'locations',
      description: 'Lisbon has no departments.',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'city', type: 'text', nullable: false },
        { name: 'country', type: 'text', nullable: false },
      ],
      rows: [
        [1, 'London', 'UK'],
        [2, 'Berlin', 'Germany'],
        [3, 'Madrid', 'Spain'],
        [4, 'Lisbon', 'Portugal'],
      ],
    },
    {
      name: 'projects',
      description: 'Each project belongs to one department.',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'name', type: 'text', nullable: false },
        { name: 'department_id', type: 'integer', references: 'departments.id' },
        { name: 'budget', type: 'numeric' },
        { name: 'start_date', type: 'date' },
      ],
      rows: [
        [100, 'Website Rebuild', 10, 120000, '2023-01-15'],
        [101, 'Payroll Migration', 20, 60000, '2023-03-01'],
        [102, 'CRM Rollout', 30, 90000, '2022-09-10'],
        [103, 'Data Warehouse', 10, 150000, '2023-07-01'],
        [104, 'Office Move', 40, 40000, '2023-05-20'],
      ],
    },
    {
      name: 'employee_projects',
      description: 'The many-to-many link between employees and projects.',
      columns: [
        { name: 'employee_id', type: 'integer', references: 'employees.id' },
        { name: 'project_id', type: 'integer', references: 'projects.id' },
        { name: 'hours', type: 'integer' },
      ],
      rows: [
        [1, 100, 120],
        [1, 103, 80],
        [5, 100, 160],
        [6, 100, 40],
        [10, 103, 200],
        [2, 101, 90],
        [7, 101, 60],
        [4, 102, 140],
        [8, 102, 180],
        [9, 102, 30],
      ],
    },
  ],
};

/* ----------------------------------------------------------------- sales */

export const salesDataset: SqlDataset = {
  id: 'sales',
  name: 'Sales',
  description:
    'Eight customers, nine products and fifteen orders with their line items. Two customers have never ordered and two products have never sold.',
  tables: [
    {
      name: 'customers',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'name', type: 'text', nullable: false },
        { name: 'city', type: 'text' },
        { name: 'country', type: 'text' },
        { name: 'signup_date', type: 'date' },
      ],
      rows: [
        [1, 'Acme Ltd', 'London', 'UK', '2022-01-10'],
        [2, 'Borealis', 'Berlin', 'Germany', '2022-04-22'],
        [3, 'Cedar Co', 'Madrid', 'Spain', '2022-06-30'],
        [4, 'Delta Works', 'London', 'UK', '2023-02-14'],
        [5, 'Everest', 'Lisbon', 'Portugal', '2023-05-05'],
        [6, 'Fjord AB', 'Berlin', 'Germany', '2023-08-19'],
        [7, 'Granite', 'Dublin', 'Ireland', '2023-11-01'],
        [8, 'Harbour', 'London', 'UK', '2024-01-07'],
      ],
    },
    {
      name: 'products',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'name', type: 'text', nullable: false },
        { name: 'category', type: 'text' },
        { name: 'price', type: 'numeric' },
        { name: 'stock', type: 'integer' },
      ],
      rows: [
        [1, 'Laptop', 'Hardware', 1200, 25],
        [2, 'Monitor', 'Hardware', 300, 60],
        [3, 'Keyboard', 'Accessories', 80, 150],
        [4, 'Mouse', 'Accessories', 40, 200],
        [5, 'Docking Station', 'Hardware', 220, 35],
        [6, 'Webcam', 'Accessories', 95, 0],
        [7, 'Standing Desk', 'Furniture', 650, 12],
        [8, 'Desk Lamp', 'Furniture', 55, 80],
        [9, 'Cable Kit', 'Accessories', 25, 500],
      ],
    },
    {
      name: 'orders',
      description: 'Customers 7 and 8 have never ordered.',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'customer_id', type: 'integer', references: 'customers.id' },
        { name: 'order_date', type: 'date', nullable: false },
        { name: 'status', type: 'text' },
      ],
      rows: [
        [1001, 1, '2023-01-15', 'shipped'],
        [1002, 1, '2023-03-02', 'shipped'],
        [1003, 2, '2023-03-18', 'shipped'],
        [1004, 1, '2023-05-09', 'cancelled'],
        [1005, 3, '2023-06-21', 'shipped'],
        [1006, 1, '2023-07-30', 'shipped'],
        [1007, 2, '2023-08-11', 'pending'],
        [1008, 4, '2023-09-05', 'shipped'],
        [1009, 5, '2023-10-17', 'shipped'],
        [1010, 3, '2023-11-23', 'pending'],
        [1011, 4, '2024-01-12', 'shipped'],
        [1012, 1, '2024-02-28', 'shipped'],
        [1013, 6, '2024-03-14', 'shipped'],
        [1014, 2, '2024-04-02', 'cancelled'],
        [1015, 5, '2024-05-19', 'shipped'],
      ],
    },
    {
      name: 'order_items',
      description: 'Products 6 and 9 never appear here.',
      columns: [
        { name: 'id', type: 'integer', primaryKey: true },
        { name: 'order_id', type: 'integer', references: 'orders.id' },
        { name: 'product_id', type: 'integer', references: 'products.id' },
        { name: 'quantity', type: 'integer' },
        { name: 'unit_price', type: 'numeric' },
      ],
      rows: [
        [1, 1001, 1, 2, 1200],
        [2, 1001, 3, 2, 80],
        [3, 1002, 2, 3, 300],
        [4, 1003, 1, 1, 1200],
        [5, 1003, 4, 5, 40],
        [6, 1004, 7, 1, 650],
        [7, 1005, 2, 2, 300],
        [8, 1005, 5, 1, 220],
        [9, 1006, 3, 10, 75],
        [10, 1007, 8, 4, 55],
        [11, 1008, 1, 1, 1200],
        [12, 1008, 2, 1, 300],
        [13, 1009, 7, 2, 650],
        [14, 1010, 4, 10, 38],
        [15, 1011, 5, 3, 220],
        [16, 1012, 1, 1, 1150],
        [17, 1012, 8, 2, 55],
        [18, 1013, 2, 4, 300],
        [19, 1014, 3, 1, 80],
        [20, 1015, 7, 1, 650],
      ],
    },
  ],
};

export const SQL_DATASETS: SqlDataset[] = [joinsDataset, companyDataset, salesDataset];

const BY_ID = new Map(SQL_DATASETS.map((d) => [d.id, d]));

export function getDataset(id: string): SqlDataset | undefined {
  return BY_ID.get(id);
}

/** Falls back to the company dataset so a bad reference never crashes a page. */
export function datasetOr(id: string | undefined): SqlDataset {
  return (id ? BY_ID.get(id) : undefined) ?? companyDataset;
}
