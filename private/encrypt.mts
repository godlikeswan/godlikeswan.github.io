import fs from "fs";

const c = globalThis.crypto;
const s = c.subtle;
const te = new TextEncoder();

const keyRaw = fs.readFileSync("key.txt", "utf-8");
const keyRawTrimmed = keyRaw.trim();
const keyRawEncoded = te.encode(keyRawTrimmed);
// TODO: add key derivation
const keyData = new Uint8Array(32);
for (let i = 0; i < 32; ++i)
  keyData[i] = keyRawEncoded[i % keyRawEncoded.length];

const key = await s.importKey("raw", keyData, "AES-GCM", false, ["encrypt"]);

const data = fs.readFileSync("notes.html");

const iv = c.getRandomValues(new Uint8Array(12));

const encrypted = await s.encrypt({ name: "AES-GCM", iv: iv }, key, data);

const encryptedTyped = new Uint8Array(encrypted);
const output = new Uint8Array(iv.length + encryptedTyped.length);
output.set(iv);
output.set(encryptedTyped, iv.length);

fs.writeFileSync("notes.bin", output);
