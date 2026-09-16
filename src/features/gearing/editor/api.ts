/** TS owns item loading/filtering. Native calls carry complete calculation snapshots or user documents. */
import { invoke } from "@tauri-apps/api/core";
import { isTauriRuntime } from "../../../shared/utils/runtime";
import { evaluate } from "./evaluation";
import { prepareOptimization } from "./optimization";
import { parseDocument } from "./document";
import type { NativeResult } from "./calculation.types";
import { loadItemCatalog } from "./catalog";
import type { ItemCatalog } from "./catalog";
import type {
  Conditions,
  GearsetDocument,
  Proposal,
  Query,
  DocumentSummary,
} from "./types";
type NativeTransport = <T>(
  command: string,
  args: Record<string, unknown>,
) => Promise<T>;
const native: NativeTransport = (command, args) => {
  if (!isTauriRuntime())
    return Promise.reject(
      new Error(
        "Gearing calculations and document storage require the desktop application.",
      ),
    );
  return invoke(command, args);
};
export class GearingApi {
  private catalog: Promise<ItemCatalog> | undefined;
  private loader: () => Promise<ItemCatalog>;
  private call: NativeTransport;
  constructor(load = loadItemCatalog, call: NativeTransport = native) {
    this.loader = load;
    this.call = call;
  }
  private data() {
    return (this.catalog ??= this.loader().catch((error) => {
      this.catalog = undefined;
      throw error;
    }));
  }
  private request<T>(operation: string, input: unknown = {}) {
    return this.call<T>("gearing_request", { operation, input });
  }
  async bootstrap() {
    return (await this.data()).bootstrap();
  }
  async list() {
    const result = await this.request<{
      records: { id: string; value: unknown }[];
      issues: { id: string; message: string }[];
    }>("list");
    const documents: DocumentSummary[] = [],
      issues = [...result.issues];
    for (const record of result.records)
      try {
        const doc = parseDocument(record.value, record.id);
        documents.push({ id: doc.id, name: doc.name, job: doc.job });
      } catch (error) {
        issues.push({ id: record.id, message: String(error) });
      }
    documents.sort((a, b) => a.name.localeCompare(b.name));
    return { documents, issues };
  }
  async load(id: string) {
    return parseDocument(await this.request("load", { id }), id);
  }
  save(document: GearsetDocument) {
    parseDocument(document);
    return this.request<{ id: string }>("save", { id: document.id, document });
  }
  async items(ids: number[]) {
    return (await this.data()).items(ids);
  }
  async query(query: Query) {
    return (await this.data()).query(query);
  }
  async sourceIds(query: Pick<Query, "job" | "minLevel" | "maxLevel">) {
    return (await this.data()).sourceIds({ ...query, hideObsolete: true });
  }
  async evaluate(document: GearsetDocument, revision: number, tiers = false) {
    return {
      revision,
      evaluation: evaluate(await this.data(), document, tiers),
    };
  }
  async optimize(
    document: GearsetDocument,
    conditions: Conditions,
    requestId: string,
  ): Promise<Proposal> {
    const prepared = prepareOptimization(
      await this.data(),
      document,
      conditions,
    );
    if ("status" in prepared) return prepared;
    const result = await this.call<NativeResult>("optimize_gearing", {
      kind: conditions.kind,
      requestId,
      input: prepared.input,
      parameters: prepared.parameters,
    });
    return prepared.interpret(result);
  }
  cancel(requestId: string) {
    return this.call("cancel_gearing_optimization", { requestId });
  }
}
