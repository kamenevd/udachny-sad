import { create } from 'zustand'

interface ToastState {
  msg: string
  show: (msg: string) => void
  hide: () => void
}

let timer: ReturnType<typeof setTimeout> | undefined

export const useToast = create<ToastState>((set) => ({
  msg: '',
  show: (msg) => {
    set({ msg })
    clearTimeout(timer)
    timer = setTimeout(() => set({ msg: '' }), 3500)
  },
  hide: () => set({ msg: '' }),
}))

export function toast(msg: string) {
  useToast.getState().show(msg)
}
