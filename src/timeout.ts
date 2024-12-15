export async function timeout(timeoutMs: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      if (signal?.aborted) {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
        reject(signal.reason)
      } else {
        resolve()
      }
    }, timeoutMs)
    signal?.addEventListener('abort', () => {
      clearTimeout(id)
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      reject(signal.reason)
    })
  })
}
