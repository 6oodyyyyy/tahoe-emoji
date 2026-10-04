# ZWJ Investigation (2026-10-04)

## Problem
ZWJ emoji sequences (e.g., handshake, families) rendered as split components
in the picker on Windows, instead of single combined glyphs.

## Root Cause
The font's GDEF table was incomplete:
- Only 259 glyphs classified (162 marks, 97 bases)
- 2,924 ligature output glyphs had NO classification
- HarfBuzz (Linux) is lenient and applies GSUB ligatures anyway
- DirectWrite (Windows) is strict and requires proper GDEF glyph classes

## Fix
Added GDEF GlyphClassDef entries:
- All 2,924 ligature outputs → class 2 (ligature)
- All 3,250 bitmap glyphs → class 1 (base)
- Kept 162 marks as class 3

Script: font-swap/patch_gdef.py

## Verification
- HarfBuzz shaping: still works (1 glyph for ZWJ sequences)
- cmap intact (1470 entries)
- All 1,614 picker ZWJ sequences have exact ligature matches
