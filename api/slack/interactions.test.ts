import { test } from "node:test";
import assert from "node:assert/strict";

import { buildEditModalView } from "./interactions.ts";

test("buildEditModalView trims draft text beyond 3000 characters", () => {
  const longText = "x".repeat(3500);
  const { view, trimmedDraft } = buildEditModalView({
    ticketId: "t42",
    draftId: "d42",
    draftText: longText
  });

  const inputBlock = (view.blocks as any[])[0];
  const value = inputBlock.element.initial_value as string;

  assert.equal(value.length, 3000);
  assert.equal(trimmedDraft, true);
  assert.equal(value, longText.slice(0, 3000));
});

test("buildEditModalView encodes metadata and exposes length", () => {
  const { view, metadataLength } = buildEditModalView({
    ticketId: "t-1",
    draftId: "d-1",
    channelId: "C123",
    messageTs: "168495.1",
    draftText: "Hello"
  });

  assert.ok(metadataLength > 0);
  const metadata = JSON.parse(view.private_metadata as string);
  assert.deepEqual(metadata, {
    ticketId: "t-1",
    draftId: "d-1",
    channelId: "C123",
    messageTs: "168495.1"
  });
});

