import { apiFetch } from '@/api/client';
import type { SavedMessage } from '@/components/bookmark/bookmark.types';

const API_BASE_URL = '/api/bookmarks'; 

/**
 * 저장된 메시지 목록 조회 (카테고리 ID로 필터링)
 * categoryId 0 = "전체"
 */
export const listSavedMessages = async (categoryId: number): Promise<SavedMessage[]> => {
  let url = API_BASE_URL;
  
  if (categoryId !== 0) {
    url = `${API_BASE_URL}?category_id=${categoryId}`; // 백엔드 파라미터명 (category_id) 확인
  }
  
  // 백엔드 응답 구조: { bookmarks: [], total: ... }
  // BookmarkList 타입 전체를 받아서 bookmarks 배열만 반환
  const response = await apiFetch<{ bookmarks: SavedMessage[] }>(url);
  return response.bookmarks;
};

/**
 * 저장된 메시지(북마크) 삭제
 */
export const deleteSavedMessage = async (id: number): Promise<void> => {
  await apiFetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  });
};