import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addKeyword,
  addFeedPost,
  addFeedComment,
  createInitialWorkspaceState,
} from './workspace-store';
import {
  computeWorkspaceCounts,
  createBackupEnvelope,
  isWorkspaceCustomModified,
  mergeWorkspaceStatesForMigration,
  parseAndValidateBackupPayload,
} from './backup-utils';

test('computeWorkspaceCounts tallies keywords, posts, comments, verifications, and images accurately', () => {
  const initial = createInitialWorkspaceState();
  const counts0 = computeWorkspaceCounts(initial);
  assert.equal(counts0.keywords, 5);
  assert.equal(counts0.feed, 5);
  assert.equal(counts0.comments, 2);
  assert.equal(counts0.verifications, 2);
  assert.equal(counts0.images, 0);

  const postRes = addFeedPost(initial, {
    characterId: 'char_sasuke',
    content: 'Testing @sensor-node with image',
    images: ['data:image/png;base64,AAA'],
  });
  assert.equal(postRes.ok, true);
  if (!postRes.ok) return;

  const cmtRes = addFeedComment(postRes.state, {
    feedItemId: postRes.state.feed[0].id,
    characterId: 'char_aizen',
    text: 'Reply with image',
    images: ['data:image/png;base64,BBB', 'data:image/png;base64,CCC'],
  });
  assert.equal(cmtRes.ok, true);
  if (!cmtRes.ok) return;

  const counts1 = computeWorkspaceCounts(cmtRes.state);
  assert.equal(counts1.feed, 6);
  assert.equal(counts1.comments, 3);
  assert.equal(counts1.images, 3);
});

test('createBackupEnvelope and parseAndValidateBackupPayload round-trip cleanly', () => {
  const initial = createInitialWorkspaceState();
  const envelope = createBackupEnvelope(initial);
  assert.equal(envelope.app, 'kotonoha-studio');
  assert.equal(envelope.counts.keywords, 5);

  const parsed = parseAndValidateBackupPayload(envelope);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.state.keywords.length, 5);

  const invalid = parseAndValidateBackupPayload({ hello: 'world' });
  assert.equal(invalid.ok, false);
});

test('mergeWorkspaceStatesForMigration adopts browser customizations over fresh seed state', () => {
  const freshServer = createInitialWorkspaceState();
  assert.equal(isWorkspaceCustomModified(freshServer), false);

  const customBrowserRes = addKeyword(freshServer, {
    keyword: '@gym-routine',
    summary: 'Strength training log',
    tone: 'sage',
  });
  assert.equal(customBrowserRes.ok, true);
  if (!customBrowserRes.ok) return;

  assert.equal(isWorkspaceCustomModified(customBrowserRes.state), true);

  const merged = mergeWorkspaceStatesForMigration(
    freshServer,
    customBrowserRes.state
  );
  assert.ok(merged.keywords.some((k) => k.keyword === 'gym-routine'));
  assert.equal(merged.keywords.length, 6);
});
