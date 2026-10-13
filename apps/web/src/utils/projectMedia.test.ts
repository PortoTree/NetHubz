import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveProjectMediaUrls,
  prepareProjectMediaCreates,
  getProjectMediaToDelete,
} from "./projectMedia";

test("resolveProjectMediaUrls: falls back to legacy coverUrls and mediaUrls when projectMedia is empty or missing", () => {
  const legacyProject = {
    coverUrls: ["https://res.cloudinary.com/demo/image/upload/v1/cover1.jpg"],
    mediaUrls: [
      "https://res.cloudinary.com/demo/image/upload/v1/shot1.jpg",
      "https://res.cloudinary.com/demo/image/upload/v1/shot2.jpg",
    ],
  };

  const resolved = resolveProjectMediaUrls(legacyProject);

  assert.deepEqual(resolved.coverUrls, [
    "https://res.cloudinary.com/demo/image/upload/v1/cover1.jpg",
  ]);
  assert.deepEqual(resolved.mediaUrls, [
    "https://res.cloudinary.com/demo/image/upload/v1/shot1.jpg",
    "https://res.cloudinary.com/demo/image/upload/v1/shot2.jpg",
  ]);
});

test("resolveProjectMediaUrls: correctly extracts cover and media from projectMedia ordered by order field", () => {
  const modernProject = {
    coverUrls: [],
    mediaUrls: [],
    projectMedia: [
      {
        order: 1,
        isCover: false,
        media: {
          originalUrl: "https://res.cloudinary.com/demo/image/upload/v1/shot2.jpg",
        },
      },
      {
        order: 0,
        isCover: true,
        media: {
          originalUrl: "https://res.cloudinary.com/demo/image/upload/v1/cover1.jpg",
        },
      },
      {
        order: 0,
        isCover: false,
        media: {
          originalUrl: "https://res.cloudinary.com/demo/image/upload/v1/shot1.jpg",
        },
      },
    ],
  };

  const resolved = resolveProjectMediaUrls(modernProject);

  assert.deepEqual(resolved.coverUrls, [
    "https://res.cloudinary.com/demo/image/upload/v1/cover1.jpg",
  ]);
  assert.deepEqual(resolved.mediaUrls, [
    "https://res.cloudinary.com/demo/image/upload/v1/shot1.jpg",
    "https://res.cloudinary.com/demo/image/upload/v1/shot2.jpg",
  ]);
});

test("prepareProjectMediaCreates: constructs proper nested Prisma create items with publicId and isCover flags", () => {
  const userId = "user-123";
  const covers = ["https://res.cloudinary.com/demo/image/upload/v12345/project_covers/my_cover.png"];
  const media = ["https://res.cloudinary.com/demo/image/upload/v12345/project_shots/screenshot1.jpg"];

  const creates = prepareProjectMediaCreates(userId, covers, media);

  assert.equal(creates.length, 2);

  // Cover item
  assert.equal(creates[0].isCover, true);
  assert.equal(creates[0].order, 0);
  assert.equal(creates[0].media.create.userId, userId);
  assert.equal(creates[0].media.create.publicId, "project_covers/my_cover");
  assert.equal(creates[0].media.create.originalUrl, covers[0]);

  // Showcase item
  assert.equal(creates[1].isCover, false);
  assert.equal(creates[1].order, 0);
  assert.equal(creates[1].media.create.userId, userId);
  assert.equal(creates[1].media.create.publicId, "project_shots/screenshot1");
  assert.equal(creates[1].media.create.originalUrl, media[0]);
});

test("getProjectMediaToDelete: collects media from both projectMedia and fallback legacy arrays without duplicates", () => {
  const project = {
    coverUrls: ["https://res.cloudinary.com/demo/image/upload/v123/legacy_cover.jpg"],
    mediaUrls: ["https://res.cloudinary.com/demo/image/upload/v123/legacy_media.jpg"],
    projectMedia: [
      {
        mediaId: "med-1",
        media: {
          id: "med-1",
          publicId: "modern_cover",
          type: "IMAGE",
        },
      },
    ],
  };

  const toDelete = getProjectMediaToDelete(project);

  assert.equal(toDelete.length, 3);
  const publicIds = toDelete.map((item) => item.publicId);
  assert.ok(publicIds.includes("modern_cover"));
  assert.ok(publicIds.includes("legacy_cover"));
  assert.ok(publicIds.includes("legacy_media"));
});
