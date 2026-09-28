import fs from 'node:fs';
import path from 'node:path';
import renderer from 'react-test-renderer';
import { PaperTexture } from '../PaperTexture';

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
    tree = renderer.create(<PaperTexture />);
  });
  expect(tree!.toJSON()).toBeNull();
});

it('uses a valid SKSL runtime-effect entry point', () => {
  const src = fs.readFileSync(path.join(__dirname, '../PaperTexture.tsx'), 'utf8');
  expect(src).toMatch(/half4 main\(float2/);
  expect(src).not.toMatch(/fragment main/);
});

it('returns a premultiplied color so the texture cannot wash out the screen', () => {
  const src = fs.readFileSync(path.join(__dirname, '../PaperTexture.tsx'), 'utf8');
  // The shader's own comment states the invariant (color == unpremultiplied * alpha);
  // this asserts the `main` body actually follows it rather than returning the
  // raw grayscale value `g` directly.
  expect(src).toMatch(/half4\(g \* a, g \* a, g \* a, a\)/);
  expect(src).not.toMatch(/half4\(g, g, g, a\)/);
});
