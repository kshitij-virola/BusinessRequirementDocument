import { z } from 'zod'

export const SignupFormSchema = z
  .object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).trim(),
    email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
    password: z
      .string()
      .min(8, { message: 'Must be at least 8 characters.' })
      .regex(/[a-zA-Z]/, { message: 'Must contain at least one letter.' })
      .regex(/[0-9]/, { message: 'Must contain at least one number.' })
      .trim(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const LoginFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z.string().min(1, { message: 'Password is required.' }),
})

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
})

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, { message: 'Reset token is missing or invalid.' }),
    password: z
      .string()
      .min(8, { message: 'Must be at least 8 characters.' })
      .regex(/[a-zA-Z]/, { message: 'Must contain at least one letter.' })
      .regex(/[0-9]/, { message: 'Must contain at least one number.' })
      .trim(),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type SignupFormData = z.infer<typeof SignupFormSchema>
export type LoginFormData = z.infer<typeof LoginFormSchema>
export type ForgotPasswordData = z.infer<typeof ForgotPasswordSchema>
export type ResetPasswordData = z.infer<typeof ResetPasswordSchema>
