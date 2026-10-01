#version 300 es
precision highp float;
precision highp int;
uniform vec2 uRes;
uniform vec3 uCam, uFwd, uRgt, uUp;
uniform float uTan;
uniform int uN;
uniform vec4 uB0[40];   // center.xyz, radius
uniform vec4 uB1[40];   // half.xyz, material id
uniform vec4 uBC[3];    // chassis: center.xyz, radius
uniform vec4 uBH[3];    // chassis: half.xyz
uniform vec4 uMA[9];    // F0.rgb, roughness
uniform vec4 uMB[9];    // metal, diffuse.rgb
uniform vec3 uEm[9];    // emission rgb
layout(location=0) out vec4 oCol;
layout(location=1) out vec4 oEm;
layout(location=2) out vec4 oFloor;

const vec3 LDIR  = vec3(-0.379309, 0.800793, 0.463611);
const vec3 PAPER = vec3(0.964706, 0.964706, 0.949020);
const float EXPO = 0.85;

float sdbox(vec3 p, vec3 c, vec3 h, float r){
  vec3 q = abs(p-c) - h + vec3(r);
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - r;
}
vec2 scene(vec3 p){
  vec3 dd = max(vec3(abs(p.x)-9.3, abs(p.y-9.5)-10.3, abs(p.z)-4.3), 0.0);
  float dbb = length(dd);
  if(dbb>0.08) return vec2(dbb,-1.0);
  float d1 = sdbox(p,uBC[0].xyz,uBH[0].xyz,uBC[0].w);
  float d2 = sdbox(p,uBC[1].xyz,uBH[1].xyz,uBC[1].w);
  float dr = sdbox(p,uBC[2].xyz,uBH[2].xyz,uBC[2].w);
  float d = max(min(d1,d2),-dr);
  float m = 0.0;
  for(int i=0;i<40;i++){
    if(i>=uN) break;
    float di = sdbox(p,uB0[i].xyz,uB1[i].xyz,uB0[i].w);
    if(di<d){ d=di; m=uB1[i].w; }
  }
  return vec2(d,m);
}
vec2 trace(vec3 o, vec3 d, float tmax, int steps){
  float t = 0.0;
  for(int i=0;i<100;i++){
    if(i>=steps) break;
    vec2 s = scene(o+d*t);
    if(s.x < 0.0015+0.0004*t) return vec2(t,s.y);
    t += s.x;
    if(t>tmax) break;
  }
  return vec2(-1.0,-1.0);
}
vec3 calcNormal(vec3 p){
  float e = 0.004;
  float a = scene(p+vec3(e,0.,0.)).x, b = scene(p-vec3(e,0.,0.)).x;
  float c = scene(p+vec3(0.,e,0.)).x, d = scene(p-vec3(0.,e,0.)).x;
  float f = scene(p+vec3(0.,0.,e)).x, g = scene(p-vec3(0.,0.,e)).x;
  return normalize(vec3(a-b,c-d,f-g)+vec3(1e-9));
}
float sm(float x){ x=clamp(x,0.0,1.0); return x*x*(3.0-2.0*x); }
float softbox(vec3 d, vec3 c, vec3 a, float hu, float hv, float soft){
  float dz = dot(d,c);
  if(dz<=0.05) return 0.0;
  vec3 b = cross(c,a);
  float u = dot(d,a)/dz;
  float v = dot(d,b)/dz;
  return sm((hu-abs(u))/soft*0.5+0.5) * sm((hv-abs(v))/soft*0.5+0.5);
}
float sbz(vec3 d, float az, float el, float hu, float hv, float soft, float power){
  float a = radians(az), e = radians(el);
  vec3 c = vec3(sin(a)*cos(e), sin(e), cos(a)*cos(e));
  return softbox(d,c,vec3(0.,1.,0.),hu,hv,soft)*power;
}
vec3 envMap(vec3 d, float rough){
  float soft = 0.05+rough*0.9;
  float k = 1.0/(1.0+rough*2.2);
  vec3 col;
  if(d.y>0.0){ float g=0.07+0.08*d.y; col=vec3(g*0.95,g,g*1.1); }
  else { float f=0.06*(1.0+d.y*0.5); col=vec3(f,f,f*1.05); }
  float l = sqrt(0.15*0.15+1.0);
  float s = softbox(d,vec3(0.0,1.0/l,0.15/l),vec3(1.,0.,0.),1.6,1.0,soft)*3.0*k;
  col += vec3(s,s*0.98,s*0.95);
  s = sbz(d,-66.0,2.0,1.4,0.30,soft,3.4)*k;   col += vec3(s*0.9,s*0.96,s);
  s = sbz(d,58.0,4.0,1.4,0.22,soft,3.2)*k;    col += vec3(s*0.78,s,s*0.5);
  s = sbz(d,188.0,0.0,1.4,0.34,soft,3.4)*k;   col += vec3(s*0.95,s*0.95,s);
  s = sbz(d,-150.0,40.0,0.5,0.9,soft,2.8)*k;  col += vec3(s,s*0.97,s*0.95);
  s = sbz(d,112.0,8.0,1.0,0.5,soft,1.5)*k;    col += vec3(s*0.8,s*0.85,s);
  s = sbz(d,10.0,-25.0,1.2,0.8,soft,0.7)*k;   col += vec3(s*0.45,s*0.3,s*0.95);
  return col;
}
float softshadow(vec3 o, vec3 l, float kk){
  float res = 1.0, t = 0.05;
  for(int i=0;i<20;i++){
    float d = scene(o+l*t).x;
    if(d<0.001) return 0.0;
    res = min(res, kk*d/t);
    t += max(d,0.05);
    if(t>30.0) break;
  }
  return clamp(res,0.0,1.0);
}
float calcAO(vec3 p, vec3 n){
  float occ=0.0, sc=1.0;
  for(int i=1;i<6;i++){
    float h = 0.12*float(i);
    float d = scene(p+n*h).x;
    occ += (h-d)*sc; sc *= 0.75;
  }
  return clamp(1.0-0.9*occ,0.0,1.0);
}
vec3 finishShade(vec3 n, vec3 v, int mat, float sh, float ao, vec3 envc){
  float nv = max(dot(n,v),0.0);
  vec4 ma = uMA[mat]; vec4 mb = uMB[mat];
  float rough = ma.w, metal = mb.x;
  float f = pow(1.0-nv,5.0);
  vec3 F = ma.xyz + (1.0-ma.xyz)*f*(1.0-rough);
  float so = (0.55+0.45*sh)*(0.45+0.55*ao);
  vec3 c = envc*F*so;
  float amb = 0.28*(0.75+0.25*n.y);
  float kd = max(dot(n,LDIR),0.0)*sh;
  c += (1.0-metal)*mb.yzw*(amb*ao+kd*1.1);
  return c;
}
vec3 shadeSimple(vec3 n, vec3 v, int mat){
  float nv = max(dot(n,v),0.0);
  vec3 r = -v+2.0*nv*n;
  return finishShade(n,v,mat,1.0,1.0,envMap(r,uMA[mat].w));
}
vec3 shadeFull(vec3 p, vec3 n, vec3 v, int mat){
  float nv = max(dot(n,v),0.0);
  vec3 r = -v+2.0*nv*n;
  float rough = uMA[mat].w;
  float sh = softshadow(p+n*0.02,LDIR,10.0);
  float ao = calcAO(p,n);
  vec3 e = envMap(r,rough);
  if(rough<0.4){
    vec3 o = p+n*0.02;
    vec2 th = trace(o,r,30.0,30);
    if(th.x>0.0){
      vec3 q = o+r*th.x;
      vec3 n2 = calcNormal(q);
      vec3 c2 = shadeSimple(n2,-r,int(th.y));
      float w = 1.0-0.75*rough/0.4;
      e = e*(1.0-w)+c2*w;
    }
  }
  return finishShade(n,v,mat,sh,ao,e);
}
bool rayBBox(vec3 o, vec3 d, out float tmin, out float tmax){
  vec3 oo = vec3(o.x,o.y-9.5,o.z);
  vec3 hs = vec3(9.3,10.3,4.3);
  tmin=-1e9; tmax=1e9;
  for(int ax=0;ax<3;ax++){
    float oa=oo[ax], da=d[ax], h=hs[ax];
    if(abs(da)<1e-9){ if(abs(oa)>h) return false; }
    else{
      float t1=(-h-oa)/da, t2=(h-oa)/da;
      if(t1>t2){ float tt=t1; t1=t2; t2=tt; }
      tmin=max(tmin,t1); tmax=min(tmax,t2);
    }
  }
  if(tmax<tmin || tmax<0.0) return false;
  return true;
}
vec3 aces(vec3 x){
  x = max(x,0.0);
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);
}
void main(){
  vec2 fc = gl_FragCoord.xy;
  float nxp = (2.0*fc.x/uRes.x-1.0)*uTan*uRes.x/uRes.y;
  float nyp = (2.0*fc.y/uRes.y-1.0)*uTan;
  vec3 d = normalize(uFwd+uRgt*nxp+uUp*nyp);
  vec3 o = uCam;
  float tf = 1e9;
  if(d.y<-1e-6) tf = -o.y/d.y;
  float tmn, tmx;
  bool hit = rayBBox(o,d,tmn,tmx);
  float tp = -1.0; int mat = -1;
  if(hit){
    float t0 = max(tmn,0.0);
    vec2 th = trace(o+d*t0,d,tmx-t0+0.5,75);
    if(th.x>=0.0){ tp = th.x+t0; mat = int(th.y); }
  }
  vec3 col = vec3(0.0), em = vec3(0.0), floorc = PAPER;
  float al = 0.0;
  if(tp>=0.0 && tp<tf){
    vec3 p = o+d*tp;
    vec3 n = calcNormal(p);
    col = shadeFull(p,n,-d,mat)+uEm[mat];
    em = uEm[mat];
    al = 1.0;
  } else if(tf<1e8){
    float fx = o.x+d.x*tf, fz = o.z+d.z*tf;
    float fmul = 1.0, fk = 0.0; vec3 fcol = vec3(0.0);
    float ddx = max(abs(fx)-9.0,0.0), ddz = max(abs(fz)-4.0,0.0);
    float dist = sqrt(ddx*ddx+ddz*ddz);
    if(dist<26.0){
      float sh = softshadow(vec3(fx,0.02,fz),LDIR,7.0);
      float ao = calcAO(vec3(fx,0.0,fz),vec3(0.0,1.0,0.0));
      float fall = 1.0-sm(dist/26.0);
      fmul = 1.0-(0.46*(1.0-sh)+0.40*(1.0-ao))*fall;
      vec3 fo = vec3(fx,0.0,fz);
      vec3 rd = vec3(d.x,-d.y,d.z);
      float a, b;
      if(rayBBox(fo,rd,a,b)){
        float t0 = max(a,0.0);
        vec2 th = trace(fo+rd*t0,rd,b-t0+0.5,36);
        if(th.x>=0.0){
          float tt = th.x+t0;
          vec3 q = fo+rd*tt;
          vec3 n2 = calcNormal(q);
          int m = int(th.y);
          fcol = shadeSimple(n2,-rd,m)+uEm[m];
          float fade = 1.0/(1.0+0.22*tt);
          float nvf = abs(d.y);
          float k = (0.05+0.95*pow(1.0-nvf,4.0))*0.55*fade;
          fk = min(k,0.6);
        }
      }
    }
    floorc = PAPER*fmul*(1.0-fk) + pow(aces(fcol*EXPO),vec3(1.0/2.2))*fk;
  }
  oCol = vec4(col,al);
  oEm = vec4(em,1.0);
  oFloor = vec4(floorc,1.0);
}
