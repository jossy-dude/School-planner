import { Canvas, Fill, Shader, Skia } from '@shopify/react-native-skia';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

const NOISE = Skia.RuntimeEffect.Make(`
uniform float2 uResolution;
float hash(float2 p) { return fract(sin(dot(p, float2(127.1, 311.7))) * 43758.5453); }
fragment main(float2 xy) {
  float n = hash(floor(xy));
  return float4(n, n, n, 0.05);
}
`);

export function GrainOverlay() {
  const [effect] = useState(NOISE);
  if (!effect) return null;
  return (
    <Canvas pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Fill>
        <Shader source={effect} uniforms={{ uResolution: [1, 1] }} />
      </Fill>
    </Canvas>
  );
}
