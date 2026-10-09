import { useCallback, useEffect, useRef, useState } from 'react'

export function useRemoteData(loader) {
  const [data, setData] = useState()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const activeRef = useRef(false)
  const requestRef = useRef(0)
  const reload = useCallback(async () => {
    const requestId = requestRef.current + 1
    requestRef.current = requestId
    setLoading(true)
    setError('')
    try {
      const result = await loader()
      if (activeRef.current && requestRef.current === requestId) setData(result)
    } catch (loadError) {
      if (activeRef.current && requestRef.current === requestId) {
        setError(loadError.message || 'Could not load data from ArtSpace.')
      }
    } finally {
      if (activeRef.current && requestRef.current === requestId) setLoading(false)
    }
  }, [loader])

  useEffect(() => {
    requestRef.current += 1
    activeRef.current = true
    Promise.resolve().then(() => {
      if (activeRef.current) reload()
    })
    return () => {
      activeRef.current = false
    }
  }, [reload])

  return { data, setData, error, loading, reload }
}
