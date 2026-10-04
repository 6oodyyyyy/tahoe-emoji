"""Patch GDEF table in Apple emoji font to classify ligature glyphs.
Fixes ZWJ ligatures not applying on Windows (DirectWrite requires GDEF glyph classes).
Run on the target Windows machine: python patch_gdef.py <font_path>
"""
import sys
from fontTools.ttLib import TTFont

def patch_gdef(font_path):
    print(f'Loading {font_path}...', flush=True)
    f = TTFont(font_path, lazy=True)

    # Collect ligature output glyphs from GSUB
    gsub = f['GSUB'].table
    lig_outputs = set()
    for lookup in gsub.LookupList.Lookup:
        if lookup.LookupType != 4:
            continue
        for sub in lookup.SubTable:
            for first, ligs in sub.ligatures.items():
                for lig in ligs:
                    out = getattr(lig, 'LigGlyph', None)
                    if out:
                        lig_outputs.add(out)
    print(f'Found {len(lig_outputs)} ligature outputs', flush=True)

    # Update GDEF
    gdef = f['GDEF'].table
    if gdef.GlyphClassDef is None:
        from fontTools.ttLib.tables.otTables import GlyphClassDef as GCD
        gdef.GlyphClassDef = GCD()
    classDefs = gdef.GlyphClassDef.classDefs

    added_lig = 0
    for gname in lig_outputs:
        if gname not in classDefs:
            classDefs[gname] = 2
            added_lig += 1

    # Classify bitmap glyphs as base (class 1)
    cbdt = f['CBDT']
    added_base = 0
    for sd in cbdt.strikeData:
        for gname in sd.keys():
            if gname not in classDefs:
                classDefs[gname] = 1
                added_base += 1

    print(f'Added {added_lig} ligatures (class 2), {added_base} bases (class 1)', flush=True)
    print(f'Total classified: {len(classDefs)}', flush=True)

    print('Saving...', flush=True)
    f.save(font_path)
    print('Done', flush=True)

if __name__ == '__main__':
    patch_gdef(sys.argv[1])
