/** Retrieves Wiki HTML through Tauri and normalizes acquisition and shared-model data. */
import { invoke } from "@tauri-apps/api/core";
import type {
  WikiAcquisition,
  WikiAcquisitionType,
  WikiItemData,
  WikiModelItem,
  WikiModelRelation,
  WikiPageTransport,
  WikiSourceDetail,
  WikiSourceItem,
} from "@/features/wiki/model/wiki";

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

/** Parses stable Wiki section headings instead of depending on presentation text alone. */
export async function parseWikiItemPage(
  page: WikiPageTransport,
  requestedItemName: string,
  requestedItemId?: number,
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
  if (!content.length) throw new Error("Wiki 页面缺少物品正文");

  const textWithImages = (selection: ReturnType<typeof $>) => {
    const clone = selection.clone();
    clone.find("br").replaceWith(" ");
    clone.find("img").each((_, image) => {
      const imageNode = $(image);
      const itemLink = imageNode.closest(".item-link");
      const visibleItemLabel = normalizeText(
        itemLink.find(".item-name, .item-baseinfo").text(),
      );
      if (visibleItemLabel) {
        imageNode.remove();
        return;
      }
      const label =
        imageNode.attr("title") ??
        imageNode.closest("a[title]").attr("title") ??
        imageNode.attr("alt") ??
        "";
      if (isMeaningfulImageLabel(label)) imageNode.replaceWith(` ${label} `);
      else imageNode.remove();
    });
    clone.find(".item-link, .item-number").each((_, node) => {
      $(node).after(" ");
    });
    return normalizeText(clone.text());
  };
  const cleanCellText = (selection: ReturnType<typeof $>) => {
    const clone = selection.clone();
    clone.find(".color-warning, .eorzea-map-trigger").remove();
    return textWithImages(clone);
  };
  const firstDirectText = (selection: ReturnType<typeof $>) => {
    const clone = selection.clone();
    clone.children().remove();
    return normalizeText(clone.text());
  };
  const nodeUrl = (selection: ReturnType<typeof $>) => {
    const href = selection.find("a[href]").first().attr("href");
    return href ? resolveUrl(href, page.url) : null;
  };
  const nodeImageUrl = (selection: ReturnType<typeof $>) => {
    const image = selection.find("img").first();
    const srcset = image.attr("srcset") ?? "";
    const largestSource = srcset.split(",").at(-1)?.trim().split(/\s+/)[0];
    return resolveOptionalUrl(largestSource || image.attr("src"), page.url);
  };
  const buildDetail = (
    title: string,
    description: string,
    scope: ReturnType<typeof $>,
    url: string | null = null,
    items: WikiSourceItem[] = [],
  ): WikiSourceDetail | null => {
    const normalizedTitle = normalizeText(title);
    if (!normalizedTitle) return null;
    const requirementNode = scope.find(".color-warning").first();
    const questRequirement = normalizeText(
      requirementNode.find(".quest-name").first().text(),
    );
    const achievementRequirement = normalizeText(
      requirementNode.find(".achievement-name").first().text(),
    );
    const requirement = questRequirement
      ? `需要完成任务《${questRequirement}》`
      : achievementRequirement
        ? `需要获得成就《${achievementRequirement}》`
        : normalizeText(requirementNode.text());
    const location = normalizeText(scope.find(".eorzea-map-trigger").text());
    const normalizedDescription = normalizeText(description);
    return {
      title: normalizedTitle,
      description:
        normalizedDescription === normalizedTitle ? "" : normalizedDescription,
      requirement: requirement || null,
      location: location || null,
      url,
      items,
    };
  };

  const acquisitions: WikiAcquisition[] = [];
  content.children("h2").each((_, headingElement) => {
    const heading = $(headingElement);
    const label = normalizeText(heading.text());
    const type = classifyHeading(label);
    if (!type) return;

    const section = $("<section></section>");
    let cursor = heading.next();
    while (cursor.length && !cursor.is("h2")) {
      section.append(cursor.clone());
      cursor = cursor.next();
    }
    const details: WikiSourceDetail[] = [];
    const addDetail = (detail: WikiSourceDetail | null) => {
      if (
        detail &&
        !details.some(
          (current) =>
            current.title === detail.title &&
            current.description === detail.description &&
            current.location === detail.location,
        )
      ) {
        details.push(detail);
      }
    };

    if (type === "dungeon") {
      section.find(".instance-list--flex-item").each((_, instanceElement) => {
        const instance = $(instanceElement);
        addDetail(
          buildDetail(
            instance.find(".instance-list--name a").first().text(),
            instance.find(".instance-list--bossname").text(),
            instance,
            nodeUrl(instance),
          ),
        );
      });
    } else if (type === "cash_shop") {
      section.find("table").each((_, tableElement) => {
        const table = $(tableElement);
        const values = new Map<string, ReturnType<typeof $>>();
        table.find("tr").each((_, rowElement) => {
          const row = $(rowElement);
          const key = normalizeText(row.find("th").first().text());
          const value = row.find("td").first();
          if (key && value.length && !values.has(key)) values.set(key, value);
        });
        const product = values.get("商品名称");
        if (product) {
          addDetail(
            buildDetail(
              textWithImages(product),
              values.get("价格") ? textWithImages(values.get("价格")!) : "",
              table,
              nodeUrl(product),
            ),
          );
        }
      });
    } else if (type === "item") {
      section.find(".ff14-flex-item").each((_, blockElement) => {
        const block = $(blockElement);
        const sourceItem = block
          .find(".block-title .item-link[data-type='item']")
          .first();
        if (!sourceItem.length) return;
        addDetail(
          buildDetail(
            sourceItem.find(".item-name").first().text(),
            sourceItem.find(".item-category").first().text(),
            block,
            nodeUrl(sourceItem),
          ),
        );
      });
    } else if (type === "craft") {
      section.find("table.item-craft-table").each((_, tableElement) => {
        const table = $(tableElement);
        const facts = table
          .find(".ff14-content-box-block ul")
          .first()
          .children("li")
          .map((_, fact) => normalizeText($(fact).text()))
          .get();
        const professionIndex = facts.indexOf("制作职业");
        const levelIndex = facts.indexOf("配方等级");
        const profession =
          professionIndex >= 0 ? facts[professionIndex + 1] : "制作职业";
        const recipeLevel = levelIndex >= 0 ? facts[levelIndex + 1] : "";
        const materials = table
          .find(".item-craft-list")
          .first()
          .children("li")
          .children("ul")
          .children("li")
          .children("div")
          .map((_, materialElement) => {
            const material = $(materialElement);
            const itemLink = material
              .find(".item-link[data-type='item']")
              .first();
            const name = normalizeText(
              itemLink.find(".item-name").first().text(),
            );
            if (!name) return null;
            const quantity = normalizeText(
              material.find(".item-number").first().text(),
            );
            const noteNode = material.clone();
            noteNode.find(".item-link, .item-number").remove();
            const note = normalizeText(noteNode.text()).replace(/^\[|\]$/g, "");
            return {
              name,
              quantity,
              note,
              iconUrl: nodeImageUrl(itemLink),
              url: nodeUrl(itemLink),
            } satisfies WikiSourceItem;
          })
          .get()
          .filter((material): material is WikiSourceItem => material !== null);
        addDetail(
          buildDetail(
            `${profession}${recipeLevel ? ` ${recipeLevel}级配方` : ""}`,
            "",
            table,
            null,
            materials,
          ),
        );
      });
    } else {
      section.find("table tr").each((_, rowElement) => {
        const row = $(rowElement);
        const cells = row.find("td");
        if (!cells.length) return;
        if (type === "exchange" && cells.length >= 3) {
          const npc = cells.eq(2);
          addDetail(
            buildDetail(
              firstDirectText(npc) || cleanCellText(npc),
              cleanCellText(cells.eq(1)),
              row,
            ),
          );
          return;
        }
        if (type === "quest" && cells.length >= 2) {
          const quest = cells.eq(1);
          const npc = cells.eq(2);
          addDetail(
            buildDetail(
              quest.find(".quest-name").first().text() || cleanCellText(quest),
              cleanCellText(npc),
              row,
              nodeUrl(quest),
            ),
          );
          return;
        }
        const titleCell = cells.first();
        const detailCell = cells.eq(Math.min(1, cells.length - 1));
        addDetail(
          buildDetail(
            cleanCellText(titleCell),
            cleanCellText(detailCell),
            row,
            null,
          ),
        );
      });
    }

    const questUnlockedClaim =
      type === "exchange" &&
      details.length > 0 &&
      details.every(
        (detail) => detail.requirement && isZeroCost(detail.description),
      );
    if (questUnlockedClaim) {
      details.forEach((detail) => {
        detail.description = "完成前置任务后免费领取";
      });
    }
    const currencyExchange =
      !questUnlockedClaim &&
      type === "exchange" &&
      details.length > 0 &&
      details.every((detail) => isCurrencyCost(detail.description));
    const acquisitionType: WikiAcquisitionType = questUnlockedClaim
      ? "quest"
      : currencyExchange
        ? "currency"
        : type;
    const acquisitionLabel = questUnlockedClaim
      ? "任务解锁领取"
      : currencyExchange
        ? "货币兑换"
        : label;
    const paragraph = section
      .children("p")
      .map((_, node) => normalizeText($(node).text()))
      .get()
      .find(Boolean);
    const summary =
      paragraph ||
      (questUnlockedClaim
        ? "完成任务后免费领取"
        : details.length === 1
          ? type === "exchange"
            ? details[0].description || details[0].title
            : details[0].title
          : details.length > 1
            ? `${details.length} 种途径`
            : label);
    acquisitions.push({
      type: acquisitionType,
      label: acquisitionLabel,
      summary,
      details,
    });
  });

  const modelItems: WikiModelItem[] = [];
  const modelHeading = content
    .children("h2")
    .filter((_, heading) => normalizeText($(heading).text()) === "同模型装备")
    .first();
  if (modelHeading.length) {
    let relation: WikiModelRelation = "current";
    let cursor = modelHeading.next();
    while (cursor.length && !cursor.is("h2")) {
      cursor.find("tr").each((_, rowElement) => {
        const row = $(rowElement);
        const header = normalizeText(row.find("th").first().text());
        if (header.includes("模型完全相同")) {
          relation = "identical";
          return;
        }
        if (header.includes("主模型相同")) {
          relation = "primary";
          return;
        }
        const cells = row.find("td");
        const itemLink = cells
          .eq(0)
          .find(".item-link[data-type='item']")
          .first();
        if (!itemLink.length || cells.length < 3) return;
        const rawId = Number(itemLink.attr("data-name"));
        const name = normalizeText(itemLink.find(".item-name").first().text());
        if (!name) return;
        const sourceSummary = textWithImages(cells.eq(2));
        const itemAnchor = itemLink.find("a[href]").first();
        modelItems.push({
          id: Number.isSafeInteger(rawId) && rawId > 0 ? rawId : null,
          name,
          category: normalizeText(
            itemLink.find(".item-category").first().text(),
          ),
          iconUrl: nodeImageUrl(itemLink),
          wikiUrl: itemAnchor.length
            ? resolveUrl(itemAnchor.attr("href"), page.url)
            : canonicalUrl,
          relation,
          dyeable: cells.eq(1).find(".fa-check").length
            ? true
            : cells.eq(1).find(".fa-times").length
              ? false
              : null,
          unobtainable: itemLink.find(".item-icon--unobtainable").length > 0,
          sourceSummary,
          sourceTypes: classifySourceText(sourceSummary),
        });
      });
      cursor = cursor.next();
    }
  }

  const mainItemUnobtainable =
    content.find(".infobox-item--icon .item-icon--unobtainable").length > 0;
  if (!modelItems.some((model) => model.relation === "current")) {
    modelItems.unshift({
      id:
        requestedItemId && Number.isSafeInteger(requestedItemId)
          ? requestedItemId
          : null,
      name: itemName,
      category: "",
      iconUrl: null,
      wikiUrl: canonicalUrl,
      relation: "current",
      dyeable: null,
      unobtainable: mainItemUnobtainable,
      sourceSummary: acquisitions.map((source) => source.label).join("、"),
      sourceTypes: acquisitions.map((source) => source.type),
    });
  }

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
    unobtainable:
      mainItemUnobtainable ||
      Boolean(
        modelItems.find((model) => model.relation === "current")?.unobtainable,
      ),
    acquisitions,
    modelItems,
    source: page.source,
  };
}

function classifyHeading(label: string): WikiAcquisitionType | null {
  if (label.includes("道具商城")) return "cash_shop";
  if (label.includes("副本")) return "dungeon";
  if (label.includes("商店购买") || label.includes("货币购买")) {
    return "currency";
  }
  if (label.includes("任务奖励")) return "quest";
  if (label.includes("兑换获得")) return "exchange";
  if (label.includes("制作配方")) return "craft";
  if (label.includes("使用物品获得")) return "item";
  if (/^通过.+获得$/.test(label)) return "other";
  return null;
}

function classifySourceText(value: string): WikiAcquisitionType[] {
  const types: WikiAcquisitionType[] = [];
  const add = (type: WikiAcquisitionType) => {
    if (!types.includes(type)) types.push(type);
  };
  if (value.includes("道具商城") || value.includes("点券")) add("cash_shop");
  if (value.includes("副本") || value.includes("掉落")) add("dungeon");
  if (
    value.includes("商店") ||
    /\d+\s*(?:金币|金碟币|狼印|军票|[^，。（）]{0,12}(?:神典石|战绩|徽章|票|币))/.test(
      value,
    )
  ) {
    add("currency");
  }
  if (value.includes("任务")) add("quest");
  if (value.includes("兑换")) add("exchange");
  if (value.includes("制作")) add("craft");
  if (value.includes("物品箱") || value.includes("使用物品")) add("item");
  return types.length ? types : ["other"];
}

function normalizeText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/(\d)(金币|金碟币|狼印|点券)/g, "$1 $2")
    .trim();
}

function isMeaningfulImageLabel(value: string) {
  const label = value.trim();
  return Boolean(
    label &&
    !/\.(?:png|jpe?g|gif|webp|svg)$/i.test(label) &&
    !/^[a-f\d]{16,}$/i.test(label),
  );
}

function isZeroCost(value: string) {
  return /^(?:[^×\s]+\s*)?×\s*0$/.test(value.trim());
}

function isCurrencyCost(value: string) {
  return /^(?:亚拉戈.+神典石|战利水晶|.+(?:金币|币|战绩|军票|徽章|票))\s*×\s*[1-9]\d*$/.test(
    value.trim(),
  );
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
