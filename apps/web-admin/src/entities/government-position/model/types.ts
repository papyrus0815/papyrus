/**
 * 직위 보유(재위·재임) 공통 분류 타입. 재위는 재임 테이블의 군주직 행이다(직위 보유 단일 모델) —
 * 응답 행은 어디서나 같은 모양에 `isMonarchical`만 다르다.
 */

/** 직책 분류 — 색상·범례·대통령/총리 구분 필터의 단일 기준 */
export type PositionCategory = 'MONARCH' | 'PRESIDENT' | 'PM' | 'POPE' | 'OTHER'
