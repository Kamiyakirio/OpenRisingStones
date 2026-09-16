/** The editor owns draft intent; asynchronous evaluations and proposals are revision-scoped outputs. */
import { GearingApi } from "./api";
import {
  configuration,
  importShare,
  migrateLegacy,
  newDocument,
  resolveLegacyAlternatives,
  shareDocument,
} from "./compatibility";
import type {
  Bootstrap,
  Conditions,
  DocumentSummary,
  Equipment,
  Evaluation,
  GearsetDocument,
  Item,
  Proposal,
  Query,
  Selection,
  Slot,
} from "./types";
interface State {
  loading: boolean;
  needsSetup: boolean;
  error: string | null;
  data: Bootstrap | null;
  document: GearsetDocument | null;
  documents: DocumentSummary[];
  revision: number;
  evaluation: Evaluation | null;
  evaluating: boolean;
  tiers: boolean;
  selection: Selection;
  query: Query;
  items: Item[];
  availableSourceIds: string[];
  optimizationSourceIds: string[];
  total: number;
  querying: boolean;
  preview: Item | null;
  previewEvaluation: Evaluation | null;
  previewing: boolean;
  conditions: Conditions;
  proposal: Proposal | null;
  proposalRevision: number | null;
  running: boolean;
  startedAt: number | null;
  saving: "saved" | "unsaved" | "saving" | "error";
  canUndo: boolean;
  canRedo: boolean;
  migrationIssue: boolean;
}
const defaultQuery: Query = {
  job: "",
  slot: "mainHand",
  minLevel: 0,
  maxLevel: 9999,
  search: "",
  sourceIds: [],
  hideObsolete: false,
  sortStat: "",
  sortDirection: "desc",
  offset: 0,
  limit: 60,
};
const defaultConditions: Conditions = {
  kind: "combat",
  mode: "all",
  targetGcd: 2.4,
  exactGcd: true,
  speedRange: null,
  progressionWeeks: null,
  minLevel: 780,
  maxLevel: 795,
  sourceIds: [],
  excludedItemIds: [],
  optimizeFood: true,
  targets: {},
};
export class GearingViewModel {
  private state: State = {
    loading: true,
    needsSetup: false,
    error: null,
    data: null,
    document: null,
    documents: [],
    revision: 0,
    evaluation: null,
    evaluating: false,
    tiers: false,
    selection: "mainHand",
    query: defaultQuery,
    items: [],
    availableSourceIds: [],
    optimizationSourceIds: [],
    total: 0,
    querying: false,
    preview: null,
    previewEvaluation: null,
    previewing: false,
    conditions: defaultConditions,
    proposal: null,
    proposalRevision: null,
    running: false,
    startedAt: null,
    saving: "saved",
    canUndo: false,
    canRedo: false,
    migrationIssue: false,
  };
  private listeners = new Set<() => void>();
  private undoStack: GearsetDocument[] = [];
  private redoStack: GearsetDocument[] = [];
  private alive = true;
  private lifecycle = 0;
  private sequence = 0;
  private sourceSequence = 0;
  private previewSequence = 0;
  private requestId: string | null = null;
  private evaluateTimer: ReturnType<typeof setTimeout> | undefined;
  private saveTail: Promise<unknown> = Promise.resolve();
  private savedDocument: GearsetDocument | null = null;
  private migrationDocumentId: string | null = null;
  private cache = new Map<number, Item>();
  private browseFilters = new Map<string, Query>();
  private api: GearingApi;
  constructor(api = new GearingApi()) {
    this.api = api;
  }
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  };
  getSnapshot = () => this.state;
  private update(patch: Partial<State>) {
    if (!this.alive) return;
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  report(error: unknown) {
    this.update({
      error: error instanceof Error ? error.message : String(error),
    });
  }
  clearError() {
    this.update({ error: null });
  }
  async initialize() {
    this.alive = true;
    const lifecycle = ++this.lifecycle;
    try {
      const data = await this.api.bootstrap();
      if (lifecycle !== this.lifecycle) return;
      const listing = await this.api.list();
      if (!this.alive || lifecycle !== this.lifecycle) return;
      this.update({ data, documents: listing.documents });
      if (listing.issues.length)
        this.report(
          new Error(
            "Some saved gearsets cannot be read. Their files have been retained.",
          ),
        );
      const current = localStorage.getItem("ors.gearing.active.v2");
      let document: GearsetDocument;
      let persisted = true;
      if (listing.documents.length)
        document = await this.api.load(
          listing.documents.find((d) => d.id === current)?.id ??
            listing.documents[0].id,
        );
      else {
        const legacy = localStorage.getItem("open-rising-stones.gearing.v1");
        if (legacy && !localStorage.getItem("ors.gearing.migrated.v2")) {
          try {
            document = await resolveLegacyAlternatives(
              migrateLegacy(legacy, "恢复的配装"),
              this.api,
            );
            persisted = false;
            this.migrationDocumentId = document.id;
          } catch (error) {
            this.update({ migrationIssue: true, loading: false });
            throw error;
          }
        } else {
          // First use waits for explicit job selection and never writes an unsolicited plan.
          this.update({ loading: false, needsSetup: true });
          return;
        }
      }
      await this.open(document, persisted);
      this.update({ loading: false });
    } catch (error) {
      this.update({ loading: false });
      this.report(error);
    }
  }
  private remember(evaluation: Evaluation) {
    for (const slot of Object.values(evaluation.slots))
      this.cache.set(slot.item.id, slot.item);
  }
  private async open(document: GearsetDocument, persisted = true) {
    this.cancel();
    this.previewSequence++;
    this.browseFilters.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.savedDocument = persisted ? structuredClone(document) : null;
    const job = this.state.data!.jobs.find((j) => j.id === document.job);
    if (!job) throw new Error("Saved job is not supported by this catalog.");
    const range = job.defaultItemLevel;
    this.update({
      document,
      saving: persisted ? "saved" : "unsaved",
      needsSetup: false,
      revision: this.state.revision + 1,
      evaluation: null,
      preview: null,
      previewEvaluation: null,
      previewing: false,
      proposal: null,
      proposalRevision: null,
      selection: job.slots[0].key,
      query: {
        ...defaultQuery,
        job: job.id,
        slot: job.slots[0].key,
      },
      conditions: {
        ...defaultConditions,
        kind: job.combat ? "combat" : "production",
        minLevel: range[0],
        maxLevel: range[1],
      },
      canUndo: false,
      canRedo: false,
    });
    if (persisted) localStorage.setItem("ors.gearing.active.v2", document.id);
    this.evaluate();
    void this.search();
    void this.refreshOptimizationSources();
  }
  async load(id: string) {
    await this.saveTail.catch(() => {});
    await this.open(await this.api.load(id));
  }
  async create(name: string, job = this.state.document?.job) {
    await this.saveTail.catch(() => {});
    const schema = this.state.data!.jobs.find((entry) => entry.id === job);
    if (!schema)
      throw new Error("Choose a supported job before creating a gearset.");
    await this.open(newDocument(name, job, schema.jobLevel), false);
    this.update({ migrationIssue: false });
  }
  async duplicate(name: string, source = this.state.document) {
    await this.saveTail.catch(() => {});
    if (source)
      await this.open(
        {
          ...structuredClone(source),
          id: crypto.randomUUID(),
          name,
        },
        false,
      );
  }
  edit(change: (draft: GearsetDocument) => void) {
    if (!this.state.document) return;
    const before = this.state.document;
    const draft = structuredClone(before);
    change(draft);
    if (JSON.stringify(before) === JSON.stringify(draft)) return;
    this.undoStack.push(before);
    if (this.undoStack.length > 100) this.undoStack.shift();
    this.redoStack = [];
    this.replace(draft);
  }
  private replace(document: GearsetDocument) {
    this.cancel();
    this.previewSequence++;
    this.update({
      document,
      saving:
        this.savedDocument &&
        JSON.stringify(document) === JSON.stringify(this.savedDocument)
          ? "saved"
          : "unsaved",
      revision: this.state.revision + 1,
      preview: null,
      previewEvaluation: null,
      previewing: false,
      proposal: null,
      proposalRevision: null,
      canUndo: !!this.undoStack.length,
      canRedo: !!this.redoStack.length,
      error: null,
    });
    this.evaluate();
  }
  undo() {
    const doc = this.undoStack.pop();
    if (doc && this.state.document) {
      this.redoStack.push(this.state.document);
      this.replace(doc);
    }
  }
  redo() {
    const doc = this.redoStack.pop();
    if (doc && this.state.document) {
      this.undoStack.push(this.state.document);
      this.replace(doc);
    }
  }
  async changeJob(job: string) {
    await this.saveTail.catch(() => {});
    const schema = this.state.data!.jobs.find((j) => j.id === job)!;
    const current = this.state.document;
    const empty =
      current &&
      !Object.keys(current.equipment).length &&
      !current.foodId &&
      !current.potionId;
    // Empty drafts keep their identity; populated drafts are preserved as separate plans.
    const next = newDocument(schema.name, job, schema.jobLevel);
    if (empty)
      Object.assign(next, {
        id: current.id,
        name: current.name,
        clan: current.clan,
      });
    await this.open(next, false);
  }
  hasUnsavedChanges() {
    return (
      !!this.state.document &&
      (!this.savedDocument ||
        JSON.stringify(this.state.document) !==
          JSON.stringify(this.savedDocument))
    );
  }
  async save() {
    const document = this.state.document;
    if (!document) return false;
    const revision = this.state.revision;
    const recovering = this.state.saving === "error";
    this.update({ saving: "saving" });
    const task = this.saveTail
      .catch(() => {})
      .then(() => this.api.save(document));
    this.saveTail = task;
    try {
      await task;
      if (!this.alive) return false;
      if (this.state.document?.id === document.id) {
        this.savedDocument = structuredClone(document);
        localStorage.setItem("ors.gearing.active.v2", document.id);
      }
      if (this.migrationDocumentId === document.id)
        localStorage.setItem("ors.gearing.migrated.v2", document.id);
      this.update({
        documents: [
          ...this.state.documents.filter((d) => d.id !== document.id),
          { id: document.id, name: document.name, job: document.job },
        ],
        ...(this.state.revision === revision
          ? { saving: "saved" as const, ...(recovering ? { error: null } : {}) }
          : this.state.document?.id === document.id
            ? { saving: "unsaved" as const }
            : {}),
      });
      return true;
    } catch (error) {
      this.update({ saving: "error" });
      this.report(error);
      return false;
    }
  }
  private evaluate() {
    clearTimeout(this.evaluateTimer);
    this.update({ evaluating: true });
    this.evaluateTimer = setTimeout(() => {
      void this.runEvaluation();
    }, 35);
  }
  private async runEvaluation() {
    const { document, revision, tiers } = this.state;
    if (!document) return;
    try {
      const result = await this.api.evaluate(document, revision, tiers);
      if (!this.alive || this.state.revision !== result.revision) return;
      this.remember(result.evaluation);
      this.update({ evaluation: result.evaluation, evaluating: false });
    } catch (error) {
      if (this.state.revision === revision) {
        this.update({ evaluating: false });
        this.report(error);
      }
    }
  }
  setTiers(tiers: boolean) {
    this.update({ tiers });
    this.evaluate();
  }
  select(selection: Selection) {
    this.previewSequence++;
    // Consumables and specialist stones use different item levels and acquisition paths.
    const group = (slot: Selection) =>
      ["food", "potion", "soul"].includes(slot) ? slot : "equipment";
    this.browseFilters.set(group(this.state.selection), this.state.query);
    const query = this.browseFilters.get(group(selection)) ?? {
      ...defaultQuery,
      job: this.state.document!.job,
    };
    this.update({
      selection,
      query: {
        ...query,
        slot: selection,
        search: "",
        offset: 0,
      },
      items: [],
      total: 0,
      preview: null,
      previewEvaluation: null,
      previewing: false,
    });
    void this.search();
  }
  filter(patch: Partial<Query>) {
    this.update({
      query: { ...this.state.query, ...patch, offset: patch.offset ?? 0 },
    });
    void this.search();
  }
  resetFilters() {
    this.filter({
      minLevel: 0,
      maxLevel: 9999,
      search: "",
      sourceIds: [],
      hideObsolete: false,
      sortStat: "",
      sortDirection: "desc",
    });
  }
  cancelPreview() {
    this.previewSequence++;
    this.update({ preview: null, previewEvaluation: null, previewing: false });
  }
  private async search() {
    const sequence = ++this.sequence;
    this.update({ querying: true });
    try {
      const result = await this.api.query(this.state.query);
      if (sequence !== this.sequence) return;
      for (const item of result.items) this.cache.set(item.id, item);
      this.update({ ...result, querying: false });
    } catch (error) {
      if (sequence === this.sequence) {
        this.update({ querying: false });
        this.report(error);
      }
    }
  }
  private put(document: GearsetDocument, item: Item) {
    if (item.kind === "food") document.foodId = item.id;
    else if (item.kind === "potion") document.potionId = item.id;
    else {
      const key = this.state.selection as Slot;
      const old = document.equipment[key];
      if (
        old &&
        (old.materias.some((m) => m.stat) ||
          Object.keys(old.customStats ?? {}).length)
      ) {
        const alternatives = document.alternatives[key] ?? [];
        document.alternatives[key] = [
          ...alternatives.filter((c) => c.itemId !== old.itemId),
          old,
        ];
      }
      const saved = document.alternatives[key]?.find(
        (c) => c.itemId === item.id,
      );
      document.equipment[key] = structuredClone(
        saved ?? configuration(item.id),
      );
    }
  }
  async preview(item: Item) {
    if (!this.state.document) return;
    const revision = this.state.revision;
    const sequence = ++this.previewSequence;
    const draft = structuredClone(this.state.document);
    this.put(draft, item);
    this.update({ preview: item, previewEvaluation: null, previewing: true });
    try {
      const result = await this.api.evaluate(draft, revision, this.state.tiers);
      if (sequence !== this.previewSequence || revision !== this.state.revision)
        return;
      this.update({ previewEvaluation: result.evaluation, previewing: false });
    } catch (error) {
      if (sequence === this.previewSequence) {
        this.update({ previewing: false });
        this.report(error);
      }
    }
  }
  applyPreview() {
    const item = this.state.preview;
    if (
      item &&
      this.state.previewEvaluation &&
      !this.state.previewEvaluation.issues.length
    )
      this.edit((draft) => this.put(draft, item));
  }
  remove(selection = this.state.selection) {
    this.edit((d) => {
      if (selection === "food") d.foodId = null;
      else if (selection === "potion") d.potionId = null;
      else delete d.equipment[selection];
    });
  }
  configure(slot: Slot, change: (gear: Equipment) => void) {
    this.edit((d) => {
      const gear = d.equipment[slot];
      if (gear) change(gear);
    });
  }
  clearMateria() {
    this.edit((d) => {
      for (const gear of Object.values(d.equipment))
        if (!gear.materiaLocked) gear.materias = [];
    });
  }
  setConditions(patch: Partial<Conditions>) {
    this.cancel();
    this.update({
      conditions: { ...this.state.conditions, ...patch },
      proposal: null,
      proposalRevision: null,
    });
    if (patch.minLevel !== undefined || patch.maxLevel !== undefined)
      void this.refreshOptimizationSources();
  }
  private async refreshOptimizationSources() {
    if (!this.state.document) return;
    const sequence = ++this.sourceSequence;
    try {
      const sourceIds = await this.api.sourceIds({
        job: this.state.document.job,
        minLevel: this.state.conditions.minLevel,
        maxLevel: this.state.conditions.maxLevel,
      });
      if (sequence === this.sourceSequence)
        this.update({ optimizationSourceIds: sourceIds });
    } catch (error) {
      this.report(error);
    }
  }
  async optimize() {
    if (!this.state.document) return;
    this.cancel();
    const id = crypto.randomUUID();
    this.requestId = id;
    const { revision, document, conditions } = this.state;
    this.update({
      running: true,
      startedAt: Date.now(),
      proposal: null,
      proposalRevision: null,
      error: null,
    });
    try {
      const proposal = await this.api.optimize(document, conditions, id);
      if (this.requestId !== id || revision !== this.state.revision) return;
      this.update({ proposal, proposalRevision: revision });
    } catch (error) {
      if (this.requestId === id) this.report(error);
    } finally {
      if (this.requestId === id) {
        this.requestId = null;
        this.update({ running: false });
      }
    }
  }
  cancel(userInitiated = false) {
    const id = this.requestId;
    this.requestId = null;
    if (id) void this.api.cancel(id).catch(() => {});
    this.update({
      running: false,
      ...(userInitiated
        ? {
            proposal: { status: "cancelled" as const },
            proposalRevision: this.state.revision,
          }
        : {}),
    });
  }
  applyProposal() {
    const { proposal, proposalRevision, revision } = this.state;
    if (proposal?.document && proposalRevision === revision)
      this.edit((d) => Object.assign(d, structuredClone(proposal.document)));
  }
  async saveProposal(name: string) {
    if (this.state.proposalRevision === this.state.revision) {
      await this.duplicate(name, this.state.proposal?.document);
      await this.save();
    }
  }
  chooseAlternative(index: number) {
    const value = this.state.proposal?.alternatives?.[index];
    if (value) this.update({ proposal: { ...this.state.proposal!, ...value } });
  }
  async import(text: string) {
    await this.saveTail.catch(() => {});
    await this.open(await importShare(text, "导入的配装", this.api), false);
  }
  share() {
    if (
      !this.state.document ||
      !this.state.evaluation ||
      this.state.evaluating ||
      this.state.evaluation.issues.length
    )
      throw new Error("Resolve gearset issues before sharing.");
    return shareDocument(this.state.document, this.cache);
  }
  dispose() {
    clearTimeout(this.evaluateTimer);
    this.cancel();
    this.alive = false;
    this.lifecycle++;
    this.sequence++;
    this.sourceSequence++;
    this.previewSequence++;
    this.listeners.clear();
  }
}
