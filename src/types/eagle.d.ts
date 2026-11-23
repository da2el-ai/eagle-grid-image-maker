// Eagle Plugin API のうち、このプラグインで使うものの型
// https://developer.eagle.cool/plugin-api/ja-jp

export interface EagleItem {
  id: string;
  name: string;
  ext: string;
  width: number;
  height: number;
  size: number;
  importedAt: number;
  modifiedAt: number;
  noThumbnail?: boolean;
  filePath: string;
  fileURL: string;
  thumbnailPath: string;
  thumbnailURL: string;
}

export interface EagleLibraryInfo {
  name: string;
  path: string;
}

export interface EagleApi {
  app: {
    version: string;
    locale: string;
    platform: string;
    arch: string;
    isWindows: boolean;
    isMac: boolean;
  };
  library: {
    info(): Promise<EagleLibraryInfo>;
  };
  item: {
    getSelected(): Promise<EagleItem[]>;
    select(ids: string[]): Promise<boolean>;
  };
  onPluginCreate(callback: (plugin: { path: string; manifest: unknown }) => void): void;
}

declare global {
  // Eagle の中で動いているときだけある
  // eslint-disable-next-line no-var
  var eagle: EagleApi | undefined;
}
