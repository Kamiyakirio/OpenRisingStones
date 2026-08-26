/** Browser-preview fixtures and image fallbacks used by the glamour gallery. */
import type {
  Glamour,
  GlamourDetail,
  GlamourEquipment,
} from "../services/glamourApi";

export const PREVIEW_GLAMOURS: Glamour[] = [
  {
    id: 1,
    title: "凛冬远行者",
    author: "白金幻象",
    race: "人族 男性",
    raceIds: [1],
    genderIds: [1],
    job: "全职业",
    palette: "雾蓝",
    image: "/glamours/look-1.jpg",
    likes: 1286,
    saved: 462,
    featured: true,
  },
  {
    id: 2,
    title: "萨雷安午后",
    author: "椴木书签",
    race: "人族 男性",
    raceIds: [1],
    genderIds: [1],
    job: "治愈职业",
    palette: "灰黑",
    image: "/glamours/look-4.jpg",
    likes: 974,
    saved: 318,
  },
  {
    id: 3,
    title: "秋日裁缝札记",
    author: "薄荷泡芙",
    race: "人族 男性",
    raceIds: [1],
    genderIds: [1],
    job: "全职业",
    palette: "燕麦",
    image: "/glamours/look-7.jpg",
    likes: 860,
    saved: 251,
  },
  {
    id: 4,
    title: "白银誓约",
    author: "伊修加德信使",
    race: "人族 男性",
    raceIds: [1],
    genderIds: [1],
    job: "防护职业",
    palette: "雪白",
    image: "/glamours/look-9.jpg",
    likes: 743,
    saved: 229,
  },
  {
    id: 5,
    title: "红月旅人",
    author: "南风诗笺",
    race: "人族 男性",
    raceIds: [1],
    genderIds: [1],
    job: "进攻职业",
    palette: "绯红",
    image: "/glamours/look-5.jpg",
    likes: 612,
    saved: 186,
  },
  {
    id: 6,
    title: "工房发条梦",
    author: "铜钟茶会",
    race: "人族 男性",
    raceIds: [1],
    genderIds: [1],
    job: "魔法职业",
    palette: "棕褐",
    image: "/glamours/look-8.jpg",
    likes: 591,
    saved: 205,
  },
  {
    id: 7,
    title: "樱下夜行",
    author: "黑涡团裁缝",
    race: "人族 男性",
    raceIds: [1],
    genderIds: [1],
    job: "全职业",
    palette: "墨黑",
    image: "/glamours/look-6.jpg",
    likes: 534,
    saved: 172,
  },
  {
    id: 8,
    title: "暮庭学者",
    author: "星芒观测员",
    race: "人族 男性",
    raceIds: [1],
    genderIds: [1],
    job: "魔法职业",
    palette: "靛蓝",
    image: "/glamours/scholar.jpg",
    likes: 488,
    saved: 139,
  },
];

export const FALLBACK_GLAMOUR_IMAGES = [
  "/glamours/look-1.jpg",
  "/glamours/look-4.jpg",
  "/glamours/look-7.jpg",
];

const PREVIEW_EQUIPMENT: GlamourEquipment[] = [
  previewEquipment(
    "HEAD",
    44668,
    "皮带贝雷帽",
    "056804",
    "无瑕白染剂",
    "#f9f8f4",
  ),
  previewEquipment(
    "BODY",
    50874,
    "瓦纳·迪尔游击坎肩",
    "057371",
    "天空蓝染剂",
    "#83b0d2",
  ),
  previewEquipment(
    "GLOVES",
    6904,
    "恐狼治愈手套",
    "048406",
    "无瑕白染剂",
    "#f9f8f4",
  ),
  previewEquipment(
    "LEGS",
    8554,
    "豹纹女式海滩裙",
    "048988",
    "天空蓝染剂",
    "#83b0d2",
  ),
  previewEquipment(
    "FEET",
    47762,
    "月航员御敌大脚",
    "057824",
    "无瑕白染剂",
    "#f9f8f4",
  ),
  previewEquipment("EARS", 16167, "玻璃南瓜耳坠", "055382"),
  previewEquipment("MAIN_HAND", -1, null, null),
  previewEquipment("OFF_HAND", -1, null, null),
  previewEquipment("NECK", -1, null, null),
  previewEquipment("WRISTS", -1, null, null),
  previewEquipment("FINGER_LEFT", -1, null, null),
  previewEquipment("FINGER_RIGHT", -1, null, null),
];

/** Produces a complete browser-only record for visual development without login. */
export function createPreviewGlamourDetail(glamour: Glamour): GlamourDetail {
  const relatedImages = PREVIEW_GLAMOURS.filter(
    (item) => item.id !== glamour.id,
  )
    .slice(0, 2)
    .map((item) => item.image);
  return {
    ...glamour,
    description: "以清爽冷色为主的日常冒险搭配，适合城市漫步与好友合影。",
    images: [glamour.image, ...relatedImages],
    createdAt: "2026-08-21 14:06:04",
    areaName: "莫古力",
    groupName: "潮风亭",
    avatar: null,
    equipments: PREVIEW_EQUIPMENT,
  };
}

function previewEquipment(
  slot: string,
  equipmentId: number,
  name: string | null,
  iconId: string | null,
  dyeName?: string,
  dyeColor?: string,
): GlamourEquipment {
  const iconGroup = iconId ? `${iconId.slice(0, 3)}000` : null;
  return {
    slot,
    equipmentId,
    name,
    icon:
      iconId && iconGroup
        ? `https://ff14-eo.web.sdo.com/ffstones/item/icon/dcsvv4fowz2m/${iconGroup}/${iconId}_hr1.png`
        : null,
    dyes:
      dyeName && dyeColor
        ? [{ id: equipmentId, name: dyeName, color: dyeColor }]
        : [],
    isFashion: false,
  };
}
