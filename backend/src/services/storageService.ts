import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import archiver from 'archiver'
import { PassThrough } from 'stream'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const s3 = new S3Client({
  region: env.aws.region,
  credentials: {
    accessKeyId:     env.aws.accessKey,
    secretAccessKey: env.aws.secretKey,
  },
})

export const storageService = {
  async uploadBuffer(key: string, buffer: Buffer, contentType = 'application/octet-stream'): Promise<string> {
    await s3.send(new PutObjectCommand({
      Bucket: env.aws.s3Bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }))
    return `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/${key}`
  },

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.aws.s3Bucket, Key: key }), { expiresIn })
  },

  async delete(key: string): Promise<void> {
    await s3.send(new DeleteObjectCommand({ Bucket: env.aws.s3Bucket, Key: key }))
  },

  async packToZip(files: { path: string; content: string }[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } })
      const chunks: Buffer[] = []
      const pass = new PassThrough()

      pass.on('data', (chunk: Buffer) => chunks.push(chunk))
      pass.on('end', () => resolve(Buffer.concat(chunks)))
      pass.on('error', reject)
      archive.on('error', reject)

      archive.pipe(pass)
      for (const file of files) {
        archive.append(file.content, { name: file.path })
      }
      archive.finalize()
    })
  },
}
