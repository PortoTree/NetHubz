import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatShareMessage,
  getSocialSharePlatforms,
  getInstagramShareUrl,
  canUseNativeShare,
  triggerNativeShare,
} from "./shareHelpers";

test("TDD: formatShareMessage respects localized fallback text", () => {
  const result = formatShareMessage("", "", "Share this post on NetHubz");
  assert.equal(result, "Share this post on NetHubz");
});

test("TDD: getSocialSharePlatforms returns exactly wa, fb, tele, and ig", () => {
  const url = "https://nethubz.com/id/p/user/123";
  const text = "Check out my new project";
  const platforms = getSocialSharePlatforms(url, text);

  assert.ok(Array.isArray(platforms));
  assert.equal(platforms.length, 4);

  const ids = platforms.map((p) => p.id);
  assert.deepEqual(ids, ["whatsapp", "facebook", "telegram", "instagram"]);

  const wa = platforms.find((p) => p.id === "whatsapp");
  assert.ok(wa?.url.includes("api.whatsapp.com"));

  const fb = platforms.find((p) => p.id === "facebook");
  assert.ok(fb?.url.includes("facebook.com/sharer"));

  const tg = platforms.find((p) => p.id === "telegram");
  assert.ok(tg?.url.includes("t.me/share/url"));

  const ig = platforms.find((p) => p.id === "instagram");
  assert.ok(ig);
});

test("TDD: canUseNativeShare returns boolean", () => {
  const isSupported = canUseNativeShare();
  assert.equal(typeof isSupported, "boolean");
});
