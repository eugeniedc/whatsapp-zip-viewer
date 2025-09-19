import JSZip from 'jszip';

interface MediaEntry {
  zipEntry: JSZip.JSZipObject;
  fullPath: string;
}

interface LoadedMedia {
  blobUrl: string;
  filename: string;
  type: 'image' | 'sticker' | 'document' | 'audio' | 'video';
}

/**
 * MediaLoader manages lazy loading of media files from ZIP entries
 * with concurrency control and Blob URL management
 */
export class MediaLoader {
  private mediaIndex: Map<string, MediaEntry[]> = new Map();
  private loadedBlobs: Map<string, LoadedMedia> = new Map();
  private loadingPromises: Map<string, Promise<LoadedMedia | null>> = new Map();
  private concurrencyLimit = 5; // Max concurrent ZIP reads
  private activeTasks = 0;
  private taskQueue: Array<() => void> = [];

  /**
   * Build media index from ZIP entries during initial scan
   * This replaces the eager extraction process
   */
  buildMediaIndex(fileEntries: Array<[string, JSZip.JSZipObject]>): void {
    this.mediaIndex.clear();
    
    for (const [filename, zipEntry] of fileEntries) {
      if (!zipEntry.dir && !filename.endsWith('.txt') && !filename.endsWith('.py')) {
        const extension = filename.split('.').pop()?.toLowerCase();
        const isMediaFile = [
          'jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tgs',
          'mp4', 'mov', 'avi', 'webm', '3gp',
          'mp3', 'wav', 'ogg', 'm4a', 'aac',
          'pdf', 'doc', 'docx'
        ].includes(extension || '');
        
        if (isMediaFile) {
          const justFilename = filename.split('/').pop() || filename;
          
          // Store by just filename for lookup
          if (!this.mediaIndex.has(justFilename)) {
            this.mediaIndex.set(justFilename, []);
          }
          this.mediaIndex.get(justFilename)!.push({
            zipEntry,
            fullPath: filename
          });
          
          // Also store by filename without extension for fuzzy matching
          const nameWithoutExt = justFilename.split('.')[0];
          if (nameWithoutExt !== justFilename) {
            if (!this.mediaIndex.has(nameWithoutExt)) {
              this.mediaIndex.set(nameWithoutExt, []);
            }
            this.mediaIndex.get(nameWithoutExt)!.push({
              zipEntry,
              fullPath: filename
            });
          }
        }
      }
    }
    
    console.log(`MediaLoader: Built index with ${this.mediaIndex.size} media entries`);
  }

  /**
   * Get media type from filename
   */
  private getMediaType(filename: string): 'image' | 'sticker' | 'document' | 'audio' | 'video' {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension || '')) {
      return 'image';
    }
    if (['webp', 'tgs'].includes(extension || '') && filename.includes('sticker')) {
      return 'sticker';
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(extension || '')) {
      return 'audio';
    }
    if (['mp4', 'mov', 'avi', 'webm', '3gp'].includes(extension || '')) {
      return 'video';
    }
    return 'document';
  }

  /**
   * Load media with concurrency control
   */
  async loadMedia(filename: string): Promise<LoadedMedia | null> {
    // Return cached result if already loaded
    if (this.loadedBlobs.has(filename)) {
      return this.loadedBlobs.get(filename)!;
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(filename)) {
      return this.loadingPromises.get(filename)!;
    }

    // Create loading promise with concurrency control
    const loadingPromise = new Promise<LoadedMedia | null>((resolve) => {
      const task = async () => {
        try {
          this.activeTasks++;
          const result = await this.doLoadMedia(filename);
          resolve(result);
        } catch (error) {
          console.warn(`Failed to load media ${filename}:`, error);
          resolve(null);
        } finally {
          this.activeTasks--;
          this.loadingPromises.delete(filename);
          this.processNextTask();
        }
      };

      if (this.activeTasks < this.concurrencyLimit) {
        task();
      } else {
        this.taskQueue.push(task);
      }
    });

    this.loadingPromises.set(filename, loadingPromise);
    return loadingPromise;
  }

  /**
   * Process next task in queue
   */
  private processNextTask(): void {
    if (this.taskQueue.length > 0 && this.activeTasks < this.concurrencyLimit) {
      const nextTask = this.taskQueue.shift()!;
      nextTask();
    }
  }

  /**
   * Actually load the media from ZIP
   */
  private async doLoadMedia(filename: string): Promise<LoadedMedia | null> {
    const mediaEntries = this.mediaIndex.get(filename);
    if (!mediaEntries || mediaEntries.length === 0) {
      // Try fuzzy matching
      for (const [key, entries] of this.mediaIndex.entries()) {
        if (key.includes(filename.split('.')[0]) || filename.includes(key.split('.')[0])) {
          const entry = entries[0]; // Use first match
          return await this.extractBlobFromEntry(entry, filename);
        }
      }
      return null;
    }

    // Use first entry for duplicate filenames
    const mediaEntry = mediaEntries[0];
    return await this.extractBlobFromEntry(mediaEntry, filename);
  }

  /**
   * Extract blob from ZIP entry and create Blob URL
   */
  private async extractBlobFromEntry(mediaEntry: MediaEntry, filename: string): Promise<LoadedMedia> {
    const arrayBuffer = await mediaEntry.zipEntry.async("arraybuffer");
    const blob = new Blob([arrayBuffer]);
    const blobUrl = URL.createObjectURL(blob);
    
    const loadedMedia: LoadedMedia = {
      blobUrl,
      filename,
      type: this.getMediaType(filename)
    };
    
    this.loadedBlobs.set(filename, loadedMedia);
    return loadedMedia;
  }

  /**
   * Revoke Blob URL to free memory
   */
  revokeMedia(filename: string): void {
    const media = this.loadedBlobs.get(filename);
    if (media) {
      URL.revokeObjectURL(media.blobUrl);
      this.loadedBlobs.delete(filename);
    }
  }

  /**
   * Check if media exists in index
   */
  hasMedia(filename: string): boolean {
    return this.mediaIndex.has(filename);
  }

  /**
   * Get all available media filenames
   */
  getAvailableMedia(): string[] {
    return Array.from(this.mediaIndex.keys());
  }

  /**
   * Cleanup all loaded Blob URLs
   */
  cleanup(): void {
    for (const media of this.loadedBlobs.values()) {
      URL.revokeObjectURL(media.blobUrl);
    }
    this.loadedBlobs.clear();
    this.loadingPromises.clear();
  }
}

// Global instance
export const mediaLoader = new MediaLoader();