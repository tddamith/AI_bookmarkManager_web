import assert from "node:assert/strict";
import { test } from "node:test";
import { runPipeline, type Ai, type Item, type ItemPatch, type JobState, type PipelineStore } from "./import-pipeline.ts";

/** In-memory store that records every state the pipeline publishes. */
function memoryStore(items: Item[]) {
  const data = new Map(items.map((i) => [i.id, { ...i, tags: [...i.tags] }]));
  const states: JobState[] = [];
  const store: PipelineStore = {
    list: async () => [...data.values()].map((i) => ({ ...i, tags: [...i.tags] })),
    remove: async (id) => { data.delete(id); },
    update: async (id, p: ItemPatch) => {
      const cur = data.get(id)!;
      data.set(id, { ...cur, ...(p.folder !== undefined ? { folder: p.folder } : {}), ...(p.tags ? { tags: p.tags } : {}), ...(p.summary !== undefined ? { summary: p.summary } : {}) });
    },
    setState: async (s) => { states.push({ ...s }); },
  };
  return { store, states, data };
}

/** 20 bookmarks: 17 unique + 3 exact duplicates of the first one (URL repeated, ignoring #fragment and trailing slash). */
function fakeBookmarks(): Item[] {
  const items: Item[] = Array.from({ length: 17 }, (_, i) => ({
    id: `b${i}`, url: `https://site${i % 6}.example.com/page-${i}`, title: `Page ${i}`, folder: null, tags: [], summary: "", savedAt: 1_000 + i,
  }));
  items.push(
    { id: "d1", url: "https://site0.example.com/page-0", title: "Page 0 (copy 1)", folder: "Inbox", tags: [], summary: "", savedAt: 500 },
    { id: "d2", url: "https://site0.example.com/page-0/", title: "Page 0 (copy 2)", folder: null, tags: [], summary: "", savedAt: 600 },
    { id: "d3", url: "HTTPS://SITE0.example.com/page-0#top", title: "Page 0 (copy 3)", folder: null, tags: [], summary: "", savedAt: 700 },
  );
  return items;
}

const mockAi: Ai = {
  folder: async (it) => (Number(it.id.slice(1)) % 2 ? "Dev" : "Reading"),
  tags: async (it) => ["mock", `n${it.id}`],
  summary: async (it) => `Summary of ${it.title}`,
};

test("20 bookmarks with 3 exact duplicates: idle → stages 0,1,2,3 → done, everything filed, tagged and summarised", async () => {
  const { store, states, data } = memoryStore(fakeBookmarks());
  const final = await runPipeline(store, mockAi);

  assert.equal(final.status, "done");
  assert.equal(final.stage, 3);
  assert.equal(final.duplicates, 3);
  assert.equal(final.done, 17);
  assert.equal(final.total, 17);
  assert.equal(final.error, undefined);

  // Stages are published in order, each one reporting its own done/total, all while status is "importing", then "done".
  const importing = states.filter((s) => s.status === "importing");
  assert.deepEqual([...new Set(importing.map((s) => s.stage))], [0, 1, 2, 3]);
  assert.ok(importing.every((s, i) => i === 0 || s.stage >= importing[i - 1].stage), "stage never goes backwards");
  assert.equal(states.at(-1)?.status, "done");
  const stage2 = importing.filter((s) => s.stage === 2);
  assert.ok(stage2.length >= 2 && stage2.at(-1)!.done === 17 && stage2.at(-1)!.total === 17, "folder stage reports its own progress");

  // The 3 extra copies are gone (the newest one, b0, survives) and every remaining bookmark has an AI folder, tags and a summary.
  assert.equal(data.size, 17);
  assert.ok(data.has("b0") && !data.has("d1") && !data.has("d2") && !data.has("d3"), "newest copy kept, the 3 older copies removed");
  for (const it of data.values()) {
    assert.ok(it.folder === "Dev" || it.folder === "Reading", `${it.id} has an AI folder (${it.folder})`);
    assert.ok(it.tags.length > 0, `${it.id} has tags`);
    assert.match(it.summary, /^Summary of /);
  }
});

test("a re-run changes nothing and costs no AI calls (resumable / idempotent)", async () => {
  const { store, data } = memoryStore(fakeBookmarks());
  await runPipeline(store, mockAi);
  const before = JSON.stringify([...data.values()]);
  let calls = 0;
  const counting: Ai = { folder: async (i, f) => { calls++; return mockAi.folder(i, f); }, tags: async (i) => { calls++; return mockAi.tags(i); }, summary: async (i) => { calls++; return mockAi.summary(i); } };
  const again = await runPipeline(store, counting);
  assert.equal(again.status, "done");
  assert.equal(again.duplicates, 0);
  assert.equal(calls, 0);
  assert.equal(JSON.stringify([...data.values()]), before);
});

test("existing real folders are kept; only unsorted bookmarks are filed", async () => {
  const items: Item[] = [
    { id: "a", url: "https://a.example.com", title: "A", folder: "Travel", tags: [], summary: "", savedAt: 1 },
    { id: "b", url: "https://b.example.com", title: "B", folder: "Unsorted", tags: [], summary: "", savedAt: 2 },
  ];
  const { store, data } = memoryStore(items);
  await runPipeline(store, mockAi);
  assert.equal(data.get("a")!.folder, "Travel");
  assert.equal(data.get("b")!.folder, "Reading");
});

test("when the AI call throws, status becomes error and the message is returned (never stuck)", async () => {
  const { store, states } = memoryStore(fakeBookmarks());
  const broken: Ai = { ...mockAi, folder: async () => { throw new Error("AI quota exceeded"); } };
  const final = await runPipeline(store, broken);

  assert.equal(final.status, "error");
  assert.equal(final.error, "AI quota exceeded");
  assert.equal(final.stage, 2, "it stopped in the folder stage");
  const last = states.at(-1)!;
  assert.equal(last.status, "error");
  assert.equal(last.error, "AI quota exceeded");
});

test("an error from the store (e.g. the API is down) is reported too", async () => {
  const { store } = memoryStore(fakeBookmarks());
  store.list = async () => { throw new Error("sync 502"); };
  const final = await runPipeline(store, mockAi);
  assert.equal(final.status, "error");
  assert.equal(final.error, "sync 502");
});
