declare module 'apca-w3' {
  /** APCA (WCAG 3 草案) 感知对比度，返回 Lc 值（约 -108 ~ +106） */
  export function calcAPCA(
    text: string | [number, number, number, number],
    bg: string | [number, number, number, number],
    places?: number,
  ): number | string;
  export function reverseAPCA(lc: number, bg: string | [number, number, number, number]): unknown;
}
