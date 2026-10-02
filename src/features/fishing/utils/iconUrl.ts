/** XIVAPI's static image path groups six-digit icon IDs by thousands. */
export function xivIconUrl(icon: number | string) {
  const file = String(icon).padStart(6, "0");
  return `https://xivapi.com/i/${file.slice(0, 3)}000/${file}.png`;
}
