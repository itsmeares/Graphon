/// <reference types="vite/client" />
declare module '*.png?asset' {
  const content: string
  export default content
}

declare module '*.jpg?asset' {
  const content: string
  export default content
}
