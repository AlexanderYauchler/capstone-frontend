// ============================================================================
// CoSign — In-Memory Transient Media Registry
// Holds active MediaStreams, audio Blobs, and temporary object URLs in memory.
// NEVER serialized to sessionStorage or localStorage.
// ============================================================================

export interface TransientRecordingHandle {
  readonly recordingId: string;
  readonly sessionId: string;
  readonly mimeType: string;
  readonly blob: Blob;
  readonly objectUrl: string;
  readonly createdAt: string;
}

class TransientMediaRegistry {
  private readonly recordings = new Map<string, TransientRecordingHandle>();
  private activeStreams = new Set<MediaStream>();

  public registerStream(stream: MediaStream): void {
    this.activeStreams.add(stream);
  }

  public stopStream(stream: MediaStream): void {
    for (const track of stream.getTracks()) {
      track.stop();
    }
    this.activeStreams.delete(stream);
  }

  public stopAllStreams(): void {
    for (const stream of this.activeStreams) {
      for (const track of stream.getTracks()) {
        track.stop();
      }
    }
    this.activeStreams.clear();
  }

  public getActiveStreamCount(): number {
    return this.activeStreams.size;
  }

  public putRecordingBlob(params: {
    recordingId: string;
    sessionId: string;
    mimeType: string;
    blob: Blob;
  }): TransientRecordingHandle {
    this.removeRecordingsForSession(params.sessionId);

    const existing = this.recordings.get(params.recordingId);
    if (existing && existing.objectUrl.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(existing.objectUrl);
    }

    const objectUrl =
      typeof URL.createObjectURL === 'function'
        ? URL.createObjectURL(params.blob)
        : `memory://recording/${params.recordingId}`;

    const handle: TransientRecordingHandle = {
      recordingId: params.recordingId,
      sessionId: params.sessionId,
      mimeType: params.mimeType,
      blob: params.blob,
      objectUrl,
      createdAt: new Date().toISOString(),
    };
    this.recordings.set(params.recordingId, handle);
    return handle;
  }

  public getRecordingHandle(recordingId: string): TransientRecordingHandle | undefined {
    return this.recordings.get(recordingId);
  }

  public getRecordingBySession(sessionId: string): TransientRecordingHandle | undefined {
    for (const handle of this.recordings.values()) {
      if (handle.sessionId === sessionId) {
        return handle;
      }
    }
    return undefined;
  }

  public removeRecordingsForSession(sessionId: string): void {
    for (const [key, handle] of this.recordings.entries()) {
      if (handle.sessionId === sessionId) {
        if (handle.objectUrl.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(handle.objectUrl);
        }
        this.recordings.delete(key);
      }
    }
  }

  public clearAll(): void {
    this.stopAllStreams();
    for (const handle of this.recordings.values()) {
      if (handle.objectUrl.startsWith('blob:') && typeof URL.revokeObjectURL === 'function') {
        URL.revokeObjectURL(handle.objectUrl);
      }
    }
    this.recordings.clear();
  }
}

export const transientMediaRegistry = new TransientMediaRegistry();
