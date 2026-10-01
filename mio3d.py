import numpy as np, math, cv2
from numba import njit, prange

PAPER = np.array([246,246,242], np.float32)
HEIGHTS = {"idle":([2,3,2],[2,3,2]),"working":([1,2,3],[3,2,1]),"celebrating":([2,3,4],[2,3,4]),
           "anomaly":([2,2,2],[2,2,4]),"sleeping":([1,1,1],[1,1,1])}

# material ids
M_BODY, M_DARK, M_EMIT, M_GLASS, M_LIMEG, M_FEET, M_WHITE, M_DIM, M_VIOE = range(9)

def build_scene(mood):
    up = mood == "celebrating"
    P = []   # x0,y0,x1,y1,z0,z1,r,mat  (unit coords)
    arms = [(-1,3,0,7),(15,3,16,7)] if up else [(-1,11,0,14),(15,11,16,14)]
    hands = [(-1,3,0,4),(15,3,16,4)] if up else [(-1,13,0,14),(15,13,16,14)]
    for a in arms: P.append((*a,-1.5,1.5,0.16,M_DARK))
    for h in hands: P.append((*h,-1.5,1.5,0.16,M_LIMEG if mood!="sleeping" else M_DIM))
    P.append((7,3,8,5,-0.5,0.5,0.1,M_DARK))
    P.append((6,0,9,3,-1.5,1.5,0.22,M_VIOE if mood=="anomaly" else (M_DIM if mood=="sleeping" else M_LIMEG)))
    for f in [(3,17,6,19),(9,17,12,19)]: P.append((*f,-2,2,0.2,M_FEET))
    P.append((2,7,13,15,1.4,2.25,0.05,M_GLASS))
    hl,hr = HEIGHTS[mood]
    ecol = M_DIM if mood=="sleeping" else M_EMIT
    for i,h in enumerate(hl): P.append((3+i+.04,12-h,4+i-.04,12,2.2,2.65,0.07,ecol))
    for i,h in enumerate(hr):
        m = M_WHITE if (mood=="anomaly" and i==2) else ecol
        P.append((9+i+.04,12-h,10+i-.04,12,2.2,2.65,0.07,m))
    def cell(x0,y0,x1,y1): P.append((x0+.04,y0+.04,x1-.04,y1-.04,2.2,2.55,0.06,ecol))
    if mood=="idle": cell(6,13,9,14)
    elif mood=="sleeping": cell(7,13,8,14)
    elif mood=="working":
        for i in range(6): P.append((4.5+i+.04,13.04,5.5+i-.04,13.96,2.2,2.55,0.06,M_EMIT if i<3 else M_DARK))
    elif mood=="celebrating":
        cell(5,13,6,14); cell(9,13,10,14); cell(6,13.5,9,14.5)
    elif mood=="anomaly":
        for i in range(7):
            y0 = 13.5 if i%2==0 else 13.0
            cell(4+i,y0,5+i,y0+1)
    for k in range(3): P.append((3+k+.1,15.5,3.5+k,16.5,2.8,3.06,0.03,M_DARK))
    P.append((11,15.5,12,16.5,2.85,3.1,0.05,M_DIM if mood=="sleeping" else M_EMIT))
    B = np.zeros((len(P),8),np.float32); MT=np.zeros(len(P),np.int32)
    for i,(x0,y0,x1,y1,z0,z1,r,m) in enumerate(P):
        B[i]=[(x0+x1)/2-7.5, 19-(y0+y1)/2, (z0+z1)/2, (x1-x0)/2,(y1-y0)/2,(z1-z0)/2, r, 0]
        MT[i]=m
    body = np.zeros((3,8),np.float32)
    def bx(x0,y0,x1,y1,z0,z1,r): return [(x0+x1)/2-7.5,19-(y0+y1)/2,(z0+z1)/2,(x1-x0)/2,(y1-y0)/2,(z1-z0)/2,r,0]
    body[0]=bx(1,5,14,17,-3,3,0.28); body[1]=bx(0,6,15,16,-3,3,0.28); body[2]=bx(2,7,13,15,2.1,3.8,0.14)
    return B,MT,body

def make_mats(body_kind):
    #            F0 r,g,b            rough metal   diffuse r,g,b
    mats = np.zeros((9,8),np.float32)
    if body_kind=="violet":  body=(0.40,0.20,0.95); rough=0.26; feet=(0.22,0.13,0.55)
    elif body_kind=="titanio": body=(0.70,0.68,0.66); rough=0.32; feet=(0.36,0.35,0.35)
    else: body=(0.20,0.20,0.24); rough=0.16; feet=(0.10,0.10,0.13)   # obsidiana
    mats[M_BODY]=[*body,rough,1.0,0,0,0]
    mats[M_DARK]=[0.16,0.16,0.19,0.24,1.0,0,0,0]
    mats[M_EMIT]=[0.04,0.04,0.04,0.35,0.0,0.45,0.6,0.15]
    mats[M_GLASS]=[0.05,0.05,0.06,0.06,0.0,0.004,0.004,0.008]
    mats[M_LIMEG]=[0.05,0.05,0.05,0.22,0.0,0.40,0.62,0.08]
    mats[M_FEET]=[*feet,0.36,1.0,0,0,0]
    mats[M_WHITE]=[0.05,0.05,0.05,0.3,0.0,0.85,0.85,0.83]
    mats[M_DIM]=[0.04,0.04,0.04,0.35,0.0,0.12,0.16,0.07]
    mats[M_VIOE]=[0.05,0.05,0.05,0.25,0.0,0.30,0.12,0.75]
    emis = np.zeros((9,3),np.float32)
    emis[M_EMIT]=[0.55,1.05,0.22]; emis[M_LIMEG]=[0.30,0.52,0.10]
    emis[M_WHITE]=[1.0,1.0,0.97]; emis[M_VIOE]=[0.55,0.22,1.25]; emis[M_DIM]=[0.10,0.14,0.05]
    return mats, emis

@njit(fastmath=True)
def sdbox(px,py,pz,b):
    r=b[6]
    qx=abs(px-b[0])-b[3]+r; qy=abs(py-b[1])-b[4]+r; qz=abs(pz-b[2])-b[5]+r
    ox=max(qx,0.0); oy=max(qy,0.0); oz=max(qz,0.0)
    return math.sqrt(ox*ox+oy*oy+oz*oz)+min(max(qx,max(qy,qz)),0.0)-r

@njit(fastmath=True)
def scene(px,py,pz,B,MT,body):
    # bounding box early-out
    dx=max(abs(px)-9.3,0.0); dy=max(abs(py-9.5)-10.3,0.0); dz=max(abs(pz)-4.3,0.0)
    dbb=math.sqrt(dx*dx+dy*dy+dz*dz)
    if dbb>1.5: return dbb, -1
    d1=sdbox(px,py,pz,body[0]); d2=sdbox(px,py,pz,body[1]); dr=sdbox(px,py,pz,body[2])
    d=max(min(d1,d2),-dr); m=M_BODY
    for i in range(B.shape[0]):
        di=sdbox(px,py,pz,B[i])
        if di<d: d=di; m=MT[i]
    return d,m

@njit(fastmath=True)
def trace(ox,oy,oz,dx,dy,dz,tmax,B,MT,body,steps):
    t=0.0
    for _ in range(steps):
        d,m=scene(ox+dx*t,oy+dy*t,oz+dz*t,B,MT,body)
        if d<0.0015+0.0004*t: return t,m
        t+=d
        if t>tmax: break
    return -1.0,-1

@njit(fastmath=True)
def normal(px,py,pz,B,MT,body):
    e=0.004
    a,_=scene(px+e,py,pz,B,MT,body); b,_=scene(px-e,py,pz,B,MT,body)
    c,_=scene(px,py+e,pz,B,MT,body); d,_=scene(px,py-e,pz,B,MT,body)
    f,_=scene(px,py,pz+e,B,MT,body); g,_=scene(px,py,pz-e,B,MT,body)
    nx=a-b; ny=c-d; nz=f-g; l=math.sqrt(nx*nx+ny*ny+nz*nz)+1e-9
    return nx/l,ny/l,nz/l

@njit(fastmath=True)
def sm(x):
    x=min(max(x,0.0),1.0); return x*x*(3-2*x)

@njit(fastmath=True)
def softbox(dx,dy,dz,cx,cy,cz,ax,ay,az,hu,hv,soft):
    dz_=dx*cx+dy*cy+dz*cz
    if dz_<=0.05: return 0.0
    bx=cy*az-cz*ay; by=cz*ax-cx*az; bz=cx*ay-cy*ax
    u=(dx*ax+dy*ay+dz*az)/dz_; v=(dx*bx+dy*by+dz*bz)/dz_
    return sm((hu-abs(u))/soft*0.5+0.5)*sm((hv-abs(v))/soft*0.5+0.5)

@njit(fastmath=True)
def sbz(dx,dy,dz,az,el,hu,hv,soft,power):
    a=math.radians(az); e=math.radians(el)
    cx=math.sin(a)*math.cos(e); cy=math.sin(e); cz=math.cos(a)*math.cos(e)
    return softbox(dx,dy,dz,cx,cy,cz,0.0,1.0,0.0,hu,hv,soft)*power

@njit(fastmath=True)
def env(dx,dy,dz,rough):
    soft=0.05+rough*0.9
    k=1.0/(1.0+rough*2.2)
    if dy>0:
        g=0.07+0.08*dy
        r=g*0.95; gg=g; b=g*1.1
    else:
        f=0.06*(1.0+dy*0.5)
        r=f; gg=f; b=f*1.05
    # overhead
    l=math.sqrt(0.15*0.15+1.0)
    s=softbox(dx,dy,dz,0.0,1.0/l,0.15/l,1.0,0.0,0.0,1.6,1.0,soft)*3.0*k
    r+=s; gg+=s*0.98; b+=s*0.95
    # left key strip (cool white), crosses the front-face reflection range
    s=sbz(dx,dy,dz,-66.0,2.0,1.4,0.30,soft,3.4)*k
    r+=s*0.9; gg+=s*0.96; b+=s
    # right rim (lime, brand)
    s=sbz(dx,dy,dz,58.0,4.0,1.4,0.22,soft,3.2)*k
    r+=s*0.78; gg+=s; b+=s*0.5
    # back strips: light the side + top faces
    s=sbz(dx,dy,dz,188.0,0.0,1.4,0.34,soft,3.4)*k
    r+=s*0.95; gg+=s*0.95; b+=s
    s=sbz(dx,dy,dz,-150.0,40.0,0.5,0.9,soft,2.8)*k
    r+=s; gg+=s*0.97; b+=s*0.95
    s=sbz(dx,dy,dz,112.0,8.0,1.0,0.5,soft,1.5)*k
    r+=s*0.8; gg+=s*0.85; b+=s
    # low violet bounce
    s=sbz(dx,dy,dz,10.0,-25.0,1.2,0.8,soft,0.7)*k
    r+=s*0.45; gg+=s*0.3; b+=s*0.95
    return r,gg,b

@njit(fastmath=True)
def softshadow(ox,oy,oz,lx,ly,lz,B,MT,body,kk):
    res=1.0; t=0.05
    for _ in range(40):
        d,_m=scene(ox+lx*t,oy+ly*t,oz+lz*t,B,MT,body)
        if d<0.001: return 0.0
        res=min(res,kk*d/t)
        t+=max(d,0.03)
        if t>40: break
    return min(max(res,0.0),1.0)

@njit(fastmath=True)
def calc_ao(px,py,pz,nx,ny,nz,B,MT,body):
    occ=0.0; sc=1.0
    for i in range(1,6):
        h=0.12*i
        d,_m=scene(px+nx*h,py+ny*h,pz+nz*h,B,MT,body)
        occ+=(h-d)*sc; sc*=0.75
    return min(max(1.0-0.9*occ,0.0),1.0)

@njit(fastmath=True)
def lighting(px,py,pz,nx,ny,nz,vx,vy,vz,mat,mats,B,MT,body,full,bounce):
    LX,LY,LZ=-0.45,0.95,0.55
    ll=math.sqrt(LX*LX+LY*LY+LZ*LZ); LX/=ll; LY/=ll; LZ/=ll
    nv=max(nx*vx+ny*vy+nz*vz,0.0)
    rx=-vx+2*nv*nx; ry=-vy+2*nv*ny; rz=-vz+2*nv*nz
    rough=mats[mat,3]; metal=mats[mat,4]
    sh=1.0; ao=1.0
    if full:
        sh=softshadow(px+nx*0.02,py+ny*0.02,pz+nz*0.02,LX,LY,LZ,B,MT,body,10.0)
        ao=calc_ao(px,py,pz,nx,ny,nz,B,MT,body)
    er,eg,eb=env(rx,ry,rz,rough)
    # scene reflection bounce (glossy surfaces only)
    if bounce and rough<0.4:
        t,m2=trace(px+nx*0.02,py+ny*0.02,pz+nz*0.02,rx,ry,rz,30.0,B,MT,body,48)
        if t>0:
            qx=px+nx*0.02+rx*t; qy=py+ny*0.02+ry*t; qz=pz+nz*0.02+rz*t
            n2x,n2y,n2z=normal(qx,qy,qz,B,MT,body)
            cr,cg,cb=lighting(qx,qy,qz,n2x,n2y,n2z,-rx,-ry,-rz,m2,mats,B,MT,body,False,False)
            w=1.0-0.75*rough/0.4
            er=er*(1-w)+cr*w; eg=eg*(1-w)+cg*w; eb=eb*(1-w)+cb*w
    f=(1.0-nv)**5
    F0r=mats[mat,0]; F0g=mats[mat,1]; F0b=mats[mat,2]
    fr=F0r+(1-F0r)*f*(1-rough); fg=F0g+(1-F0g)*f*(1-rough); fb=F0b+(1-F0b)*f*(1-rough)
    spec_occ=(0.55+0.45*sh)*(0.45+0.55*ao)
    cr=er*fr*spec_occ; cg=eg*fg*spec_occ; cb=eb*fb*spec_occ
    # diffuse
    dr_=mats[mat,5]; dg_=mats[mat,6]; db_=mats[mat,7]
    amb=0.28*(0.75+0.25*ny)
    kd=max(nx*LX+ny*LY+nz*LZ,0.0)*sh
    dif=(1.0-metal)
    cr+=dif*dr_*(amb*ao+kd*1.1); cg+=dif*dg_*(amb*ao+kd*1.1); cb+=dif*db_*(amb*ao+kd*1.1)
    return cr,cg,cb

@njit(fastmath=True)
def ray_bbox(ox,oy,oz,dx,dy,dz):
    o=np.array([ox,oy-9.5,oz]); d=np.array([dx,dy,dz]); hs=np.array([9.3,10.3,4.3])
    tmin=-1e9; tmax=1e9
    for ax in range(3):
        if abs(d[ax])<1e-9:
            if abs(o[ax])>hs[ax]: return False,0.0,0.0
        else:
            t1=(-hs[ax]-o[ax])/d[ax]; t2=(hs[ax]-o[ax])/d[ax]
            if t1>t2:
                tt=t1; t1=t2; t2=tt
            tmin=max(tmin,t1); tmax=min(tmax,t2)
    if tmax<tmin or tmax<0: return False,0.0,0.0
    return True,tmin,tmax

@njit(parallel=True, fastmath=True)
def render_kernel(W,H,cam,fwd,rgt,upv,tanh,B,MT,body,mats,emis,
                  out_col,out_alpha,out_em,out_fmul,out_fk,out_fcol):
    for j in prange(H):
        for i in range(W):
            nx_=(2.0*(i+0.5)/W-1.0)*tanh*W/H; ny_=(1.0-2.0*(j+0.5)/H)*tanh
            dx=fwd[0]+rgt[0]*nx_+upv[0]*ny_; dy=fwd[1]+rgt[1]*nx_+upv[1]*ny_; dz=fwd[2]+rgt[2]*nx_+upv[2]*ny_
            l=math.sqrt(dx*dx+dy*dy+dz*dz); dx/=l; dy/=l; dz/=l
            ox=cam[0]; oy=cam[1]; oz=cam[2]
            tf=1e9
            if dy<-1e-6: tf=-oy/dy
            hit,tmin,tmax=ray_bbox(ox,oy,oz,dx,dy,dz)
            tp=-1.0; mat=-1
            if hit:
                t0=max(tmin,0.0)
                t,m=trace(ox+dx*t0,oy+dy*t0,oz+dz*t0,dx,dy,dz,tmax-t0+0.5,B,MT,body,160)
                if t>=0: tp=t+t0; mat=m
            if tp>=0 and tp<tf:
                px=ox+dx*tp; py=oy+dy*tp; pz=oz+dz*tp
                nx,ny,nz=normal(px,py,pz,B,MT,body)
                cr,cg,cb=lighting(px,py,pz,nx,ny,nz,-dx,-dy,-dz,mat,mats,B,MT,body,True,True)
                er=emis[mat,0]; eg=emis[mat,1]; eb=emis[mat,2]
                out_col[j,i,0]=cr+er; out_col[j,i,1]=cg+eg; out_col[j,i,2]=cb+eb
                out_em[j,i,0]=er; out_em[j,i,1]=eg; out_em[j,i,2]=eb
                out_alpha[j,i]=1.0
            elif tf<1e8:
                fx=ox+dx*tf; fz=oz+dz*tf
                out_fmul[j,i]=1.0
                # only near the pet
                ddx=max(abs(fx)-9.0,0.0); ddz=max(abs(fz)-4.0,0.0)
                dist=math.sqrt(ddx*ddx+ddz*ddz)
                if dist<26.0:
                    LX,LY,LZ=-0.45,0.95,0.55
                    ll=math.sqrt(LX*LX+LY*LY+LZ*LZ); LX/=ll; LY/=ll; LZ/=ll
                    sh=softshadow(fx,0.02,fz,LX,LY,LZ,B,MT,body,7.0)
                    ao=calc_ao(fx,0.0,fz,0.0,1.0,0.0,B,MT,body)
                    fall=1.0-sm(dist/26.0)
                    out_fmul[j,i]=1.0-(0.46*(1-sh)+0.40*(1-ao))*fall
                    # floor reflection
                    rdx=dx; rdy=-dy; rdz=dz
                    hit2,tmin,tmax=ray_bbox(fx,0.0,fz,rdx,rdy,rdz)
                    if hit2:
                        t0=max(tmin,0.0)
                        t,m=trace(fx+rdx*t0,0.0+rdy*t0,fz+rdz*t0,rdx,rdy,rdz,tmax-t0+0.5,B,MT,body,100)
                        if t>=0:
                            tt=t+t0
                            qx=fx+rdx*tt; qy=rdy*tt; qz=fz+rdz*tt
                            n2x,n2y,n2z=normal(qx,qy,qz,B,MT,body)
                            cr,cg,cb=lighting(qx,qy,qz,n2x,n2y,n2z,-rdx,-rdy,-rdz,m,mats,B,MT,body,False,False)
                            cr+=emis[m,0]; cg+=emis[m,1]; cb+=emis[m,2]
                            fade=1.0/(1.0+0.22*tt)
                            nvf=abs(dy)
                            k=(0.05+0.95*(1-nvf)**4)*0.55*fade
                            out_fk[j,i]=min(k,0.6)
                            out_fcol[j,i,0]=cr; out_fcol[j,i,1]=cg; out_fcol[j,i,2]=cb

def aces(x):
    x=np.maximum(x,0)
    return np.clip((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0,1)

def camera(W,H,yaw=30.0,elev=9.0,dist=86.0,fov=19.5,target=(0,9.4,0)):
    ya=math.radians(yaw); el=math.radians(elev)
    tgt=np.array(target,np.float32)
    pos=tgt+dist*np.array([math.sin(ya)*math.cos(el),math.sin(el),math.cos(ya)*math.cos(el)],np.float32)
    fwd=tgt-pos; fwd/=np.linalg.norm(fwd)
    rgt=np.cross(fwd,[0,1,0]).astype(np.float32); rgt/=np.linalg.norm(rgt)
    upv=np.cross(rgt,fwd).astype(np.float32)
    return pos.astype(np.float32),fwd.astype(np.float32),rgt,upv,math.tan(math.radians(fov)/2)

def project(P,W,H,**kw):
    pos,fwd,rgt,upv,th=camera(W,H,**kw)
    v=np.array(P,np.float32)-pos
    z=v@fwd; x=(v@rgt)/z/th; y=(v@upv)/z/th
    return (x*H/W+1)/2*W, (1-y)/2*H

def render(mood="idle",body="violet",W=800,H=900,ss=1,bloom=True,ret_alpha=False,**kw):
    Wr,Hr=W*ss,H*ss
    cam,fwd,rgt,upv,th=camera(Wr,Hr,**kw)
    B,MT,bd=build_scene(mood); mats,emis=make_mats(body)
    col=np.zeros((Hr,Wr,3),np.float32); al=np.zeros((Hr,Wr),np.float32); em=np.zeros((Hr,Wr,3),np.float32)
    fm=np.ones((Hr,Wr),np.float32); fk=np.zeros((Hr,Wr),np.float32); fc=np.zeros((Hr,Wr,3),np.float32)
    render_kernel(Wr,Hr,cam,fwd,rgt,upv,th,B,MT,bd,mats,emis,col,al,em,fm,fk,fc)
    EXP=0.85
    c=aces(col*EXP); 
    if bloom:
        g=cv2.GaussianBlur(em,(0,0),9*ss)*0.40+cv2.GaussianBlur(em,(0,0),3*ss)*0.22
        a_soft=cv2.GaussianBlur(al,(0,0),2*ss)
        g=g*(al>0.5)[...,None]
        c=aces((col+g)*EXP)
    s=(c**(1/2.2))*255
    fcs=(aces(fc*EXP)**(1/2.2))*255
    floor=PAPER[None,None,:]*fm[...,None]*(1-fk[...,None])+fcs*fk[...,None]
    # floor reflection blur softening
    out=s*al[...,None]+floor*(1-al[...,None])
    out=np.clip(out,0,255).astype(np.uint8)
    if ss>1: out=cv2.resize(out,(W,H),interpolation=cv2.INTER_AREA); al=cv2.resize(al,(W,H),interpolation=cv2.INTER_AREA)
    return (out,al) if ret_alpha else out
