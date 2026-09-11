/** Domain entities produced from the Wiki item source. */
export type WikiPageTransport = {
  html: string;
  url: string;
  source: "safari" | "webview";
};

export type WikiAcquisitionType =
  | "currency"
  | "dungeon"
  | "cash_shop"
  | "quest"
  | "exchange"
  | "craft"
  | "item"
  | "other";

export type WikiSourceDetail = {
  title: string;
  description: string;
  requirement: string | null;
  location: string | null;
  url: string | null;
  items: WikiSourceItem[];
};

export type WikiSourceItem = {
  name: string;
  quantity: string;
  note: string;
  iconUrl: string | null;
  url: string | null;
};

export type WikiAcquisition = {
  type: WikiAcquisitionType;
  label: string;
  summary: string;
  details: WikiSourceDetail[];
};

export type WikiModelRelation = "current" | "identical" | "primary";

export type WikiModelItem = {
  id: number | null;
  name: string;
  category: string;
  iconUrl: string | null;
  wikiUrl: string;
  relation: WikiModelRelation;
  dyeable: boolean | null;
  unobtainable: boolean;
  sourceSummary: string;
  sourceTypes: WikiAcquisitionType[];
};

export type WikiItemData = {
  itemName: string;
  pageTitle: string;
  canonicalUrl: string;
  unobtainable: boolean;
  acquisitions: WikiAcquisition[];
  modelItems: WikiModelItem[];
  source: WikiPageTransport["source"];
};

export type WikiStatusEvent = {
  requestId: number;
  status: "background_verification" | "interaction_required" | "complete";
  message: string;
};
