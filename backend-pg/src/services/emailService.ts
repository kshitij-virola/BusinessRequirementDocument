import nodemailer from 'nodemailer'
import { env } from '../config/env'
import { logger } from '../utils/logger'

const transporter = nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  auth: { user: env.smtp.user, pass: env.smtp.pass },
})

const send = async (to: string, subject: string, html: string): Promise<void> => {
  try {
    await transporter.sendMail({ from: env.smtp.from, to, subject, html })
    logger.debug(`Email sent to ${to}: ${subject}`)
  } catch (err) {
    logger.error('Email send failed:', err)
  }
}

export const emailService = {
  async sendVerification(to: string, token: string): Promise<void> {
    const url = `${env.clientUrl}/verify-email?token=${token}`
    await send(
      to,
      'Verify your TROO AI email',
      `<p>Click the link below to verify your email:</p><a href="${url}">${url}</a><p>Expires in 24 hours.</p>`
    )
  },

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const url = `${env.clientUrl}/reset-password?token=${token}`
    await send(
      to,
      'Reset your TROO AI password',
      `<p>Click the link below to reset your password:</p><a href="${url}">${url}</a><p>Expires in 1 hour.</p>`
    )
  },

  async sendWelcome(to: string, name: string): Promise<void> {
    await send(
      to,
      'Welcome to TROO AI!',
      `<h1>Welcome, ${name}!</h1><p>Start building AI-powered themes at <a href="${env.clientUrl}">${env.clientUrl}</a></p>`
    )
  },
}
