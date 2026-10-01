#version 300 es
precision highp float;
uniform sampler2D uCol, uBig, uSmall, uFloor;
out vec4 o;
vec3 aces(vec3 x){
  x = max(x,0.0);
  return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0);
}
void main(){
  ivec2 p = ivec2(gl_FragCoord.xy);
  vec4 c = texelFetch(uCol,p,0);
  vec3 g = texelFetch(uBig,p,0).rgb*0.40 + texelFetch(uSmall,p,0).rgb*0.22;
  if(c.a<=0.5) g = vec3(0.0);
  vec3 s = pow(aces((c.rgb+g)*0.85),vec3(1.0/2.2));
  vec3 fl = texelFetch(uFloor,p,0).rgb;
  o = vec4(mix(fl,s,c.a),1.0);
}
