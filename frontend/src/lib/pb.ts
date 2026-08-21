import PocketBase from 'pocketbase'
import { useSyncExternalStore } from 'react'

export const pb = new PocketBase(import.meta.env.VITE_PB_URL ?? 'https://pb.kdnfx.space')
pb.autoCancellation(false)

export function fileUrl(
  record: { id: string },
  filename: string,
  thumb?: string,
): string {
  // PB SDK ждёт «сырой» record с collectionId/collectionName — в ответах API они есть всегда.
  return pb.files.getURL(
    record as { [key: string]: unknown; id: string },
    filename,
    thumb ? { thumb } : undefined,
  )
}

function subscribeAuth(cb: () => void): () => void {
  return pb.authStore.onChange(cb)
}

export function useAuth() {
  const token = useSyncExternalStore(subscribeAuth, () => pb.authStore.token)
  return {
    valid: !!token && pb.authStore.isValid,
    email: ((pb.authStore.record?.email as string) ?? '').toLowerCase(),
    userId: pb.authStore.record?.id ?? '',
  }
}

const LAST_PLOT_KEY = 'udacha:lastPlot'

export function getLastPlot(): string {
  return localStorage.getItem(LAST_PLOT_KEY) ?? ''
}

export function setLastPlot(id: string) {
  localStorage.setItem(LAST_PLOT_KEY, id)
}

/** Человеческое сообщение об ошибке PocketBase. */
export function pbError(e: unknown): string {
  const err = e as { status?: number; message?: string }
  if (err?.status === 0) return 'Нет связи с сервером. Проверьте интернет.'
  if (err?.status === 401 || err?.status === 403) return 'Нет доступа. Войдите заново.'
  if (err?.status === 400) return 'Не получилось сохранить. Проверьте поля.'
  return 'Что-то пошло не так. Попробуйте ещё раз.'
}
