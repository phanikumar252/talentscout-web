/**
 * Reads newline-delimited JSON from a byte stream, yielding one parsed object per
 * line as soon as the line is complete. A partial line stays buffered until the
 * rest of it arrives in a later chunk.
 */
export async function* readNdjson<T>(stream: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value;
      let newline: number;
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        if (line) yield JSON.parse(line) as T;
      }
    }
    if (buffer.trim()) yield JSON.parse(buffer) as T;
  } finally {
    // Runs on normal end AND when the consumer breaks out early.
    await reader.cancel().catch(() => undefined);
  }
}

export interface SseMessage {
  event: string;
  data: string;
}

/**
 * Parses a text/event-stream body into messages. Comment lines (": ping")
 * are skipped; multi-line `data:` fields are joined with "\n" per the spec.
 */
export async function* readSse(stream: ReadableStream<Uint8Array>): AsyncGenerator<SseMessage> {
  const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += value.replace(/\r\n/g, '\n');
      let boundary: number;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        let event = 'message';
        const data: string[] = [];
        for (const line of block.split('\n')) {
          if (!line || line.startsWith(':')) continue;
          const colon = line.indexOf(':');
          const field = colon === -1 ? line : line.slice(0, colon);
          const fieldValue = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
          if (field === 'event') event = fieldValue;
          else if (field === 'data') data.push(fieldValue);
        }
        if (data.length) yield { event, data: data.join('\n') };
      }
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}
