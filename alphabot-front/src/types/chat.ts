export type Role = 'bot' | 'user'

export interface ChatMessage {
  id: string
  role: Role
  text: string
  referenced_news?: Array<{
    title: string
    published_at: string
    content: string
    url?: string
  }>
}

