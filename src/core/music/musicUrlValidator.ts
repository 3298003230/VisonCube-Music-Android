const checkedMusicUrls = new Set<string>()
const MUSIC_URL_CHECK_TIMEOUT_MS = 6000
const MUSIC_URL_CACHE_LIMIT = 200
const invalidContentTypePattern = /^(?:application\/(?:json|problem\+json)|text\/(?:html|plain))(?:;|$)/

const rememberMusicUrl = (url: string) => {
  if (checkedMusicUrls.size >= MUSIC_URL_CACHE_LIMIT) checkedMusicUrls.clear()
  checkedMusicUrls.add(url)
}

export const assertMusicUrlAvailable = async(url: string): Promise<void> => {
  if (checkedMusicUrls.has(url)) return

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    let settled = false

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      if (error) reject(error)
      else resolve()
    }

    request.open('GET', url, true)
    request.timeout = MUSIC_URL_CHECK_TIMEOUT_MS
    request.setRequestHeader('Range', 'bytes=0-1')
    request.setRequestHeader('Accept', 'audio/*,application/octet-stream;q=0.9,*/*;q=0.1')
    request.onreadystatechange = () => {
      if (request.readyState != XMLHttpRequest.HEADERS_RECEIVED) return

      const contentType = (request.getResponseHeader('content-type') ?? '').toLowerCase()
      if (![200, 206].includes(request.status) || invalidContentTypePattern.test(contentType)) {
        finish(new Error(`music url unavailable (${request.status})`))
      } else {
        rememberMusicUrl(url)
        finish()
      }
      request.abort()
    }
    request.onerror = () => { finish(new Error('music url request failed')) }
    request.ontimeout = () => { finish(new Error('music url request timeout')) }
    request.onabort = () => { finish(new Error('music url request aborted')) }
    request.send()
  })
}
