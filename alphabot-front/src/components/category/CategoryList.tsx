import React, { type ChangeEvent, useState } from 'react';
import styled from 'styled-components';

import type { Category } from './category.types';
import { useCategoryMutations } from '../../hooks/useCategoryMutations';
import { AxiosError } from 'axios';
import Button from '../Button/Button';

// --- Styled Components (이전과 동일) ---

const ListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const CategoryCard = styled.div`
  background-color: white;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 20px;
  position: relative;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
`;

const CardContent = styled.div`
  flex: 1;
`;

const CardTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: #007bff; //  이미지의 파란색 제목
  margin: 0 0 4px 0;
`;

const CardMeta = styled.p`
  font-size: 14px;
  color: #888;
  margin: 0;
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 12px 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  box-sizing: border-box; 
  margin-bottom: 24px;
`;

const NoResultsMessage = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: #333; /*  글자색 진하게 변경 */
  font-size: 16px;
  font-style: italic;
`;

const PaginationWrapper = styled.div`
  padding: 16px 0;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
`;

// --- Component ---

interface Props {
  categories: Category[];
  isAdmin: boolean;
  onEdit: (category: Category) => void;
  onSearch: (term: string) => void;
  onPageChange: (page: number) => void;
  page: number;
  total: number;
  pageSize: number;
}

export const CategoryList: React.FC<Props> = ({
  categories,
  isAdmin,
  onEdit,
  onSearch,
  onPageChange,
  page,
  total,
  pageSize,
}) => {
  const { deleteMutation } = useCategoryMutations();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    onSearch(e.target.value);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      try {
        await deleteMutation.mutateAsync(id);
      } catch (err) {
        const axiosError = err as AxiosError;
        if (axiosError.response?.status === 403) {
          alert('오류: 삭제 권한이 없습니다.');
        } else if (axiosError.response?.status === 404) {
          alert('오류: 이미 삭제된 항목입니다.');
        } else {
          alert('삭제에 실패했습니다.');
        }
      }
    }
  };

  return (
    <div>
      <SearchInput
        type="search"
        placeholder="카테고리 검색..."
        value={searchTerm}
        onChange={handleSearchChange}
      />

      <ListWrapper>
        {categories.length > 0 ? (
          categories.map((cat) => (
            // 👇 [수정 1] cat.category_id -> cat.id
            <CategoryCard key={cat.category_id}>
              <CardContent>
                <CardTitle>{cat.title}</CardTitle>
                <CardMeta>
                  생성일: {new Date(cat.created_at).toLocaleString()}
                </CardMeta>
              </CardContent>

              {isAdmin && (
                <CardActions>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => onEdit(cat)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="ghost"
                    size="small"
                    onClick={() => handleDelete(cat.category_id)}
                    disabled={
                      deleteMutation.isPending &&
                      deleteMutation.variables === cat.category_id
                    }
                  >
                    삭제
                  </Button>
                </CardActions>
              )}
            </CategoryCard>
          ))
        ) : (
          <NoResultsMessage>검색 결과가 없습니다.</NoResultsMessage>
        )}
      </ListWrapper>

      {/* 페이지네이션 UI */}
      {totalPages > 1 && (
        <PaginationWrapper>
          <Button
            variant="ghost"
            size="small"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            이전
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="small"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            다음
          </Button>
        </PaginationWrapper>
      )}
    </div>
  );
};