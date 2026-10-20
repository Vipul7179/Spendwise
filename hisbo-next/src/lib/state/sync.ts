// Serialize snapshots across provider remounts so an older request cannot land last.
let writeTail: Promise<void> = Promise.resolve();

export function serializeStateWrite(write: () => Promise<void>): Promise<void> {
  const request = writeTail.catch(() => undefined).then(write);
  writeTail = request;
  return request;
}

export async function settleStateWrites(): Promise<void> {
  await writeTail.catch(() => undefined);
}
