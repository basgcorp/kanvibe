/**
 * KanVibe URL을 반환한다.
 * 원격 프로젝트는 KANVIBE_PUBLIC_URL을 사용하고, 로컬은 localhost를 사용한다.
 */
export function getKanvibeUrl(isRemote: boolean): string {
  if (isRemote) {
    const publicUrl = process.env.KANVIBE_PUBLIC_URL;
    if (!publicUrl) {
      throw new Error("KANVIBE_PUBLIC_URL is not set. Required for remote hook installation.");
    }
    return publicUrl.replace(/\/+$/, "");
  }
  return `http://localhost:${process.env.PORT || 4885}`;
}
