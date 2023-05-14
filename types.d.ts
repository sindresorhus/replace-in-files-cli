declare module 'replace-in-files-cli' {
  export default function replaceInFiles(
    path: string | string[],
    options: {
      find: (string | RegExp)[]
      replacement: string
      ignoreCase?: boolean
      glob?: boolean
    },
  ): Promise<void>
}
