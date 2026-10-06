import { describe, expect, it } from 'vitest';
import { readNdjson, readSse } from './streams';

/** Builds a byte stream that delivers the given string chunks one by one. */
function streamOf(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)));
      controller.close();
    },
  });
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const item of iterable) items.push(item);
  return items;
}

describe('readNdjson', () => {
  it('handles lines split across chunks and a trailing line without newline', async () => {
    const events = await collect(readNdjson<{ n: number }>(streamOf(['{"n":1}\n{"n"', ':2}\n\n{"n":3}'])));
    expect(events).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
  });

  it('stops cleanly when the consumer breaks early', async () => {
    const seen: number[] = [];
    for await (const event of readNdjson<{ n: number }>(streamOf(['{"n":1}\n{"n":2}\n']))) {
      seen.push(event.n);
      break;
    }
    expect(seen).toEqual([1]);
  });
});

describe('readSse', () => {
  it('parses named events, skips comments and joins multi-line data', async () => {
    const messages = await collect(
      readSse(streamOf([': ping\n\nevent: snapshot\ndata: {"a":', '1}\n\n', 'data: line1\ndata: line2\n\n'])),
    );
    expect(messages).toEqual([
      { event: 'snapshot', data: '{"a":1}' },
      { event: 'message', data: 'line1\nline2' },
    ]);
  });
});
