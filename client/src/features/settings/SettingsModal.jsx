import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useSettings } from '../../context/SettingsContext.jsx'
import { SettingsContent } from './SettingsContent.jsx'

export default function SettingsModal() {
  const { isOpen, section, close } = useSettings()

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={close}
        >
          <motion.div
            className="flex h-[560px] w-[720px] max-w-[90vw] flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-paper-light)] shadow-2xl"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
              <h2 className="font-[Roboto_Slab] text-base font-semibold text-[var(--color-ink)]">
                Settings
              </h2>
              <button
                type="button"
                onClick={close}
                className="rounded-md p-1 text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div className="min-h-0 flex-1">
              <SettingsContent variant="modal" initialSection={section} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}