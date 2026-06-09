'use client'

import { useState, useTransition, useEffect } from 'react'
import { mutate } from 'swr'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { useMe, KEYS } from '@/lib/api/hooks'
import { authApi } from '@/lib/api/auth'

// export const metadata: Metadata = { title: 'Settings - TROO AI' }

const SettingsPage = () => {
  const { data: user, isLoading } = useMe()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [profilePending, startProfileTransition] = useTransition()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [passwordPending, startPasswordTransition] = useTransition()

  const [showDeactivateModal, setShowDeactivateModal] = useState(false)
  const [deactivatePending, startDeactivateTransition] = useTransition()

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
    }
  }, [user])

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg(null)
    startProfileTransition(async () => {
      try {
        await authApi.updateProfile(name, email)
        await mutate(KEYS.me)
        setProfileMsg({ type: 'success', text: 'Profile updated.' })
      } catch {
        setProfileMsg({ type: 'error', text: 'Failed to update profile.' })
      }
    })
  }

  const handleDeactivate = () => {
    startDeactivateTransition(async () => {
      try {
        await authApi.deactivateAccount()
        window.location.href = '/api/auth/clear-session'
      } catch {
        setShowDeactivateModal(false)
      }
    })
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMsg(null)
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }
    startPasswordTransition(async () => {
      try {
        await authApi.updatePassword(currentPassword, newPassword)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setPasswordMsg({ type: 'success', text: 'Password updated.' })
      } catch {
        setPasswordMsg({ type: 'error', text: 'Failed to update password.' })
      }
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-5 sm:space-y-6 max-w-2xl animate-pulse">
        <div>
          <div className="h-7 w-32 rounded bg-secondary" />
          <div className="h-4 w-56 rounded bg-secondary mt-2" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <div className="h-4 w-16 rounded bg-secondary" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="h-10 rounded-lg bg-secondary" />
            <div className="h-10 rounded-lg bg-secondary" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-secondary" />
        </div>
        <div className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
          <div className="h-4 w-32 rounded bg-secondary" />
          <div className="space-y-3">
            <div className="h-10 rounded-lg bg-secondary" />
            <div className="h-10 rounded-lg bg-secondary" />
            <div className="h-10 rounded-lg bg-secondary" />
          </div>
          <div className="h-9 w-36 rounded-lg bg-secondary" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 sm:space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your account and preferences</p>
      </div>

      <form onSubmit={handleProfileSubmit} className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-semibold text-foreground">Profile</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {profileMsg && (
          <p className={`text-xs ${profileMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {profileMsg.text}
          </p>
        )}
        <Button type="submit" loading={profilePending}>Save changes</Button>
      </form>

      <form onSubmit={handlePasswordSubmit} className="rounded-xl border border-border bg-card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-semibold text-foreground">Change Password</h2>
        <div className="space-y-3">
          <Input
            label="Current Password"
            type="password"
            placeholder="Enter current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <Input
            label="New Password"
            type="password"
            placeholder="Enter new password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="Repeat new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
          />
        </div>
        {passwordMsg && (
          <p className={`text-xs ${passwordMsg.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
            {passwordMsg.text}
          </p>
        )}
        <Button type="submit" loading={passwordPending}>Update password</Button>
      </form>

      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 sm:p-6 space-y-3">
        <h2 className="text-sm sm:text-base font-semibold text-red-400">Danger Zone</h2>
        <p className="text-sm text-gray-400">Deactivating your account will disable access. You can reactivate by contacting support.</p>
        <Button variant="danger" size="sm" onClick={() => setShowDeactivateModal(true)}>Deactivate account</Button>
      </div>

      <Modal
        open={showDeactivateModal}
        onClose={() => setShowDeactivateModal(false)}
        title="Deactivate account"
        description="Are you sure you want to deactivate your account? You will be logged out immediately and lose access until you contact support."
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setShowDeactivateModal(false)} disabled={deactivatePending}>
            Cancel
          </Button>
          <Button variant="danger" loading={deactivatePending} onClick={handleDeactivate}>
            Deactivate
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default SettingsPage
