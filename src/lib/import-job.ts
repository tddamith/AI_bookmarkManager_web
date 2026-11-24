import "server-only";
import { defaultAi } from "@/lib/import-ai";
import { runPipeline, type Ai } from "@/lib/import-pipeline";
import { createPipelineStore, importSummary, type Ctx } from "@/lib/library";

/**
 * Runs the import pipeline in the background and remembers which users have a job running in THIS process.
 * The registry lives on globalThis: a plain module-level Map is duplicated per route bundle / wiped on hot reload.
 * Progress itself is stored in the shared import-state (API or file store), never only in memory, so status survives restarts
 * and a job that died (server restart, crash) is picked up again by startImportJob().
 */
type Job = { startedAt: number; promise: Promise<unknown> };
const g = globalThis as unknown as { __tidypinImportJobs?: Map<string, Job> };
const jobs = () => (g.__tidypinImportJobs ??= new Map<string, Job>());

export const hasJob = (userId: string) => jobs().has(userId);

export type StartResult =
  | { started: true; promise: Promise<unknown> }
  | { started: false; reason: "running" | "extension" | "nothing" | "done" };

/**
 * Starts (or resumes) the pipeline when it makes sense:
 *  - idle with bookmarks in the library → start;  error → retry;  importing by this pipeline but no live job → resume.
 * It never starts while the browser extension is driving an import, and never twice at once.
 */
export async function startImportJob(ctx: Ctx, opts: { ai?: Ai; force?: boolean } = {}): Promise<StartResult> {
  if (hasJob(ctx.userId)) return { started: false, reason: "running" };
  const s = await importSummary(ctx);
  if (s.status === "importing" && s.source !== "server" && !opts.force) return { started: false, reason: "extension" };
  if (s.status === "done" && !opts.force) return { started: false, reason: "done" };
  if (s.status === "idle" && s.library === 0) return { started: false, reason: "nothing" };

  const store = createPipelineStore(ctx);
  const promise = runPipeline(store, opts.ai ?? defaultAi, (m) => console.log("[tidypin-import:server]", ctx.userId, m)).finally(() => jobs().delete(ctx.userId));
  jobs().set(ctx.userId, { startedAt: Date.now(), promise });
  return { started: true, promise };
}
