import { useEffect, useRef, useState } from 'react'
import { AccountFooter, AccountMenuList } from './AccountMenu.jsx'

// One popover trigger, shared by Sidebar (desktop) and MobileDrawer
// (mobile) so the account menu can't drift out of sync between them.
export default function AccountMenuTrigger({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative border-t border-[var(--color-border)] pt-2">
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2 shadow-xl">
          <AccountMenuList
            onNavigate={() => {
              setOpen(false)
              onNavigate?.()
            }}
          />
        </div>
      )}
      <AccountFooter onClick={() => setOpen((v) => !v)} />
    </div>
  )
}