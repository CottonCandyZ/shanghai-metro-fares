export interface RawStation {
  name: string
  label?: string
  lines: number[]
  search: string[]
  code: number
}

export declare const stations: RawStation[]
export declare const links: Array<[number, number, number]>
