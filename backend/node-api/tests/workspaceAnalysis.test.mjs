import assert from 'node:assert/strict';
import test from 'node:test';
import { matchWorkspaceMember, meetingDay, prepareAnalysis } from '../dist/services/workspaceAnalysis.js';

const directory = [
  { user_id: 'a', name: 'Salman Khan', email: 'salman.khan@example.test', role: 'member' },
  { user_id: 'b', name: 'Salman Ali', email: 'salman.ali@example.test', role: 'member' },
  { user_id: 'c', name: 'Priya Nair', email: 'priya@example.test', role: 'manager' },
];

test('resolves unique names and emails, leaves conflicting and missing names for review', () => {
  assert.deepEqual(matchWorkspaceMember('Salman', directory), { assignee_id: null, match: 'ambiguous' });
  assert.deepEqual(matchWorkspaceMember('Priya', directory), { assignee_id: 'c', match: 'matched' });
  assert.deepEqual(matchWorkspaceMember('SALMAN.ALI@example.test', directory), { assignee_id: 'b', match: 'matched' });
  assert.equal(matchWorkspaceMember('Rahul', directory).match, 'unmatched');
});

test('uses the meeting time zone and rejects malformed analysis', () => {
  assert.equal(meetingDay('2026-11-20T22:00:00Z', 'Asia/Kolkata'), '2026-11-21');
  assert.throws(() => prepareAnalysis({ overview: 'Incomplete' }, directory, null));
});
