/** The CSV writer surface used by synthetic sheets; runtime implementation stays in Papa Parse. */
declare module "papaparse" {
  type CsvData = { fields: string[]; data: (string | number)[][] };
  const Papa: { unparse(data: CsvData): string };
  export default Papa;
}
