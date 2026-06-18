// File System Access API — TS 표준 lib.dom 에 아직 없어 필요한 부분만 선언.
interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

interface FileSystemFileHandle {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<File>;
  queryPermission?(d?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(d?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle {
  readonly kind: 'directory';
  readonly name: string;
  values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
  queryPermission?(d?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
  requestPermission?(d?: FileSystemHandlePermissionDescriptor): Promise<PermissionState>;
}

interface OpenFilePickerOptions {
  types?: { description?: string; accept: Record<string, string[]> }[];
  excludeAcceptAllOption?: boolean;
  multiple?: boolean;
}

interface Window {
  showOpenFilePicker?(options?: OpenFilePickerOptions): Promise<FileSystemFileHandle[]>;
  showDirectoryPicker?(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
}

// View Transitions API (테마 전환 크로스페이드)
interface ViewTransition {
  finished: Promise<void>;
  ready: Promise<void>;
  updateCallbackDone: Promise<void>;
  skipTransition(): void;
}
interface Document {
  startViewTransition?(callback?: () => void | Promise<void>): ViewTransition;
}
