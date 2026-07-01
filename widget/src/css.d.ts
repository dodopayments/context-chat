// esbuild inlines ".css" imports as a string (loader { ".css": "text" }).
declare module "*.css" {
  const content: string;
  export default content;
}
