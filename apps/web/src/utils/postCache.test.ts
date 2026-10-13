import test from "node:test";
import assert from "node:assert/strict";
import { getPostRevalidationPaths } from "./postCache";

test("getPostRevalidationPaths: includes global feed and explore paths by default", () => {
  const paths = getPostRevalidationPaths({});

  assert.ok(paths.includes("/"));
  assert.ok(paths.includes("/id"));
  assert.ok(paths.includes("/en"));
  assert.ok(paths.includes("/explore"));
  assert.ok(paths.includes("/id/explore"));
  assert.ok(paths.includes("/en/explore"));
});

test("getPostRevalidationPaths: includes user profile paths when username and userId are provided", () => {
  const paths = getPostRevalidationPaths({
    username: "john_doe",
    userId: "user-123",
  });

  assert.ok(paths.includes("/john_doe"));
  assert.ok(paths.includes("/id/john_doe"));
  assert.ok(paths.includes("/en/john_doe"));
  assert.ok(paths.includes("/p/john_doe/user-123"));
  assert.ok(paths.includes("/id/p/john_doe/user-123"));
  assert.ok(paths.includes("/en/p/john_doe/user-123"));
});

test("getPostRevalidationPaths: includes post detail paths when postId is provided", () => {
  const paths = getPostRevalidationPaths({
    postId: "post-456",
    username: "john_doe",
  });

  assert.ok(paths.includes("/p/john_doe/post-456"));
  assert.ok(paths.includes("/id/p/john_doe/post-456"));
  assert.ok(paths.includes("/en/p/john_doe/post-456"));
  assert.ok(paths.includes("/post/post-456"));
  assert.ok(paths.includes("/id/post/post-456"));
  assert.ok(paths.includes("/en/post/post-456"));
});

test("getPostRevalidationPaths: returns unique array without duplicate paths", () => {
  const paths = getPostRevalidationPaths({
    postId: "post-456",
    username: "john_doe",
    userId: "user-123",
  });

  const uniquePaths = Array.from(new Set(paths));
  assert.equal(paths.length, uniquePaths.length);
});
