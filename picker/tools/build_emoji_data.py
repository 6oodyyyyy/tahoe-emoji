#!/usr/bin/env python3
"""Build ui/emoji-data.js from iamcal emoji-data.

Output: window.EMOJI_DATA = [{e, n, k, g, s?}]
  e: emoji character
  n: display name ("grinning face")
  k: keyword string ("grin smiling happy")
  g: Tahoe tab index 0..7 (0=Smileys&People, 1=Animals, 2=Food, 3=Activity,
     4=Travel, 5=Objects, 6=Symbols, 7=Flags)
  s: optional skin-tone variant characters
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'data', 'iamcal-emoji.json')
DST = os.path.join(HERE, '..', 'ui', 'emoji-data.js')

GROUP_MAP = {
    # value: (tahoe tab, order within tab)
    'Smileys & Emotion': (0, 0),
    'People & Body': (0, 1),
    'Animals & Nature': (1, 0),
    'Food & Drink': (2, 0),
    'Activities': (3, 0),
    'Travel & Places': (4, 0),
    'Objects': (5, 0),
    'Symbols': (6, 0),
    'Flags': (7, 0),
    # 'Component' -> skipped
}


def to_char(unified):
    return ''.join(chr(int(c, 16)) for c in unified.split('-'))


def main():
    raw = json.load(open(SRC, encoding='utf-8'))
    out = []
    skipped = 0
    for e in raw:
        gm = GROUP_MAP.get(e.get('category'))
        if gm is None:
            skipped += 1
            continue
        g, sub = gm
        try:
            ch = to_char(e['unified'])
        except (KeyError, ValueError):
            skipped += 1
            continue
        name = (e.get('short_name') or e.get('name') or '').replace('_', ' ')
        keywords = ' '.join(s.replace('_', ' ') for s in e.get('short_names', []))
        item = {'e': ch, 'n': name, 'k': keywords, 'g': g, '_s': sub,
                '_o': e.get('sort_order') if isinstance(e.get('sort_order'), int) else 99999}
        skins = []
        for _tone, v in (e.get('skin_variations') or {}).items():
            try:
                skins.append(to_char(v['unified']))
            except (KeyError, ValueError):
                pass
        if skins:
            item['s'] = skins
        out.append(item)
    # sort: smileys before people within tab 0 (macOS order), then Unicode sort_order
    out.sort(key=lambda x: (x['g'], x['_s'], x['_o']))
    for x in out:
        del x['_s']
        del x['_o']
    js = 'window.EMOJI_DATA = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
    with open(DST, 'w', encoding='utf-8') as f:
        f.write(js)
    print(f'wrote {len(out)} emoji, skipped {skipped} -> {DST} ({len(js)//1024} KB)')


if __name__ == '__main__':
    main()
