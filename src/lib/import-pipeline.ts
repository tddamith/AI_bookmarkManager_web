/**
 * Server-side import pipeline: dedupe → AI folders → tags & summaries.
 * Pure logic (no framework imports) so it can be unit-tested with an in-memory store and a mocked AI.
 *
 * Stage numbers match the web "Importing" checklist, the extension and the API (0-based, the stage being worked on):
 *   0 Imported all bookmarks · 1 Removed duplicates · 2 Putting them into folders · 3 Adding tags and summaries
 * `status` is "importing" while the job runs, "done" at the end, or "error" (with `error`) if anything throws.
 * Every stage reports its own `done` / `total`.
 */
export type Item = { id: string; url: string; title: string; folder: string | null; tags: string[]; summary: string; savedAt: number };
export type ItemPatch = { folder?: string; tags?: string[]; summary?: string };

export type JobState = {
  status: "idle" | "importing" | "done" | "error";
  stage: 0 | 1 | 2 | 3;
  done: number;
  total: number;
  duplicates: number;
  dead: number;
  error?: string;
};

export type PipelineStore = {
  list(): Promise<Item[]>;
  remove(id: string): Promise<void>;
  update(id: string, patch: ItemPatch): Promise<void>;
  /** Persist progress where /api/sync/status reads it (the API's import-state or the local file store). */
  setState(state: JobState): Promise<void>;
  /** Optional: write out anything the store has buffered (stores batch their writes). Called at the end of every stage. */
  flush?(): Promise<void>;
};

/** The AI calls. Production uses an on-device implementation (see import-ai.ts); tests pass a mock. */
export type Ai = {
  folder(item: Item, existingFolders: string[]): Promise<string>;
  tags(item: Item): Promise<string[]>;
  summary(item: Item): Promise<string>;
};

export const STAGES = ["Imported all bookmarks", "Removed duplicates", "Putting them into folders", "Adding tags and summaries"] as const;

/** Same URL ignoring #fragment, a trailing "/" and case (matches the API's duplicate rule). */
export const normUrl = (u: string) => u.trim().replace(/#.*$/, "").replace(/\/$/, "").toLowerCase();

const UNSORTED = new Set(["", "unsorted", "inbox", "other bookmarks", "@other", "@bar", "@mobile"]);
export const needsFolder = (i: Item) => UNSORTED.has((i.folder ?? "").trim().toLowerCase());

const POOL = 5;   // concurrent AI calls
async function each<T>(items: T[], fn: (x: T) => Promise<void>, tick: () => Promise<void>) {
  for (let i = 0; i < items.length; i += POOL) {
    await Promise.all(items.slice(i, i + POOL).map(fn));
    await tick();
  }
}

export async function runPipeline(store: PipelineStore, ai: Ai, log: (msg: string) => void = () => undefined): Promise<JobState> {
  const state: JobState = { status: "importing", stage: 0, done: 0, total: 0, duplicates: 0, dead: 0 };
  const push = (patch: Partial<JobState> = {}) => { Object.assign(state, patch); return store.setState({ ...state }); };

  try {
    // Say "importing" straight away (this also clears an old error) before the slow part, so nobody sees stale state.
    await push();

    // 0 — Imported: everything is already in the library; count it.
    let items = await store.list();
    log(`stage 0: ${items.length} bookmarks`);
    await push({ stage: 0, total: items.length, done: items.length });

    // 1 — Duplicates: same URL (ignoring #fragment / trailing slash / case). Keep the newest, remove the rest.
    await push({ stage: 1, total: items.length, done: 0 });
    const groups = new Map<string, Item[]>();
    for (const it of items) groups.set(normUrl(it.url), [...(groups.get(normUrl(it.url)) ?? []), it]);
    const losers: Item[] = [];
    for (const g of groups.values()) {
      if (g.length < 2) continue;
      const keep = g.reduce((a, b) => (b.savedAt > a.savedAt ? b : a));
      losers.push(...g.filter((x) => x !== keep));
    }
    let seen = 0;
    await each(losers, async (it) => { await store.remove(it.id); seen++; }, () => push({ done: Math.min(items.length, seen) }));
    const removed = new Set(losers.map((l) => l.id));
    items = items.filter((i) => !removed.has(i.id));
    await store.flush?.();
    log(`stage 1: removed ${losers.length} duplicates`);
    await push({ duplicates: state.duplicates + losers.length, done: items.length, total: items.length });

    // 2 — Folders: only bookmarks without a real folder get one; the folders you already have are kept.
    await push({ stage: 2, total: items.length, done: 0 });
    const folders = [...new Set(items.filter((i) => !needsFolder(i)).map((i) => i.folder!.trim()))];
    const todo = items.filter(needsFolder);
    let filed = items.length - todo.length;
    await push({ done: filed });
    await each(todo, async (it) => {
      const name = (await ai.folder(it, folders)).trim();
      if (!name) throw new Error(`The AI returned no folder for “${it.title}”.`);
      await store.update(it.id, { folder: name });
      it.folder = name;
      if (!folders.includes(name)) folders.push(name);
      filed++;
    }, () => push({ done: filed }));
    await store.flush?.();
    log(`stage 2: filed ${todo.length} bookmarks`);

    // 3 — Tags and summaries: only what is missing.
    await push({ stage: 3, total: items.length, done: 0 });
    let tagged = 0;
    await each(items, async (it) => {
      const patch: ItemPatch = {};
      if (!it.tags.length) patch.tags = (await ai.tags(it)).map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5);
      if (!it.summary.trim()) patch.summary = (await ai.summary(it)).trim();
      if (patch.tags || patch.summary) {
        await store.update(it.id, patch);
        if (patch.tags) it.tags = patch.tags;
        if (patch.summary) it.summary = patch.summary;
      }
      tagged++;
    }, () => push({ done: tagged }));
    await store.flush?.();
    log(`stage 3: tagged and summarised ${tagged} bookmarks`);

    await push({ status: "done", stage: 3, done: items.length, total: items.length });
    return { ...state };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log(`failed: ${message}`);
    await push({ status: "error", error: message }).catch(() => undefined);   // never leave it silently "importing"
    return { ...state };
  }
}
