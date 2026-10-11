import { test } from "node:test";
import assert from "node:assert/strict";
import { calculatePopoverPosition, shouldCloseOnScroll } from "./popoverPosition";

test("calculatePopoverPosition: places card below anchor when space is available", () => {
  const anchorRect = { top: 100, left: 150, bottom: 140, right: 190, width: 40, height: 40 };
  const cardSize = { width: 340, height: 260 };
  const viewport = { width: 1200, height: 800 };

  const result = calculatePopoverPosition(anchorRect, cardSize, viewport);

  assert.strictEqual(result.placement, "bottom");
  assert.strictEqual(result.top, 148); // 140 + 8
  assert.strictEqual(result.left, 150);
});

test("calculatePopoverPosition: flips card above anchor when bottom space overflows", () => {
  const anchorRect = { top: 600, left: 150, bottom: 640, right: 190, width: 40, height: 40 };
  const cardSize = { width: 340, height: 260 };
  const viewport = { width: 1200, height: 800 }; // 640 + 8 + 260 = 908 > 800

  const result = calculatePopoverPosition(anchorRect, cardSize, viewport);

  assert.strictEqual(result.placement, "top");
  assert.strictEqual(result.top, 332); // 600 - 8 - 260 = 332
  assert.strictEqual(result.left, 150);
});

test("calculatePopoverPosition: clamps horizontal position within viewport padding", () => {
  const anchorRect = { top: 100, left: 1000, bottom: 140, right: 1040, width: 40, height: 40 };
  const cardSize = { width: 340, height: 260 };
  const viewport = { width: 1200, height: 800 }; // 1000 + 340 = 1340 > 1200

  const result = calculatePopoverPosition(anchorRect, cardSize, viewport);

  assert.strictEqual(result.left, 848); // 1200 - 340 - 12 padding = 848
});

test("shouldCloseOnScroll: closes on scroll or wheel regardless of location", () => {
  assert.strictEqual(shouldCloseOnScroll("scroll", false), true);
  assert.strictEqual(shouldCloseOnScroll("scroll", true), true);
  assert.strictEqual(shouldCloseOnScroll("wheel", false), true);
  assert.strictEqual(shouldCloseOnScroll("wheel", true), true);
});

test("shouldCloseOnScroll: closes on touchmove outside card, but ignores touchmove inside card", () => {
  assert.strictEqual(shouldCloseOnScroll("touchmove", false), true);
  assert.strictEqual(shouldCloseOnScroll("touchmove", true), false);
});

