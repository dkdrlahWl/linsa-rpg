#!/usr/bin/env python3
"""Point every import specifier of the given rebirth modules at one fresh ?v= URL via index.html's importmap.

Usage: python3 scripts/bump-importmap.py VERSION file1.mjs file2.mjs ...
Browsers cache modules per URL; mapping all known specifiers (with or without ?v=) of a changed file to
./file.mjs?v=VERSION makes every client fetch the new code once and share a single module instance.
"""
import json, re, sys, pathlib

root = pathlib.Path(__file__).resolve().parent.parent / 'rebirth'
version, files = sys.argv[1], sys.argv[2:]
html_path = root / 'index.html'
html = html_path.read_text()
m = re.search(r'(<script type="importmap">)(.*?)(</script>)', html, re.S)
imap = json.loads(m.group(2))
imports = imap['imports']

sources = [p for p in root.glob('*.mjs')] + [p for p in root.glob('*.html')] + [p for p in root.glob('*.ts')]
for name in files:
    target = f'./{name}?v={version}'
    pattern = re.compile(r"""['"](\./""" + re.escape(name) + r"""(?:\?v=[^'"]*)?)['"]""")
    specs = set()
    for src in sources:
        specs.update(pattern.findall(src.read_text(errors='ignore')))
    specs.update(k for k in imports if k == f'./{name}' or k.startswith(f'./{name}?'))
    specs.add(f'./{name}')
    for spec in sorted(specs):
        if spec != target:
            imports[spec] = target
    # Values that pointed at an older URL of this file also move to the new one.
    for k, v in list(imports.items()):
        if v == f'./{name}' or v.startswith(f'./{name}?'):
            imports[k] = target
    print(name, len(specs), 'specifiers ->', target)

html = html[:m.start(2)] + json.dumps(imap, ensure_ascii=False, separators=(',', ':')) + html[m.end(2):]
html_path.write_text(html)
