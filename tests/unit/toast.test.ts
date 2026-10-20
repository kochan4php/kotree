import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dismissToast, getToasts, toast } from '../../src/lib/toast.ts';

test('toasts queue, cap at three and dismiss by id', () => {
  assert.equal(getToasts().length, 0);

  toast.success('a');
  toast.error('b');
  toast.info('c');
  toast.message('d');
  assert.deepEqual(
    getToasts().map((item) => [item.kind, item.message]),
    [
      ['error', 'b'],
      ['info', 'c'],
      ['message', 'd'],
    ]
  );

  dismissToast(getToasts()[1].id);
  assert.deepEqual(getToasts().map((item) => item.message), ['b', 'd']);

  for (const item of getToasts()) dismissToast(item.id);
  assert.equal(getToasts().length, 0);
});
