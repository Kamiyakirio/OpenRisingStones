/** Retrieves wiki HTML through Tauri and parses it with Cheerio's browser build. */
import { invoke } from "@tauri-apps/api/core";

export type WikiPageTransport = {
  html: string;
  url: string;
  source: "safari" | "webview";
};

export type WikiItemFact = {
  label: string;
  value: string;
};

export type WikiItemData = {
  itemName: string;
  pageTitle: string;
  canonicalUrl: string;
  imageUrl: string | null;
  description: string;
  facts: WikiItemFact[];
  source: WikiPageTransport["source"];
};

export type WikiStatusEvent = {
  requestId: number;
  status: "background_verification" | "interaction_required" | "complete";
  message: string;
};

export async function fetchWikiItemPage(itemName: string) {
  return invoke<WikiPageTransport>("fetch_wiki_item_page", {
    request: { itemName },
  });
}

export async function showWikiVerification() {
  await invoke("show_wiki_verification");
}

export async function cancelWikiVerification() {
  await invoke("cancel_wiki_verification");
}

export async function parseWikiItemPage(
  page: WikiPageTransport,
  requestedItemName: string,
): Promise<WikiItemData> {
  if (page.html.length < 200 || page.html.length > 2 * 1024 * 1024) {
    throw new Error("Wiki 页面内容大小异常");
  }
  const { load } = await import("cheerio/slim");
  const $ = load(page.html);
  const pageTitle = normalizeText($("title").first().text());
  if (!pageTitle || pageTitle.toLowerCase().includes("just a moment")) {
    throw new Error("Wiki 页面仍处于访问验证状态");
  }

  const titleItemName =
    pageTitle.match(/^物品\s*[:：]\s*(.*?)\s+-\s+/)?.[1] ?? "";
  const itemName =
    normalizeText($(".infobox-item--name-title").first().text()) ||
    normalizeText(titleItemName) ||
    requestedItemName;
  const canonicalUrl = resolveUrl(
    $("link[rel='canonical']").attr("href"),
    page.url,
  );
  const content = $("#mw-content-text .mw-parser-output").first();
  let description = "";
  content.find("p").each((_, paragraph) => {
    const value = normalizeText($(paragraph).text());
    if (value.length >= 8 && !value.startsWith("※")) {
      description = value.slice(0, 500);
      return false;
    }
  });
  const findImage = (selector: string) =>
    content
      .find(selector)
      .filter((_, element) => {
        const source =
          $(element).attr("src") ?? $(element).attr("data-src") ?? "";
        const alt = ($(element).attr("alt") ?? "").toLowerCase();
        return (
          Boolean(source) &&
          !source.includes("avatar") &&
          !source.includes("logo") &&
          !alt.startsWith("flag_") &&
          !alt.startsWith("flag ")
        );
      })
      .first();
  let image = findImage(".infobox-item--icon .item-icon--img img");
  if (!image.length) {
    image = findImage(".item-icon--img img");
  }
  if (!image.length) {
    image = findImage("table img, .floatnone img, img");
  }
  const imageUrl = resolveOptionalUrl(
    image.attr("src") ?? image.attr("data-src"),
    page.url,
  );
  const facts: WikiItemFact[] = [];
  const addFact = (label: string, value: string) => {
    const normalizedLabel = normalizeText(label).replace(/[：:]$/, "");
    const normalizedValue = normalizeText(value);
    if (
      !normalizedLabel ||
      !normalizedValue ||
      facts.some((fact) => fact.label === normalizedLabel)
    ) {
      return;
    }
    facts.push({ label: normalizedLabel, value: normalizedValue });
  };
  addFact("分类", $(".infobox-item--name-category").first().text());
  addFact(
    "品级",
    $(".infobox-item--level")
      .first()
      .text()
      .replace(/^\s*品级\s*/, ""),
  );
  addFact("可用职业", $(".infobox-item--job").first().text());
  addFact("装备等级", $(".infobox-item--equiplevel").first().text());
  content.find(".infobox-item--base-stat-item").each((_, stat) => {
    addFact(
      $(stat).find(".stat-type").first().text(),
      $(stat).find(".stat-value").first().text(),
    );
  });
  content.find(".item-quick-fact .ff14-content-box-block li").each((_, row) => {
    if (facts.length >= 24) return false;
    const value = normalizeText($(row).text());
    const separator = value.search(/[：:]/);
    if (separator > 0) {
      addFact(value.slice(0, separator), value.slice(separator + 1));
    }
  });
  content.find("table tr").each((_, row) => {
    if (facts.length >= 24) return false;
    const label = normalizeText($(row).find("th").first().text());
    const value = normalizeText($(row).find("td").first().text());
    if (label !== value) addFact(label, value);
  });

  if (
    !page.html.includes(requestedItemName) &&
    itemName !== requestedItemName
  ) {
    throw new Error("Wiki 返回的物品与请求不一致");
  }
  return {
    itemName,
    pageTitle,
    canonicalUrl,
    imageUrl,
    description,
    facts,
    source: page.source,
  };
}

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function resolveOptionalUrl(value: string | undefined, base: string) {
  if (!value) return null;
  return resolveUrl(value, base);
}

function resolveUrl(value: string | undefined, base: string) {
  try {
    return new URL(value || base, base).toString();
  } catch {
    return base;
  }
}
