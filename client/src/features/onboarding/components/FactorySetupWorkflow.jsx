// PATH: src/features/onboarding/components/FactorySetupWorkflow.jsx
import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Camera, FileSpreadsheet, PlusCircle, Sparkles, Check, ArrowRight, X } from 'lucide-react'

export default function FactorySetupWorkflow({ isOpen, onClose }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const actionParam = searchParams.get('action')
  const onboardingParam = searchParams.get('onboarding')

  if (!isOpen && !actionParam && onboardingParam !== 'complete') return null

  const handleSelectWorkflow = (mode) => {
    switch (mode) {
      case 'ocr':
        navigate('/production?action=ocr')
        break
      case 'import':
        navigate('/inventory?action=import')
        break
      case 'manual':
        navigate('/inventory?action=add')
        break
      case 'demo':
        navigate('/?demo=loaded')
        break
      default:
        onClose?.()
        break
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-paper-light)] p-6 sm:p-8 shadow-2xl">
        <div className="flex items-start justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-[var(--color-stamp)]">
              FACTORY DATA INTAKE & SETUP
            </span>
            <h3 className="text-lg font-bold text-[var(--color-ink)]">
              Select Your Setup Intake Workflow
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--color-ink-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)] cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => handleSelectWorkflow('ocr')}
            className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)]/50 p-4 text-left transition-all hover:border-[var(--color-stamp)] hover:bg-[var(--color-stamp)]/5 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-stamp)] text-white">
                <Camera size={20} />
              </div>
              <div>
                <span className="font-sans text-sm font-bold text-[var(--color-ink)] block">
                  OCR Photo / Invoice Intake
                </span>
                <span className="text-xs text-[var(--color-ink-muted)] block">
                  Scan paper logs, receipts, or batch sheets into DANN
                </span>
              </div>
            </div>
            <ArrowRight size={18} className="text-[var(--color-stamp)]" />
          </button>

          <button
            type="button"
            onClick={() => handleSelectWorkflow('import')}
            className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)]/50 p-4 text-left transition-all hover:border-[var(--color-stamp)] hover:bg-[var(--color-stamp)]/5 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-copper)] text-white">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <span className="font-sans text-sm font-bold text-[var(--color-ink)] block">
                  Excel / CSV File Upload
                </span>
                <span className="text-xs text-[var(--color-ink-muted)] block">
                  Bulk import materials, products, and order ledgers
                </span>
              </div>
            </div>
            <ArrowRight size={18} className="text-[var(--color-copper)]" />
          </button>

          <button
            type="button"
            onClick={() => handleSelectWorkflow('manual')}
            className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-[var(--color-paper)]/50 p-4 text-left transition-all hover:border-[var(--color-stamp)] hover:bg-[var(--color-stamp)]/5 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--color-ink-muted)] text-white">
                <PlusCircle size={20} />
              </div>
              <div>
                <span className="font-sans text-sm font-bold text-[var(--color-ink)] block">
                  Manual Material & BOM Staging
                </span>
                <span className="text-xs text-[var(--color-ink-muted)] block">
                  Add raw stock and build product recipes step-by-step
                </span>
              </div>
            </div>
            <ArrowRight size={18} className="text-[var(--color-ink-muted)]" />
          </button>
        </div>
      </div>
    </div>
  )
}
