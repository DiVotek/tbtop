/** The fixed parts of a one-sheet XLSX package, around the streamed sheet (XlsxParts.php). */
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const MAIN = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const PKG_REL = "http://schemas.openxmlformats.org/package/2006/relationships";
const CT = "application/vnd.openxmlformats-officedocument.spreadsheetml";

export const SHEET_OPEN = `${HEAD}<worksheet xmlns="${MAIN}"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>`;

export const SHEET_CLOSE = "</sheetData></worksheet>";

const STYLES = [
	'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>',
	'<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>',
	'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>',
	'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
	'<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>',
	'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>',
	'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
].join("");

/** Zip path → XML. */
export const XLSX_PARTS: Record<string, string> = {
	"[Content_Types].xml": `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="${CT}.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="${CT}.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="${CT}.styles+xml"/></Types>`,
	"_rels/.rels": `${HEAD}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
	"xl/workbook.xml": `${HEAD}<workbook xmlns="${MAIN}" xmlns:r="${REL}"><sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>`,
	"xl/_rels/workbook.xml.rels": `${HEAD}<Relationships xmlns="${PKG_REL}"><Relationship Id="rId1" Type="${REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${REL}/styles" Target="styles.xml"/></Relationships>`,
	"xl/styles.xml": `${HEAD}<styleSheet xmlns="${MAIN}">${STYLES}</styleSheet>`,
};
