import { test } from "node:test";
import assert from "node:assert/strict";

import { buildEditModalView, buildRejectModalView } from "./interactions.ts";

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

test("buildRejectModalView encodes metadata and configures input", () => {
  const { view, metadataLength } = buildRejectModalView({
    ticketId: "ticket-1",
    draftId: "draft-1",
    channelId: "C-chan",
    messageTs: "123.45"
  });

  assert.ok(metadataLength > 0);
  const modalBlocks = view.blocks as any[];
  const inputBlock = modalBlocks.find(b => b.block_id === "rejection_reason_block");
  assert.ok(inputBlock, "expected rejection reason input block");
  assert.equal(inputBlock.element.action_id, "rejection_reason");
  assert.equal(inputBlock.element.multiline, true);
  assert.ok(typeof inputBlock.element.max_length === "number");

  const metadata = JSON.parse(view.private_metadata as string);
  assert.deepEqual(metadata, {
    ticketId: "ticket-1",
    draftId: "draft-1",
    channelId: "C-chan",
    messageTs: "123.45"
  });
});
