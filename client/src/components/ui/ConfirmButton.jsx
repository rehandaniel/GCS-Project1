import { useEffect, useState } from 'react'

/** Tombol dua langkah untuk aksi berisiko: klik pertama meminta konfirmasi (3 detik), klik kedua menjalankan. */
export default function ConfirmButton({ onConfirm, confirm = true, confirmLabel = 'Confirm?', children, className = '', ...props }) {
  const [asking, setAsking] = useState(false)

  useEffect(() => {
    if (!asking) return
    const timer = setTimeout(() => setAsking(false), 3000)
    return () => clearTimeout(timer)
  }, [asking])

  const click = () => {
    if (confirm && !asking) return setAsking(true)
    setAsking(false)
    onConfirm()
  }

  return (
    <button {...props} className={`${className} ${asking ? 'danger' : ''}`} onClick={click}>
      {asking ? confirmLabel : children}
    </button>
  )
}
