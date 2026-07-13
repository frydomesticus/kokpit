export function calculateNet(dogru: number, yanlis: number): number {
  const net = dogru - yanlis * 0.25;
  return parseFloat(net.toFixed(2));
}

export function calculateTotalNet(dersler: { dogru: number; yanlis: number }[]): number {
  const total = dersler.reduce((acc, current) => {
    return acc + (current.dogru - current.yanlis * 0.25);
  }, 0);
  return parseFloat(total.toFixed(2));
}
