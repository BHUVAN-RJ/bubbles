"""Merge track fragments that belong to one person and write mockup/assets/tracks.js.
Usage: python3 export.py tracks.json out.js "0" "2" "1+3"
Each argument is one person, built from one or more track indexes joined by '+'."""
import json, sys
T = json.load(open(sys.argv[1])); tr = T['tracks']
def frames(t): return {t['start'] + i: f for i, f in enumerate(t['frames'])}
people = []
for spec in sys.argv[3:]:
    m = {}
    for k in spec.split('+'): m.update(frames(tr[int(k)]))
    ks = sorted(m); a, b = ks[0], ks[-1]
    for i in range(a, b + 1):
        if i in m: continue
        lo = max(k for k in ks if k < i); hi = min(k for k in ks if k > i); r = (i - lo) / (hi - lo)
        m[i] = [round(m[lo][j] + (m[hi][j] - m[lo][j]) * r, 4) for j in range(3)]
    people.append(dict(start=a, frames=[m[i] for i in range(a, b + 1)]))
    print(spec, a, b)
open(sys.argv[2], 'w').write('window.TRACKS = ' + json.dumps(dict(fps=T['fps'], count=T['count'], people=people)) + ';\n')
