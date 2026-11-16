// node --test mobile/scripts/publish-store.test.cjs
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { releaseNotes, formatNotes, googleJwt, rustoreTimestamp, rustoreSignature, googlePublish, rustorePublish } = require("./publish-store.cjs");

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "..", "public", "app-releases.json"), "utf8"));
const app = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "app.json"), "utf8")).expo;

test("release notes exist for the current versionCode", () => {
  const notes = releaseNotes(catalog, app.android.versionCode);
  assert.ok(notes.changes.length >= 1);
  assert.throws(() => releaseNotes(catalog, 999999), /нет списка изменений/);
});

test("store notes keep whole lines within the limit", () => {
  const notes = { changes: ["Первый пункт.", "Второй пункт", "x".repeat(600)] };
  assert.equal(formatNotes(notes, 500), "• Первый пункт.\n• Второй пункт.");
  assert.throws(() => formatNotes({ changes: ["x".repeat(600)] }, 500), /длиннее лимита/);
  assert.ok(formatNotes(releaseNotes(catalog, app.android.versionCode), 500).length <= 500);
});

test("Google service account JWT is RS256-signed with the publisher scope", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const account = { client_email: "publisher@example.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) };
  const jwt = googleJwt(account, 1_800_000_000);
  const [header, claims, signature] = jwt.split(".");
  assert.deepEqual(JSON.parse(Buffer.from(header, "base64url")), { alg: "RS256", typ: "JWT" });
  const body = JSON.parse(Buffer.from(claims, "base64url"));
  assert.equal(body.scope, "https://www.googleapis.com/auth/androidpublisher");
  assert.equal(body.aud, "https://oauth2.googleapis.com/token");
  assert.equal(body.exp - body.iat, 3600);
  assert.ok(crypto.createVerify("RSA-SHA256").update(`${header}.${claims}`).verify(publicKey, Buffer.from(signature, "base64url")));
});

test("RuStore signature is SHA512withRSA over keyId + timestamp with a Base64 PKCS#8 key", () => {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const der = privateKey.export({ type: "pkcs8", format: "der" }).toString("base64");
  const timestamp = rustoreTimestamp(new Date(Date.UTC(2026, 10, 16, 8, 49, 8, 290)));
  assert.equal(timestamp, "2026-11-16T08:49:08.290+00:00");
  const signature = rustoreSignature("1275328", timestamp, der);
  assert.ok(crypto.verify("sha512", Buffer.from("1275328" + timestamp), publicKey, Buffer.from(signature, "base64")));
  const pem = privateKey.export({ type: "pkcs8", format: "pem" });
  assert.ok(crypto.verify("sha512", Buffer.from("1" + timestamp), publicKey, Buffer.from(rustoreSignature("1", timestamp, pem), "base64")));
});

/** @param {Array} routes - Правила ответов [метод, регулярка, ответ]. @returns {{ calls: object[], restore: () => void }} Подменённый fetch с журналом запросов. */
function stubFetch(routes) {
  const calls = [];
  const original = global.fetch;
  global.fetch = async (url, options = {}) => {
    const call = { url: String(url), method: options.method || "GET", headers: options.headers || {}, body: options.body };
    calls.push(call);
    const route = routes.find(([method, pattern]) => method === call.method && pattern.test(call.url));
    if (!route) return new Response(JSON.stringify({ error: `no route ${call.method} ${call.url}` }), { status: 500 });
    const { status = 200, body = {}, headers = {} } = route[2];
    return new Response(JSON.stringify(body), { status, headers });
  };
  return { calls, restore: () => { global.fetch = original; } };
}

/** @returns {{ publicKey: crypto.KeyObject, file: string }} Временные ключи обоих магазинов и файл сборки. */
function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "atmos-publish-"));
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  fs.writeFileSync(path.join(dir, "google.json"), JSON.stringify({ client_email: "p@x.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }) }));
  fs.writeFileSync(path.join(dir, "rustore.json"), JSON.stringify({ keyId: "42", privateKey: privateKey.export({ type: "pkcs8", format: "der" }).toString("base64") }));
  fs.writeFileSync(path.join(dir, "build.bin"), Buffer.alloc(2048, 1));
  process.env.ATMOS_GOOGLE_PLAY_KEY_FILE = path.join(dir, "google.json");
  process.env.ATMOS_RUSTORE_KEY_FILE = path.join(dir, "rustore.json");
  return { publicKey, file: path.join(dir, "build.bin") };
}

test("Google Play flow: edit, resumable upload, track release, validate, commit", async () => {
  const { file } = fixture();
  const code = app.android.versionCode;
  const stub = stubFetch([
    ["POST", /oauth2\.googleapis\.com\/token$/, { body: { access_token: "t" } }],
    ["POST", /\/edits$/, { body: { id: "e1" } }],
    ["POST", /\/upload\/.*\/edits\/e1\/bundles\?uploadType=resumable$/, { headers: { location: "https://upload.example/session" } }],
    ["PUT", /upload\.example\/session$/, { body: { versionCode: code } }],
    ["PUT", /\/edits\/e1\/tracks\/alpha$/, { body: {} }],
    ["POST", /\/edits\/e1:validate$/, { body: {} }],
    ["POST", /\/edits\/e1:commit$/, { body: {} }],
  ]);
  try { await googlePublish({ file, track: "alpha", submit: true }); } finally { stub.restore(); }
  const steps = stub.calls.map((call) => `${call.method} ${new URL(call.url).pathname.replace(/\/applications\/[^/]+/, "/applications/pkg")}${new URL(call.url).search}`);
  assert.deepEqual(steps, [
    "POST /token",
    "POST /androidpublisher/v3/applications/pkg/edits",
    "POST /upload/androidpublisher/v3/applications/pkg/edits/e1/bundles?uploadType=resumable",
    "PUT /session",
    "PUT /androidpublisher/v3/applications/pkg/edits/e1/tracks/alpha",
    "POST /androidpublisher/v3/applications/pkg/edits/e1:validate",
    "POST /androidpublisher/v3/applications/pkg/edits/e1:commit",
  ]);
  const release = JSON.parse(stub.calls[4].body).releases[0];
  assert.deepEqual(release.versionCodes, [String(code)]);
  assert.equal(release.status, "completed");
  assert.equal(release.releaseNotes[0].language, "ru-RU");
  assert.ok(release.releaseNotes[0].text.length <= 500);
});

test("Google Play stops on a wrong versionCode and discards the edit", async () => {
  const { file } = fixture();
  const stub = stubFetch([
    ["POST", /token$/, { body: { access_token: "t" } }],
    ["POST", /\/edits$/, { body: { id: "e2" } }],
    ["POST", /uploadType=resumable$/, { headers: { location: "https://upload.example/s" } }],
    ["PUT", /upload\.example\/s$/, { body: { versionCode: 1 } }],
    ["DELETE", /\/edits\/e2$/, { body: {} }],
  ]);
  try { await assert.rejects(googlePublish({ file, track: "alpha", submit: false }), /versionCode 1/); } finally { stub.restore(); }
  assert.equal(stub.calls.at(-1).method, "DELETE");
});

test("RuStore flow: signed auth, draft check, create, APK upload, verify, commit", async () => {
  const { file, publicKey } = fixture();
  const code = app.android.versionCode;
  const stub = stubFetch([
    ["POST", /\/public\/auth\/$/, { body: { code: "OK", body: { jwe: "jwe", ttl: 900 } } }],
    ["GET", /\/version\?.*versionStatuses=DRAFT/, { body: { code: "OK", body: { content: [] } } }],
    ["POST", /\/version$/, { body: { code: "OK", body: 777 } }],
    ["POST", /\/version\/777\/apk\?isMainApk=true&servicesType=Unknown$/, { body: { code: "OK", body: {} } }],
    ["GET", /\/public\/v2\/application\/.*\/version\/777$/, { body: { code: "OK", body: { packages: [{ verCode: code, isMainApk: true }] } } }],
    ["POST", /\/version\/777\/commit\?priorityUpdate=0$/, { body: { code: "OK", body: null } }],
  ]);
  try { await rustorePublish({ file, submit: true, replaceDraft: false }); } finally { stub.restore(); }
  assert.ok(stub.calls.every((call) => call.url.startsWith("https://public-api-m.rustore.ru/")));
  const auth = JSON.parse(stub.calls[0].body);
  assert.equal(auth.keyId, "42");
  assert.ok(crypto.verify("sha512", Buffer.from(auth.keyId + auth.timestamp), publicKey, Buffer.from(auth.signature, "base64")));
  assert.ok(stub.calls.slice(1).every((call) => call.headers["Public-Token"] === "jwe"));
  const draft = JSON.parse(stub.calls[2].body);
  assert.equal(draft.publishType, "INSTANTLY");
  assert.ok(draft.whatsNew.length > 0 && draft.whatsNew.length <= 5000);
  assert.ok(draft.moderInfo.length <= 180);
  assert.ok(stub.calls[3].body instanceof FormData && stub.calls[3].body.get("file"));
  assert.match(stub.calls.at(-1).url, /commit/);
});

test("RuStore keeps an existing draft unless asked and removes its own draft after a failed upload", async () => {
  const { file } = fixture();
  let stub = stubFetch([
    ["POST", /\/public\/auth\/$/, { body: { code: "OK", body: { jwe: "jwe" } } }],
    ["GET", /versionStatuses=DRAFT/, { body: { code: "OK", body: { content: [{ versionId: 5, versionName: "3.0.13" }] } } }],
  ]);
  try { await assert.rejects(rustorePublish({ file, submit: false, replaceDraft: false }), /уже есть черновик/); } finally { stub.restore(); }
  stub = stubFetch([
    ["POST", /\/public\/auth\/$/, { body: { code: "OK", body: { jwe: "jwe" } } }],
    ["GET", /versionStatuses=DRAFT/, { body: { code: "OK", body: { content: [] } } }],
    ["POST", /\/version$/, { body: { code: "OK", body: { versionId: 9 } } }],
    ["POST", /\/version\/9\/apk/, { status: 400, body: { code: "ERROR", message: "APK/AAB contains new sensitive permissions" } }],
    ["DELETE", /\/version\/9$/, { body: { code: "OK" } }],
  ]);
  try { await assert.rejects(rustorePublish({ file, submit: true, replaceDraft: false }), /sensitive permissions/); } finally { stub.restore(); }
  assert.equal(stub.calls.at(-1).method, "DELETE");
});
