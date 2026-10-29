/**
 * Stellar account address validation.
 *
 * Implements the StrKey checks the Stellar SDK performs for ed25519 public
 * keys (base32 alphabet, version byte and CRC16-XModem checksum) so a typo in
 * a destination address is caught before any funds move. A plain regex would
 * accept any 56-character "G..." string, including mistyped ones.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
/** StrKey version byte for ed25519 public keys ("G..."): 6 << 3. */
const ED25519_PUBLIC_KEY_VERSION = 6 << 3;
const PUBLIC_KEY_LENGTH = 56;
/** 1 version byte + 32 key bytes + 2 checksum bytes. */
const DECODED_LENGTH = 35;

function decodeBase32(input: string): Uint8Array | null {
  const bytes = new Uint8Array(Math.floor((input.length * 5) / 8));
  let buffer = 0;
  let bits = 0;
  let index = 0;

  for (const char of input) {
    const value = BASE32_ALPHABET.indexOf(char);
    if (value === -1) return null;
    buffer = (buffer << 5) | value;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes[index++] = (buffer >> bits) & 0xff;
    }
  }
  return bytes;
}

function crc16XModem(bytes: Uint8Array): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
    }
    crc &= 0xffff;
  }
  return crc;
}

/**
 * Returns true for a well-formed Stellar account ID (ed25519 public key, "G...").
 * Surrounding whitespace is ignored; lowercase input is rejected, as in the SDK.
 */
export function isValidStellarPublicKey(address: string): boolean {
  const value = address.trim();
  if (value.length !== PUBLIC_KEY_LENGTH || value[0] !== 'G') return false;

  const decoded = decodeBase32(value);
  if (!decoded || decoded.length !== DECODED_LENGTH) return false;
  if (decoded[0] !== ED25519_PUBLIC_KEY_VERSION) return false;

  const payload = decoded.subarray(0, DECODED_LENGTH - 2);
  const checksum = decoded[DECODED_LENGTH - 2] | (decoded[DECODED_LENGTH - 1] << 8);
  return crc16XModem(payload) === checksum;
}
