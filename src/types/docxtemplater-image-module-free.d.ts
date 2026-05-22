declare module "docxtemplater-image-module-free" {
  interface ImageModuleOptions {
    centered?: boolean;
    fileType?: string;
    getImage: (tagValue: string, tagName: string) => ArrayBuffer | Buffer | null | undefined;
    getSize: (img: ArrayBuffer | Buffer, tagValue: string, tagName: string) => [number, number];
  }
  class ImageModule {
    constructor(options: ImageModuleOptions);
  }
  export = ImageModule;
}
