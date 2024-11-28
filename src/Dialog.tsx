import { useEffect, useRef } from 'react'
import { usePrevious } from './state-hooks'

export function Dialog({
  isOpen,
  onClose,
  modal = false,
  children,
  ...restProps
}: {
  isOpen: boolean
  onClose?: (returnValue: string) => void
  modal?: boolean
} & Omit<
  React.ClassAttributes<HTMLDialogElement> & React.DialogHTMLAttributes<HTMLDialogElement>,
  'onClose' | 'open'
>) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const wasOpen = usePrevious(isOpen)

  useEffect(() => {
    if (isOpen && !wasOpen) {
      if (modal) {
        dialogRef.current?.showModal()
      } else {
        dialogRef.current?.show()
      }
    } else if (!isOpen && wasOpen) {
      dialogRef.current?.close()
    }
  }, [isOpen, wasOpen, modal])

  useEffect(() => {
    const dialog = dialogRef.current!

    const handleClose = () => {
      onClose?.(dialog.returnValue)
    }

    dialog.addEventListener('close', handleClose)

    return () => {
      dialog.removeEventListener('close', handleClose)
    }
  }, [onClose])

  return (
    <dialog {...restProps} ref={dialogRef}>
      {isOpen ? children : undefined}
    </dialog>
  )
}
