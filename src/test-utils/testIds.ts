import type { screen } from '@testing-library/react-native';

type Rendered = ReturnType<typeof screen.toJSON>;
type RenderedNode = Exclude<Rendered, null | unknown[]>;

/** Every testID in a rendered tree, in the order drawn: for asserting one block sits above another. */
export function testIdsInOrder(node: Rendered | RenderedNode): string[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(testIdsInOrder);
  const own = typeof node.props.testID === 'string' ? [node.props.testID] : [];
  return [...own, ...(node.children ?? []).flatMap(child => (typeof child === 'string' ? [] : testIdsInOrder(child)))];
}
