import { test } from "node:test";
import assert from "node:assert/strict";
import { getProfileActions, calculateOptimisticFollow } from "./profileActions";

test("getProfileActions: correctly identifies self-profile and hides follow button", () => {
  const actions = getProfileActions({
    currentUserId: "user-123",
    currentUsername: "naufal",
    targetUserId: "user-123",
    targetUsername: "naufal",
    isFollowing: false,
  });

  assert.strictEqual(actions.isSelf, true);
  assert.strictEqual(actions.showFollowButton, false);
});

test("getProfileActions: displays follow button for other user with correct following state", () => {
  const actionsFollowing = getProfileActions({
    currentUserId: "user-1",
    currentUsername: "naufal",
    targetUserId: "user-2",
    targetUsername: "budi",
    isFollowing: true,
  });

  assert.strictEqual(actionsFollowing.isSelf, false);
  assert.strictEqual(actionsFollowing.showFollowButton, true);
  assert.strictEqual(actionsFollowing.isFollowing, true);

  const actionsNotFollowing = getProfileActions({
    currentUserId: "user-1",
    currentUsername: "naufal",
    targetUserId: "user-2",
    targetUsername: "budi",
    isFollowing: false,
  });

  assert.strictEqual(actionsNotFollowing.isFollowing, false);
});

test("calculateOptimisticFollow: correctly toggles follow state and increments/decrements count", () => {
  // Follow action
  const result1 = calculateOptimisticFollow(false, 10);
  assert.strictEqual(result1.isFollowing, true);
  assert.strictEqual(result1.followersCount, 11);

  // Unfollow action
  const result2 = calculateOptimisticFollow(true, 10);
  assert.strictEqual(result2.isFollowing, false);
  assert.strictEqual(result2.followersCount, 9);
});
