import styled from 'styled-components'
import type { ChatMessage } from '@/types/chat'
import { FaRegStar } from 'react-icons/fa'
import { createBookmark } from '@/api/bookmarkClient'

type Props = {
  message: ChatMessage
}

export default function MessageItem({ message }: Props) {
  const handleBookmark = async () => {
    try {
      await createBookmark(Number(message.id))
      alert('북마크에 추가되었습니다.')
    } catch (error) {
      console.error('Failed to bookmark message:', error)
      alert('북마크 추가에 실패했습니다.')
    }
  }

  return (
    <MessageWrapper role={message.role}>
      <MessageContent>
        {message.role === 'bot' && (
          <IconWrapper>
            <BotIcon aria-hidden>💼</BotIcon>
          </IconWrapper>
        )}
        <MessageText role={message.role}>
          {message.text}
          {message.role === 'bot' && (
            <BookmarkButton onClick={handleBookmark} title="북마크에 추가">
              <FaRegStar />
            </BookmarkButton>
          )}
          {message.referenced_news && message.referenced_news.length > 0 && (
            <NewsContainer>
              <NewsHeader>참고 뉴스</NewsHeader>
              <NewsList>
                {message.referenced_news.map((news, idx) => (
                  <NewsItem key={idx}>
                    <NewsTitle>{news.title}</NewsTitle>
                    <NewsDate>{new Date(news.published_at).toLocaleDateString()}</NewsDate>
                  </NewsItem>
                ))}
              </NewsList>
            </NewsContainer>
          )}
        </MessageText>
      </MessageContent>
    </MessageWrapper>
  )
}

const MessageWrapper = styled.div<{ role: 'bot' | 'user' }>`
  width: 100%;
  display: flex;
  justify-content: ${props => props.role === 'user' ? 'flex-end' : 'flex-start'};
  padding: 8px 0;
`;

const MessageContent = styled.div`
  display: flex;
  gap: 12px;
  max-width: 80%;
  align-items: flex-start;
`;

const IconWrapper = styled.div`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4169e1;
  border-radius: 8px;
  margin-top: 2px;
`;

const BotIcon = styled.span`
  font-size: 18px;
  line-height: 1;
  filter: grayscale(1) brightness(2);
`;

const MessageText = styled.div<{ role: 'bot' | 'user' }>`
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 15px;
  padding: 12px 16px;
  border-radius: 12px;
  word-break: break-word;
  
  ${props =>
    props.role === 'bot'
      ? `
    background: #f7f7f8;
    color: #202123;
    border-bottom-left-radius: 4px;
  `
      : `
    background: linear-gradient(135deg, #4169e1 0%, #5f7ef4 100%);
    color: #ffffff;
    border-bottom-right-radius: 4px;
    box-shadow: 0 4px 12px rgba(65, 105, 225, 0.25);
  `}
  
  position: relative;
  &:hover button {
    opacity: 1;
  }
`;

const BookmarkButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: transparent;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    color: #f59e0b;
  }
`;

const NewsContainer = styled.div`
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid #e5e5e5;
`;

const NewsHeader = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
`;

const NewsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const NewsItem = styled.div`
  display: block;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
`;

const NewsTitle = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: #202123;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NewsDate = styled.div`
  font-size: 11px;
  color: #8e8ea0;
`;
