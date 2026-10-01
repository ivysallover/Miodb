#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;
uniform float uSigma;
out vec4 o;
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 sz = textureSize(uTex,0);
  float R = min(ceil(uSigma*3.0),40.0);
  vec3 acc = vec3(0.0); float ws = 0.0;
  for(int i=-40;i<=40;i++){
    float fi = float(i);
    if(abs(fi)>R) continue;
    float w = exp(-fi*fi/(2.0*uSigma*uSigma));
    ivec2 q = clamp(p+ivec2(uDir)*i, ivec2(0), sz-1);
    acc += texelFetch(uTex,q,0).rgb*w; ws += w;
  }
  o = vec4(acc/ws,1.0);
}
