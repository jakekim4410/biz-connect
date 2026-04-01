/**
 * 회사명 정규화: 소문자 변환, 공백 제거, 법인 표기 제거
 */
export const normalizeCompanyName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/㈜|\(주\)|\(株\)|inc\.?|ltd\.?|co\.?|corp\.?/gi, "")
    .trim();

/**
 * 양방향 includes 매칭
 * AI가 반환한 이름과 DB 이름 중 어느 한쪽이 다른 쪽을 포함하면 매칭
 */
export const isCompanyMatch = (dbName: string, aiName: string): boolean => {
  if (!dbName || !aiName) return false;
  const db = normalizeCompanyName(dbName);
  const ai = normalizeCompanyName(aiName);
  if (!db || !ai) return false;
  return db.includes(ai) || ai.includes(db);
};