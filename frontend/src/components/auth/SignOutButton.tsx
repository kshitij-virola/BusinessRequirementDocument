'use client'
import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'

interface SignOutButtonProps {
  className?: string
}

const SignOutButton = ({ className }: SignOutButtonProps) => {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <LogOut className="h-4 w-4 shrink-0" />
        Sign out
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Sign out"
        description="Are you sure you want to sign out of your account?"
        size="sm"
      >
        <div className="flex justify-end gap-3">
          <Button variant="secondary" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <form action={logout}>
            <Button type="submit" className="bg-red-600 hover:bg-red-500 text-foreground border-0">
              Sign out
            </Button>
          </form>
        </div>
      </Modal>
    </>
  )
}

export default SignOutButton
