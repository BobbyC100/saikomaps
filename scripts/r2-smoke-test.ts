import "dotenv/config";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { r2, R2_BUCKET } from "../lib/storage/r2.ts";

async function main() {
  const key = `photos/_smoke/hello-${Date.now()}.txt`;
  const body = Buffer.from("hello from saiko\n", "utf8");

  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: "text/plain; charset=utf-8",
    })
  );

  console.log("Uploaded:", { bucket: R2_BUCKET, key });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
