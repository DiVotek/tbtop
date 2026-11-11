<?php

namespace Tbtop\Admin\Http\Export;

/** The fixed parts of a one-sheet XLSX package, around the streamed sheet. */
final class XlsxParts
{
    private const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'."\n";

    private const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

    private const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

    private const PKG_REL = 'http://schemas.openxmlformats.org/package/2006/relationships';

    public const SHEET_OPEN = self::HEAD.'<worksheet xmlns="'.self::MAIN.'"><sheetViews><sheetView workbookViewId="0">'
        .'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>';

    public const SHEET_CLOSE = '</sheetData></worksheet>';

    /** @return array<string, string> Zip path → XML. */
    public static function static(): array
    {
        $ct = 'application/vnd.openxmlformats-officedocument.spreadsheetml';

        return [
            '[Content_Types].xml' => self::HEAD.'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                .'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                .'<Default Extension="xml" ContentType="application/xml"/>'
                .'<Override PartName="/xl/workbook.xml" ContentType="'.$ct.'.sheet.main+xml"/>'
                .'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="'.$ct.'.worksheet+xml"/>'
                .'<Override PartName="/xl/styles.xml" ContentType="'.$ct.'.styles+xml"/></Types>',
            '_rels/.rels' => self::HEAD.'<Relationships xmlns="'.self::PKG_REL.'">'
                .'<Relationship Id="rId1" Type="'.self::REL.'/officeDocument" Target="xl/workbook.xml"/></Relationships>',
            'xl/workbook.xml' => self::HEAD.'<workbook xmlns="'.self::MAIN.'" xmlns:r="'.self::REL.'">'
                .'<sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets></workbook>',
            'xl/_rels/workbook.xml.rels' => self::HEAD.'<Relationships xmlns="'.self::PKG_REL.'">'
                .'<Relationship Id="rId1" Type="'.self::REL.'/worksheet" Target="worksheets/sheet1.xml"/>'
                .'<Relationship Id="rId2" Type="'.self::REL.'/styles" Target="styles.xml"/></Relationships>',
            'xl/styles.xml' => self::HEAD.'<styleSheet xmlns="'.self::MAIN.'">'
                .'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
                .'<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
                .'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
                .'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
                .'<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
                .'<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
                .'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>',
        ];
    }
}
