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

const key = await s.importKey("raw", keyData, "AES-GCM", false, ["decrypt"]);

const input = fs.readFileSync("notes.bin");
const inputTyped = new Uint8Array(input);

const iv = inputTyped.slice(0, 12);

const encrypted = inputTyped.slice(12);

const data = await s.decrypt({ name: "AES-GCM", iv: iv }, key, encrypted);

const dataTyped = new Uint8Array(data);

fs.writeFileSync("notes.html", dataTyped);
