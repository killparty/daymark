/** Minimal IPv4/IPv6 CIDR matching for the trusted-proxy check. */

export interface Cidr {
  version: 4 | 6;
  network: bigint;
  prefix: number;
}

function parseV4(ip: string): bigint | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let out = 0n;
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n > 255) return null;
    out = (out << 8n) | BigInt(n);
  }
  return out;
}

function parseV6(ip: string): bigint | null {
  let addr = ip.split("%")[0] ?? "";
  // Embedded IPv4 tail, e.g. ::ffff:192.168.1.2
  const v4Tail = addr.match(/(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Tail?.[1]) {
    const v4 = parseV4(v4Tail[1]);
    if (v4 === null) return null;
    const hex = `${(v4 >> 16n).toString(16)}:${(v4 & 0xffffn).toString(16)}`;
    addr = addr.slice(0, -v4Tail[1].length) + hex;
  }
  const halves = addr.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 0) return null;
  const groups = [...head, ...Array<string>(missing).fill("0"), ...tail];
  let out = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/i.test(g)) return null;
    out = (out << 16n) | BigInt(Number.parseInt(g, 16));
  }
  return out;
}

/** Parses an address. IPv4-mapped IPv6 addresses are treated as IPv4. */
export function parseIp(ip: string): { version: 4 | 6; value: bigint } | null {
  const v4 = parseV4(ip);
  if (v4 !== null) return { version: 4, value: v4 };
  const v6 = parseV6(ip);
  if (v6 === null) return null;
  if (v6 >> 32n === 0xffffn) return { version: 4, value: v6 & 0xffffffffn };
  return { version: 6, value: v6 };
}

export function parseCidr(input: string): Cidr {
  const [addr = "", prefixText] = input.trim().split("/");
  const ip = parseIp(addr);
  if (!ip) throw new Error(`Invalid address in CIDR "${input}"`);
  const bits = ip.version === 4 ? 32 : 128;
  const prefix = prefixText === undefined ? bits : Number(prefixText);
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > bits) {
    throw new Error(`Invalid prefix in CIDR "${input}"`);
  }
  const shift = BigInt(bits - prefix);
  return { version: ip.version, network: (ip.value >> shift) << shift, prefix };
}

export function parseCidrList(input: string): Cidr[] {
  return input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map(parseCidr);
}

export function ipInCidrs(ip: string, cidrs: Cidr[]): boolean {
  const parsed = parseIp(ip);
  if (!parsed) return false;
  return cidrs.some((c) => {
    if (c.version !== parsed.version) return false;
    const shift = BigInt((c.version === 4 ? 32 : 128) - c.prefix);
    return (parsed.value >> shift) << shift === c.network;
  });
}
