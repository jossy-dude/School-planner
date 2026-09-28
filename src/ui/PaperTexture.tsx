import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

// Two layers in one shader pass, mimicking real paper under raking light:
// a fine per-pixel grain (the tooth of the paper) plus a soft, low-frequency
// "fiber" mottling (bilinear-interpolated value noise, the pulp clumping you
// see in uncoated stock). Both are combined into one unpremultiplied gray `g`
// then scaled by the target alpha `a` — Skia shaders must return premultiplied
// color (color == unpremultiplied * alpha), so `g` alone is never returned.
const PAPER = (() => {
  try {
    return Skia.RuntimeEffect.Make(`
uniform float2 uResolution;
float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
float fiber(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float a = hash(i);
  float b = hash(i + float2(1.0, 0.0));
  float c = hash(i + float2(0.0, 1.0));
  float d = hash(i + float2(1.0, 1.0));
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}
half4 main(float2 xy) {
  float grain = hash(floor(xy));
  float mottle = fiber(xy * 0.015);
  float g = grain * 0.6 + mottle * 0.4;
  float a = 0.07;
  return half4(g * a, g * a, g * a, a);
}
`);
  } catch {
    return null;
  }
})();

export function PaperTexture() {
  const [effect] = useState(PAPER);
  if (!effect) return null;
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill>
        <Shader source={effect} uniforms={{ uResolution: [1, 1] }} />
      </Fill>
    </Canvas>
  );
}
