/**
 * A forward-only deflated zip (ZipStream.php): each entry's CRC and sizes
 * follow its data in a data descriptor, so bytes go out as they are made.
 * Web-standard CompressionStream only, so it runs on Bun, Node and Workers.
 */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
	let c = n;
	for (let k = 0; k < 8; k++) {
		c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
	}
	return c >>> 0;
});

function crc32(crc: number, bytes: Uint8Array): number {
	let c = crc ^ 0xffffffff;
	for (const byte of bytes) {
		c = (CRC_TABLE[(c ^ byte) & 0xff] ?? 0) ^ (c >>> 8);
	}
	return (c ^ 0xffffffff) >>> 0;
}

function bytes(fields: [number, 2 | 4][]): Uint8Array {
	const out = new Uint8Array(fields.reduce((n, [, size]) => n + size, 0));
	const view = new DataView(out.buffer);
	let at = 0;
	for (const [value, size] of fields) {
		if (size === 2) {
			view.setUint16(at, value, true);
		} else {
			view.setUint32(at, value >>> 0, true);
		}
		at += size;
	}
	return out;
}

interface Entry {
	name: Uint8Array;
	offset: number;
	crc: number;
	csize: number;
	usize: number;
}

const FLAGS = 0x0808; // data descriptor + UTF-8 names
const DOS_DATE = 0x21; // 1980-01-01

export class ZipWriter {
	private offset = 0;
	private readonly entries: Entry[] = [];

	/** One deflated entry from a stream of chunks; yields the zip bytes. */
	async *entry(name: string, chunks: AsyncIterable<Uint8Array>): AsyncGenerator<Uint8Array> {
		const nameBytes = new TextEncoder().encode(name);
		const start = this.offset;
		yield this.count(this.localHeader(nameBytes));
		const stats = { crc: 0, usize: 0 };
		const deflate = new CompressionStream("deflate-raw");
		const feeding = feed(deflate.writable.getWriter(), chunks, stats);
		let csize = 0;
		for await (const out of deflate.readable as unknown as AsyncIterable<Uint8Array>) {
			csize += out.length;
			yield this.count(out);
		}
		await feeding;
		const { crc, usize } = stats;
		yield this.count(
			bytes([
				[0x08074b50, 4],
				[crc, 4],
				[csize, 4],
				[usize, 4],
			]),
		);
		this.entries.push({ name: nameBytes, offset: start, crc, csize, usize });
	}

	/** The central directory and its end record. */
	finish(): Uint8Array[] {
		const start = this.offset;
		const parts = this.entries.map((e) => this.count(this.centralRecord(e)));
		const n = this.entries.length;
		const size = this.offset - start;
		parts.push(
			this.count(
				bytes([
					[0x06054b50, 4],
					[0, 2],
					[0, 2],
					[n, 2],
					[n, 2],
					[size, 4],
					[start, 4],
					[0, 2],
				]),
			),
		);
		return parts;
	}

	private localHeader(name: Uint8Array): Uint8Array {
		const head = bytes([
			[0x04034b50, 4],
			[20, 2],
			[FLAGS, 2],
			[8, 2],
			[0, 2],
			[DOS_DATE, 2],
			[0, 4],
			[0, 4],
			[0, 4],
			[name.length, 2],
			[0, 2],
		]);
		return concat(head, name);
	}

	private centralRecord(e: Entry): Uint8Array {
		const head = bytes([
			[0x02014b50, 4],
			[20, 2],
			[20, 2],
			[FLAGS, 2],
			[8, 2],
			[0, 2],
			[DOS_DATE, 2],
			[e.crc, 4],
			[e.csize, 4],
			[e.usize, 4],
			[e.name.length, 2],
			[0, 2],
			[0, 2],
			[0, 2],
			[0, 2],
			[0, 4],
			[e.offset, 4],
		]);
		return concat(head, e.name);
	}

	private count(part: Uint8Array): Uint8Array {
		this.offset += part.length;
		return part;
	}
}

async function feed(
	writer: WritableStreamDefaultWriter<BufferSource>,
	chunks: AsyncIterable<Uint8Array>,
	stats: { crc: number; usize: number },
): Promise<void> {
	try {
		for await (const chunk of chunks) {
			stats.crc = crc32(stats.crc, chunk);
			stats.usize += chunk.length;
			await writer.write(chunk as Uint8Array<ArrayBuffer>);
		}
		await writer.close();
	} catch (error) {
		await writer.abort(error);
		throw error;
	}
}

function concat(a: Uint8Array, b: Uint8Array): Uint8Array {
	const out = new Uint8Array(a.length + b.length);
	out.set(a);
	out.set(b, a.length);
	return out;
}
