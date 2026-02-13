declare module "@assets/*.json" {
  const value: object;
  export default value;
}

declare module "*.svg" {
  const content: string;
  export default content;
}
