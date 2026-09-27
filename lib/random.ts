/** Sample without replacement, leaving the input unchanged. */
export function sample<T>(items: readonly T[], count: number): T[] {
  const copy = [...items];
  const size = Math.min(count, copy.length);
  for (let i = 0; i < size; i++) {
    const index = i + Math.floor(Math.random() * (copy.length - i));
    [copy[i], copy[index]] = [copy[index], copy[i]];
  }
  return copy.slice(0, size);
}
