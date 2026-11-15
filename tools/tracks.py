import json, sys
d = json.load(open(sys.argv[1])); N = len(d)
def cands(f):
    pts = []
    for x,y,w,h,c in f['faces']:
        pts.append(dict(x=x+w/2, y=y-h*0.25, s=w, src='f'))
    for x,y,w,h,c in f['bodies']:
        cx = x+w/2
        if any(p['src']=='f' and x<=p['x']<=x+w and y-0.03<=p['y']<=y+h for p in pts): continue
        pts.append(dict(x=cx, y=y+h*0.02, s=w*0.42, src='b'))
    return pts
tracks = []
for i,f in enumerate(d):
    used=set()
    for p in cands(f):
        best=None;bd=0.09
        for t in tracks:
            if t['id'] in used or i-t['last']>8: continue
            lp=t['pts'][t['last']]
            dist=((p['x']-lp['x'])**2+((p['y']-lp['y'])*1.78)**2)**.5
            if dist<bd: bd=dist;best=t
        if best is None:
            best=dict(id=len(tracks),pts={},last=i); tracks.append(best)
        best['pts'][i]=p; best['last']=i; used.add(best['id'])
out=[]
for t in tracks:
    ks=sorted(t['pts'])
    if len(ks)<8: continue
    a,b=ks[0],ks[-1]; full={}
    for i in range(a,b+1):
        if i in t['pts']: full[i]=t['pts'][i]; continue
        lo=max(k for k in ks if k<i); hi=min(k for k in ks if k>i); r=(i-lo)/(hi-lo)
        full[i]={k:t['pts'][lo][k]+(t['pts'][hi][k]-t['pts'][lo][k])*r for k in 'xys'}
    # centered smoothing
    sm=[]
    for i in range(a,b+1):
        win=[full[j] for j in range(max(a,i-2),min(b,i+2)+1)]
        sm.append([round(sum(w[k] for w in win)/len(win),4) for k in 'xys'])
    out.append(dict(start=a,frames=sm))
    print('track',t['id'],'frames',a,b,'n',len(ks),'x0',sm[0][0],'x1',sm[-1][0])
json.dump(dict(fps=30000/1001,count=N,tracks=out),open(sys.argv[2],'w'))
