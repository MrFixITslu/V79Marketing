import { createHash, createHmac, timingSafeEqual } from "node:crypto";
export function verifyPlatformRequest({method,pathname,timestamp,signature,body,secret}) {
  const epoch=Number(timestamp);
  if (!Number.isFinite(epoch) || Math.abs(Date.now()-epoch)>300000 || !signature) return false;
  const h=createHash("sha256").update(body).digest("hex");
  const canonical=[method,pathname,timestamp,h].join("\n");
  const expected=createHmac("sha256",secret).update(canonical).digest("hex");
  const a=Buffer.from(expected,"hex"), b=Buffer.from(String(signature),"hex");
  return a.length===b.length && timingSafeEqual(a,b);
}
