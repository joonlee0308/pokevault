import re, numpy as np
from PIL import Image, ImageDraw
import os; S=os.path.dirname(os.path.abspath(__file__))+'/'
K=4  # supersampling
WHITE=(244,247,252,255); SHADE=(208,217,233,255); NAVY=(33,49,112,255); INK=(27,35,51,255); GREY=(186,196,214,255)

def path_pts(d):
    toks=re.findall(r'[MLCQZ]|-?\d+\.?\d*',d); i=0; pts=[]; cur=(0,0); polys=[]
    def num():
        nonlocal i; v=float(toks[i]); i+=1; return v
    while i<len(toks):
        c=toks[i]; i+=1
        if c=='M':
            if pts: polys.append(pts)
            cur=(num(),num()); pts=[cur]
        elif c=='L': cur=(num(),num()); pts.append(cur)
        elif c=='C':
            p1=(num(),num()); p2=(num(),num()); p3=(num(),num()); p0=cur
            for t in np.linspace(0,1,24)[1:]:
                u=1-t; pts.append((u**3*p0[0]+3*u*u*t*p1[0]+3*u*t*t*p2[0]+t**3*p3[0], u**3*p0[1]+3*u*u*t*p1[1]+3*u*t*t*p2[1]+t**3*p3[1]))
            cur=p3
        elif c=='Q':
            p1=(num(),num()); p2=(num(),num()); p0=cur
            for t in np.linspace(0,1,20)[1:]:
                u=1-t; pts.append((u*u*p0[0]+2*u*t*p1[0]+t*t*p2[0], u*u*p0[1]+2*u*t*p1[1]+t*t*p2[1]))
            cur=p2
        elif c=='Z':
            if pts: pts.append(pts[0])
    if pts: polys.append(pts)
    return polys

def mirror(d, cx=465):
    out=[]; toks=re.findall(r'[MLCQZ]|-?\d+\.?\d*',d); xflag=True
    for t in toks:
        if t in 'MLCQZ': out.append(t); xflag=True
        else:
            v=float(t)
            out.append(str(2*cx-v) if xflag else t); xflag=not xflag
    return ' '.join(out)

class Layer:
    def __init__(s): s.im=Image.new('RGBA',(1024*K,1024*K),(0,0,0,0)); s.d=ImageDraw.Draw(s.im)
    def shape(s,d,fill=None,stroke=INK,w=6):
        for poly in path_pts(d):
            P=[(x*K,y*K) for x,y in poly]
            if fill: s.d.polygon(P,fill=fill)
            if stroke and w: s.d.line(P,fill=stroke,width=int(w*K),joint='curve')
            if stroke and w:
                r=w*K/2
                for x,y in (P[0],P[-1]): s.d.ellipse([x-r,y-r,x+r,y+r],fill=stroke)
    def mask(s,d):
        m=Image.new('L',(1024,1024),0); dd=ImageDraw.Draw(m)
        for poly in path_pts(d): dd.polygon(poly,fill=255)
        return np.asarray(m)>0
    def out(s): return s.im.resize((1024,1024),Image.LANCZOS)


def compose(back,front,pika_file,transparent=False):
    bg=Image.new('RGBA',(1024,1024),(0,0,0,0)) if transparent else Image.open(S+'bg.svg.png').convert('RGBA').resize((1024,1024))
    bg.alpha_composite(back.out()); bg.alpha_composite(Image.open(S+pika_file).convert('RGBA')); bg.alpha_composite(front.out())
    return bg
