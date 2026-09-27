import fs from 'node:fs';
import path from 'node:path';
import renderer from 'react-test-renderer';
import { GrainOverlay } from '../GrainOverlay';

jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    RuntimeEffect: {
      Make: jest.fn(() => {
        throw new Error('Error in sksl: fake compile failure');
      }),
    },
  },
  Canvas: 'Canvas',
  Fill: 'Fill',
  Shader: 'Shader',
}));

it('survives a shader compilation failure and renders nothing', () => {
  let tree: renderer.ReactTestRenderer | undefined;
  renderer.act(() => {
    tree = renderer.create(<GrainOverlay />);
  });
  expect(tree!.toJSON()).toBeNull();
});

it('uses a valid SKSL runtime-effect entry point', () => {
  const src = fs.readFileSync(path.join(__dirname, '../GrainOverlay.tsx'), 'utf8');
  expect(src).toMatch(/half4 main\(float2/);
  expect(src).not.toMatch(/fragment main/);
});

it('returns a premultiplied color so the grain cannot wash out the screen', () => {
  const src = fs.readFileSync(path.join(__dirname, '../GrainOverlay.tsx'), 'utf8');
  expect(src).toMatch(/half4\(n \* 0\.05, n \* 0\.05, n \* 0\.05, 0\.05\)/);
  expect(src).not.toMatch(/half4\(n, n, n, 0\.05\)/);
});
