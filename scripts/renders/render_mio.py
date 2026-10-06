"""Render Mio con el renderizador original (raymarcher SDF).
Uso:
  python render_mio.py                                   # idle, violeta, 1400x1600 -> mio_idle_violet.png
  python render_mio.py --mood celebrating --body titanio --w 800 --h 900 --ss 2
  python render_mio.py --all                             # 5 estados + 3 materiales
  python render_mio.py --yaw 0 --elev 0                  # vista frontal
moods : idle working celebrating anomaly sleeping
bodies: violet titanio obsidiana
"""
import argparse, cv2, numpy as np, mio3d
p=argparse.ArgumentParser()
p.add_argument("--mood",default="idle"); p.add_argument("--body",default="violet")
p.add_argument("--w",type=int,default=1400); p.add_argument("--h",type=int,default=1600)
p.add_argument("--ss",type=int,default=2,help="supersampling (2 = igual que la lamina)")
p.add_argument("--yaw",type=float,default=30.0); p.add_argument("--elev",type=float,default=9.0)
p.add_argument("--no-bloom",action="store_true"); p.add_argument("--all",action="store_true")
p.add_argument("--out",default=None)
a=p.parse_args()
def go(mood,body,out=None):
    img=mio3d.render(mood,body,W=a.w,H=a.h,ss=a.ss,bloom=not a.no_bloom,yaw=a.yaw,elev=a.elev)
    out=out or f"mio_{mood}_{body}.png"; cv2.imwrite(out,img[:,:,::-1]); print("ok",out,flush=True)
if a.all:
    for m in ["idle","working","celebrating","anomaly","sleeping"]: go(m,"violet")
    for b in ["titanio","obsidiana"]: go("idle",b)
else: go(a.mood,a.body,a.out)
