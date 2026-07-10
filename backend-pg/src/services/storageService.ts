import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import archiver = require('archiver')
import { PassThrough } from 'stream'
import fs from 'fs'
import path from 'path'
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
    if (!env.aws.accessKey || env.aws.accessKey === 'your-access-key' || !env.aws.secretKey || env.aws.secretKey === 'your-secret-key') {
      const localPath = path.join(__dirname, '../../uploads', key)
      const dir = path.dirname(localPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(localPath, buffer)
      return `${env.backendUrl}/uploads/${key}`
    }

    try {
      await s3.send(new PutObjectCommand({
        Bucket: env.aws.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      }))
      return `https://${env.aws.s3Bucket}.s3.${env.aws.region}.amazonaws.com/${key}`
    } catch (err) {
      logger.error('S3 upload failed, falling back to local storage:', err)
      const localPath = path.join(__dirname, '../../uploads', key)
      const dir = path.dirname(localPath)
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(localPath, buffer)
      return `${env.backendUrl}/uploads/${key}`
    }
  },

  async getSignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    if (!env.aws.accessKey || env.aws.accessKey === 'your-access-key' || !env.aws.secretKey || env.aws.secretKey === 'your-secret-key') {
      return `${env.backendUrl}/uploads/${key}`
    }
    try {
      return await getSignedUrl(s3, new GetObjectCommand({ Bucket: env.aws.s3Bucket, Key: key }), { expiresIn })
    } catch (err) {
      logger.error('S3 getSignedDownloadUrl failed, returning local uploads URL:', err)
      return `${env.backendUrl}/uploads/${key}`
    }
  },

  async getObjectBuffer(key: string): Promise<Buffer> {
    if (!env.aws.accessKey || env.aws.accessKey === 'your-access-key' || !env.aws.secretKey || env.aws.secretKey === 'your-secret-key') {
      const localPath = path.join(__dirname, '../../uploads', key)
      if (fs.existsSync(localPath)) return fs.readFileSync(localPath)
      throw new Error(`File not found locally: ${key}`)
    }

    try {
      const response = await s3.send(new GetObjectCommand({ Bucket: env.aws.s3Bucket, Key: key }))
      const streamToBuffer = async (stream: any): Promise<Buffer> => {
        return new Promise((resolve, reject) => {
          const chunks: any[] = []
          stream.on('data', (chunk: any) => chunks.push(chunk))
          stream.on('error', reject)
          stream.on('end', () => resolve(Buffer.concat(chunks)))
        })
      }
      if (!response.Body) {
        throw new Error('S3 response body is empty')
      }
      return await streamToBuffer(response.Body)
    } catch (err) {
      logger.error(`S3 getObject failed for ${key}, checking local fallback:`, err)
      const localPath = path.join(__dirname, '../../uploads', key)
      if (fs.existsSync(localPath)) return fs.readFileSync(localPath)
      throw err
    }
  },

  async delete(key: string): Promise<void> {
    if (!env.aws.accessKey || env.aws.accessKey === 'your-access-key' || !env.aws.secretKey || env.aws.secretKey === 'your-secret-key') {
      const localPath = path.join(__dirname, '../../uploads', key)
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath)
      return
    }
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: env.aws.s3Bucket, Key: key }))
    } catch (err) {
      logger.error(`S3 delete failed for ${key}, deleting local file if exists:`, err)
      const localPath = path.join(__dirname, '../../uploads', key)
      if (fs.existsSync(localPath)) fs.unlinkSync(localPath)
    }
  },

  async packToZip(files: { path: string; content: string }[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const { ZipArchive } = archiver as any
      const archive = new ZipArchive({ zlib: { level: 9 } })
      const chunks: Buffer[] = []
      const pass = new PassThrough()

      pass.on('data', (chunk: Buffer) => chunks.push(chunk))
      pass.on('end', () => resolve(Buffer.concat(chunks)))
      pass.on('error', reject)
      archive.on('error', reject)

      archive.pipe(pass)
      for (const file of files) archive.append(file.content, { name: file.path })
      archive.finalize()
    })
  },
}
