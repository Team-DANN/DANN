import { useCallback, useEffect, useState } from 'react'
import { listStaff } from '../../../lib/api/staff.js'

export function useStaff() {
  const [staff, setStaff] = useState([])
  const [businessCode, setBusinessCode] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Refetching does not flip `loading` back on, so the list never flashes
  // after an add, edit or remove.
  const refetch = useCallback(async () => {
    try {
      setError('')
      const res = await listStaff()
      setStaff(res.staff)
      setBusinessCode(res.businessCode)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { staff, businessCode, loading, error, refetch }
}