import { Client as Minio } from 'minio';

export function initMinio(): Minio {
  const endpoint = process.env.MINIO_ENDPOINT || 'localhost';
  const port = Number(process.env.MINIO_PORT || 9000);
  const useSSL = (process.env.MINIO_USE_SSL || 'false') === 'true';
  const accessKey = process.env.MINIO_ACCESS_KEY || 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY || 'minioadmin';

  return new Minio({
    endPoint: endpoint,
    port,
    useSSL,
    accessKey,
    secretKey
  });
}

export async function getObjectBytes(minio: Minio, bucket: string, key: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    minio.getObject(bucket, key, (err, stream) => {
      if (err) return reject(err);
      const chunks: Buffer[] = [];
      stream.on('data', (c: Buffer) => chunks.push(c));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  });
}

export async function putObject(minio: Minio, bucket: string, key: string, data: Buffer | string) {
  const buf = typeof data === 'string' ? Buffer.from(data) : data;
  await minio.putObject(bucket, key, buf);
}
