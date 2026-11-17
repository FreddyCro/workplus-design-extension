import test from 'node:test';
import assert from 'node:assert/strict';
import { sortIssues } from '../src/ui/sort.js';

const I = [
  { serialNumber: 2, title: 'b', dueDate: 300, priority: 'LOW' },
  { serialNumber: 10, title: 'a', dueDate: null, priority: 'HIGH' },
  { serialNumber: 5, title: 'c', dueDate: 100, priority: null },
  { serialNumber: 7, title: 'd', dueDate: 100, priority: 'HIGH' },
];
const sn = (key) => sortIssues([...I], key).map((i) => i.serialNumber);

test('編號用數字比較，不是字串', () => {
  assert.deepEqual(sn('serial-desc'), [10, 7, 5, 2]);
  assert.deepEqual(sn('serial-asc'), [2, 5, 7, 10]);
});
test('截止日期近到遠，沒日期排最後，同日用編號新到舊', () => {
  assert.deepEqual(sn('due'), [7, 5, 2, 10]);
});
test('優先級高到低，沒有優先級排最後', () => {
  assert.deepEqual(sn('priority'), [10, 7, 2, 5]);
});
test('不認得的排序用預設', () => {
  assert.deepEqual(sn('nope'), [10, 7, 5, 2]);
});
