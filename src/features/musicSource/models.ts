export interface MusicSourceManifest {
  schema_version: number
  source_id: string
  name: string
  version: string
  revision: number
  content_url: string
  sha256: string
  max_size: number
  updated_at: string
}

export type ManagedSourcePhase = 'idle' | 'updating' | 'ready' | 'error'

export interface ManagedSourceStatus {
  phase: ManagedSourcePhase
  manifest?: MusicSourceManifest
  message?: string
}
