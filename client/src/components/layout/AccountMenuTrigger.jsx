import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AccountFooter, AccountMenuList } from './AccountMenu.jsx'
import { useIsDesktop } from '../../hooks/useIsDesktop.js'

// One popover trigger, shared by Sidebar (desktop) and MobileDrawer
// (mobile) so the account menu can't drift out of sync between them.
// On mobile, the popover never opens — the footer click goes straight
// to the full Settings page instead, matching Claude's own pattern.
export default function AccountMenuTrigger({ onNavigate }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const isDesktop = useIsDesktop()
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleFooterClick() {
    if (isDesktop) {
      setOpen((v) => !v)
    } else {
      navigate('/settings')
      onNavigate?.()
    }
  }

  return (
    <div ref={ref} className="relative border-t border-[var(--color-border)] pt-2">
      {isDesktop && open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-lg border border-[var(--color-border)] bg-[var(--color-paper-light)] p-2 shadow-xl">
          <AccountMenuList
            onNavigate={() => {
              setOpen(false)
              onNavigate?.()
            }}
          />
        </div>
      )}
      <AccountFooter onClick={handleFooterClick} />
    </div>
  )
}