import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialWorkspaceState,
  normalizeWorkspaceState,
  normalizeKeywordHandle,
  extractMentions,
  addKeyword,
  editKeyword,
  addFeedPost,
  addFeedComment,
  addVerifyEntry,
  promotePendingToSuccess,
  addOrderEntry,
  addCharacter,
  updateCharacter,
  removeCharacter,
  filterFeedItems,
  deleteFeedItem,
  deleteFeedComment,
  deleteVerifyItem,
  moveFeedItemToRoom,
  restoreFeedItemFromRoom,
  deleteArchivedFeedItem,
  moveVerifyItemToRoom,
  restoreVerifyItemFromRoom,
  deleteArchivedVerifyItem,
  updateKeywordCardPrefs,
} from './workspace-store';

test('normalizeKeywordHandle strips @ and converts spaces to hyphens', () => {
  assert.equal(normalizeKeywordHandle('  @auth flow  '), 'auth-flow');
  assert.equal(normalizeKeywordHandle('sensor_node'), 'sensor_node');
  assert.equal(normalizeKeywordHandle('@@@'), '');
});

test('extractMentions extracts unique @keyword tokens preserving order', () => {
  assert.deepEqual(
    extractMentions('Working on @sensor-node and @Auth-Bridge plus @sensor-node again.'),
    ['sensor-node', 'Auth-Bridge']
  );
});

test('addKeyword adds to keywords list and creates a keyword_added feed entry', () => {
  const initial = createInitialWorkspaceState();
  const res = addKeyword(initial, {
    keyword: '@motor-driver',
    summary: 'PWM H-bridge duty cycle limit at 12V.',
  });
  assert.equal(res.ok, true);
  if (!res.ok) return;

  assert.equal(res.state.keywords[0].keyword, 'motor-driver');
  assert.equal(res.state.feed[0].type, 'keyword_added');
  assert.equal(res.state.feed[0].diff?.afterKeyword, 'motor-driver');
  assert.equal(res.state.feed[0].diff?.afterSummary, 'PWM H-bridge duty cycle limit at 12V.');
});

test('editKeyword records before and after diff in central feed', () => {
  const initial = createInitialWorkspaceState();
  const target = initial.keywords[0];
  const res = editKeyword(initial, {
    id: target.id,
    keyword: 'sensor-node-v2',
    summary: 'Updated ESP32 packet framing with CRC16 checksum.',
  });
  assert.equal(res.ok, true);
  if (!res.ok) return;

  const updatedKw = res.state.keywords.find((k) => k.id === target.id);
  assert.equal(updatedKw?.keyword, 'sensor-node-v2');

  const diffPost = res.state.feed[0];
  assert.equal(diffPost.type, 'keyword_edited');
  assert.equal(diffPost.diff?.beforeKeyword, target.keyword);
  assert.equal(diffPost.diff?.afterKeyword, 'sensor-node-v2');
  assert.equal(diffPost.diff?.beforeSummary, target.summary);
  assert.equal(
    diffPost.diff?.afterSummary,
    'Updated ESP32 packet framing with CRC16 checksum.'
  );
});

test('addFeedPost, addFeedComment, and deleteFeedComment work cleanly', () => {
  const initial = createInitialWorkspaceState();
  const postRes = addFeedPost(initial, {
    characterId: 'char_aizen',
    content: '@auth-bridge Implemented deterministic snapshot sync.',
    images: ['data:image/png;base64,AAA'],
  });
  assert.equal(postRes.ok, true);
  if (!postRes.ok) return;

  const newPost = postRes.state.feed[0];
  assert.equal(newPost.characterName, 'Aizen');
  assert.deepEqual(newPost.keywordMentions, ['auth-bridge']);
  assert.equal(newPost.images.length, 1);

  const cmtRes = addFeedComment(postRes.state, {
    feedItemId: newPost.id,
    characterId: 'char_sasuke',
    text: 'Verified locally without regressions.',
  });
  assert.equal(cmtRes.ok, true);
  if (!cmtRes.ok) return;

  const cmtId = cmtRes.state.feed[0].comments[0].id;
  assert.equal(cmtRes.state.feed[0].comments.length, 1);
  assert.equal(cmtRes.state.feed[0].comments[0].characterName, 'Sasuke');

  const delCmtRes = deleteFeedComment(cmtRes.state, {
    feedItemId: newPost.id,
    commentId: cmtId,
  });
  assert.equal(delCmtRes.ok, true);
  if (!delCmtRes.ok) return;
  assert.equal(delCmtRes.state.feed[0].comments.length, 0);
});

test('Pending Verify defaults to Maruf and Success Verify defaults to Sadik, both rising into Feed', () => {
  const initial = createInitialWorkspaceState();

  const pendingRes = addVerifyEntry(initial, {
    status: 'pending',
    keyword: 'sensor-node',
    comment: 'Needs cold-boot stress test before field mount.',
  });
  assert.equal(pendingRes.ok, true);
  if (!pendingRes.ok) return;

  assert.equal(pendingRes.state.verifications[0].status, 'pending');
  assert.equal(pendingRes.state.verifications[0].characterName, 'Maruf');
  assert.equal(pendingRes.state.feed[0].type, 'pending_verify');
  assert.equal(pendingRes.state.feed[0].characterName, 'Maruf');

  const successRes = addVerifyEntry(pendingRes.state, {
    status: 'success',
    keyword: '@deploy-log',
    comment: 'All headers soldered and continuity verified.',
  });
  assert.equal(successRes.ok, true);
  if (!successRes.ok) return;

  assert.equal(successRes.state.verifications[0].status, 'success');
  assert.equal(successRes.state.verifications[0].characterName, 'Sadik');
  assert.equal(successRes.state.feed[0].type, 'success_verify');
  assert.equal(successRes.state.feed[0].characterName, 'Sadik');
});

test('promotePendingToSuccess moves pending item to success and posts to feed as Sadik', () => {
  const initial = createInitialWorkspaceState();
  const pendingItem = initial.verifications.find((v) => v.status === 'pending')!;
  const res = promotePendingToSuccess(initial, pendingItem.id, 'Thermal check passed at 42C.');
  assert.equal(res.ok, true);
  if (!res.ok) return;

  const promoted = res.state.verifications.find((v) => v.id === pendingItem.id);
  assert.equal(promoted?.status, 'success');
  assert.equal(promoted?.characterName, 'Sadik');
  assert.equal(res.state.feed[0].type, 'success_verify');
  assert.equal(res.state.feed[0].characterName, 'Sadik');
});

test('addOrderEntry logs work order with @keyword mention to feed', () => {
  const initial = createInitialWorkspaceState();
  const res = addOrderEntry(initial, {
    keyword: 'circuit-v2',
    details: 'Order 4 replacement buck converters.',
    priority: 'Urgent',
  });
  assert.equal(res.ok, true);
  if (!res.ok) return;

  assert.equal(res.state.feed[0].type, 'order');
  assert.equal(res.state.feed[0].orderMeta?.priority, 'Urgent');
  assert.ok(res.state.feed[0].keywordMentions.includes('circuit-v2'));
});

test('Settings character management adds, edits, and removes characters safely', () => {
  const initial = createInitialWorkspaceState();
  const added = addCharacter(initial, {
    name: 'Itachi',
    roleLabel: 'Silent Reviewer',
    channel: 'feed',
    color: '#C84B31',
  });
  assert.equal(added.ok, true);
  if (!added.ok) return;

  const itachi = added.state.characters.find((c) => c.name === 'Itachi')!;
  assert.ok(itachi);

  const updated = updateCharacter(added.state, {
    id: 'char_ajanokoji',
    name: 'Kiyotaka',
    roleLabel: 'Lead Strategist',
    channel: 'feed',
    color: '#2D4B73',
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assert.ok(updated.state.characters.some((c) => c.name === 'Kiyotaka'));
  assert.equal(updated.state.feed[0].characterName, 'Kiyotaka');

  const removed = removeCharacter(updated.state, 'char_sasuke');
  assert.equal(removed.ok, true);
  if (!removed.ok) return;
  assert.equal(
    removed.state.characters.some((c) => c.id === 'char_sasuke'),
    false
  );
});

test('Room archive moves, restores, and permanently deletes Feed and Verify items', () => {
  const initial = createInitialWorkspaceState();
  const targetFeed = initial.feed[0];
  const initialFeedLen = initial.feed.length;

  const movedFeed = moveFeedItemToRoom(initial, targetFeed.id);
  assert.equal(movedFeed.ok, true);
  if (!movedFeed.ok) return;
  assert.equal(movedFeed.state.feed.length, initialFeedLen - 1);
  assert.equal(movedFeed.state.archivedFeed.length, 1);
  assert.equal(movedFeed.state.archivedFeed[0].id, targetFeed.id);

  const restoredFeed = restoreFeedItemFromRoom(movedFeed.state, targetFeed.id);
  assert.equal(restoredFeed.ok, true);
  if (!restoredFeed.ok) return;
  assert.equal(restoredFeed.state.feed.length, initialFeedLen);
  assert.equal(restoredFeed.state.archivedFeed.length, 0);

  const movedAgain = moveFeedItemToRoom(restoredFeed.state, targetFeed.id);
  assert.equal(movedAgain.ok, true);
  if (!movedAgain.ok) return;
  const deletedArchive = deleteArchivedFeedItem(movedAgain.state, targetFeed.id);
  assert.equal(deletedArchive.ok, true);
  if (!deletedArchive.ok) return;
  assert.equal(deletedArchive.state.archivedFeed.length, 0);

  const targetVerify = initial.verifications[0];
  const movedVerify = moveVerifyItemToRoom(initial, targetVerify.id);
  assert.equal(movedVerify.ok, true);
  if (!movedVerify.ok) return;
  assert.equal(movedVerify.state.verifications.length, 1);
  assert.equal(movedVerify.state.archivedVerifications.length, 1);

  const restoredVerify = restoreVerifyItemFromRoom(movedVerify.state, targetVerify.id);
  assert.equal(restoredVerify.ok, true);
  if (!restoredVerify.ok) return;
  assert.equal(restoredVerify.state.verifications.length, 2);
  assert.equal(restoredVerify.state.archivedVerifications.length, 0);

  const movedVerifyAgain = moveVerifyItemToRoom(restoredVerify.state, targetVerify.id);
  assert.equal(movedVerifyAgain.ok, true);
  if (!movedVerifyAgain.ok) return;
  const delArchVerify = deleteArchivedVerifyItem(movedVerifyAgain.state, targetVerify.id);
  assert.equal(delArchVerify.ok, true);
  if (!delArchVerify.ok) return;
  assert.equal(delArchVerify.state.archivedVerifications.length, 0);
});

test('deleteFeedItem and deleteVerifyItem remove items cleanly', () => {
  const initial = createInitialWorkspaceState();
  const resFeed = deleteFeedItem(initial, initial.feed[0].id);
  assert.equal(resFeed.ok, true);
  if (!resFeed.ok) return;
  assert.equal(resFeed.state.feed.length, initial.feed.length - 1);

  const resVerify = deleteVerifyItem(resFeed.state, initial.verifications[0].id);
  assert.equal(resVerify.ok, true);
  if (!resVerify.ok) return;
  assert.equal(resVerify.state.verifications.length, initial.verifications.length - 1);
});

test('updateKeywordCardPrefs and normalizeWorkspaceState persist card styling prefs safely', () => {
  const initial = createInitialWorkspaceState();
  const updated = updateKeywordCardPrefs(initial, {
    spacing: 'airy',
    padding: 'generous',
    borderStyle: 'framed',
  });
  assert.equal(updated.ok, true);
  if (!updated.ok) return;
  assert.equal(updated.state.keywordCardPrefs.spacing, 'airy');
  assert.equal(updated.state.keywordCardPrefs.borderStyle, 'framed');

  const migrated = normalizeWorkspaceState({
    keywords: initial.keywords,
    feed: initial.feed,
    characters: initial.characters,
  });
  assert.deepEqual(migrated.archivedFeed, []);
  assert.deepEqual(migrated.archivedVerifications, []);
  assert.equal(migrated.keywordCardPrefs.spacing, 'balanced');
});

test('filterFeedItems filters by keyword mention, category, and search query', () => {
  const initial = createInitialWorkspaceState();
  const byKw = filterFeedItems(initial.feed, { keywordFilter: 'sensor-node' });
  assert.equal(byKw.length, 2);

  const byCat = filterFeedItems(initial.feed, { category: 'verify' });
  assert.equal(byCat.length, 2);

  const byQuery = filterFeedItems(initial.feed, { query: 'Aizen' });
  assert.equal(byQuery.length, 2);
});
