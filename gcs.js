// api/gcs.js
import { Storage } from '@google-cloud/storage';
import path from 'path';

const storage = new Storage(); // usa Application Default Credentials (Cloud Run / local con GOOGLE_APPLICATION_CREDENTIALS)

const bucketName = process.env.GCS_BUCKET;
if (!bucketName) {
  console.warn('[gcs] Falta env GCS_BUCKET. El endpoint /api/upload fallará hasta configurarlo.');
}

export async function uploadImageBuffer({ buffer, originalname, mimetype, folder = 'mrsmartservice' }) {
  if (!bucketName) throw new Error('missing_gcs_bucket');

  const bucket = storage.bucket(bucketName);
  const ext = path.extname(originalname || '') || '';
  const safeExt = ext.length <= 10 ? ext : '';
  const objectName = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}${safeExt}`;

  const file = bucket.file(objectName);

  // Subimos el archivo
  await file.save(buffer, {
    resumable: false,
    contentType: mimetype || 'application/octet-stream',
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  // Hacemos el objeto público para poder servirlo directo (igual que Cloudinary secure_url)
  // Alternativa: generar signed URLs, pero para ecommerce es más simple usar lectura pública.
  await file.makePublic();

  return {
    bucket: bucketName,
    object: objectName,
    url: `https://storage.googleapis.com/${bucketName}/${encodeURI(objectName)}`,
  };
}
