# 4. Sequence Diagram

## 1. 계정 관리 (Account Management)

### 1.1 회원가입 (Sign Up)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (UserRouter)
    participant Database

    User->>Frontend: 회원가입 정보 입력 (ID, PW, 이름)
    Frontend->>Frontend: 유효성 검사 (길이 등)
    Frontend->>Server (UserRouter): POST /api/users/signup (UserCreate)
    
    Server (UserRouter)->>Database: get_user_by_login_id(login_id)
    Database-->>Server (UserRouter): User?
    
    alt 이미 존재하는 ID
        Server (UserRouter)-->>Frontend: 400 Bad Request
        Frontend-->>User: "이미 사용 중인 아이디입니다."
    else 사용 가능한 ID
        Server (UserRouter)->>Database: create_user(UserCreate)
        Database-->>Server (UserRouter): User (Created)
        Server (UserRouter)-->>Frontend: 201 Created (User)
        Frontend-->>User: 가입 성공, 로그인 페이지로 이동
    end
```

### 1.2 로그인 (Log In)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (AuthRouter)
    participant Database

    User->>Frontend: ID, PW 입력 후 로그인 시도
    Frontend->>Server (AuthRouter): POST /api/login (OAuth2PasswordRequestForm)
    
    Server (AuthRouter)->>Database: get_user_by_login_id(login_id)
    Database-->>Server (AuthRouter): User
    
    Server (AuthRouter)->>Server (AuthRouter): verify_password(pw, hashed_pw)
    
    alt 인증 실패
        Server (AuthRouter)-->>Frontend: 401 Unauthorized
        Frontend-->>User: "아이디 또는 비밀번호가 잘못되었습니다."
    else 인증 성공
        Server (AuthRouter)->>Server (AuthRouter): create_access_token(sub=login_id)
        Server (AuthRouter)-->>Frontend: 200 OK (access_token)
        Frontend->>Frontend: 토큰 저장 (LocalStorage)
        Frontend-->>User: 메인 화면으로 이동
    end
```

### 1.3 내 정보 조회 (Get My Info)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (UserRouter)
    participant Database

    User->>Frontend: 마이페이지 진입 / 앱 초기화
    Frontend->>Server (UserRouter): GET /api/users/me (Header: Bearer Token)
    Server (UserRouter)->>Database: get_user (from Token)
    Database-->>Server (UserRouter): User
    Server (UserRouter)-->>Frontend: 200 OK (User Schema)
    Frontend->>Frontend: 사용자 정보(이름, ID) 표시
```

---

## 2. 채팅 (Chat Environment)

### 2.1 종목 채팅방 진입 (Enter Stock Chat / Search)
*사용자가 종목을 검색하고 해당 종목의 채팅방으로 들어가는 흐름입니다.*
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (ChatRouter)
    participant Service (ChatService)
    participant Database

    User->>Frontend: 종목 검색 및 선택 (예: AAPL)
    Frontend->>Server (ChatRouter): PUT /api/v1/chats/by-stock/{stock_code}?title={title}
    
    Server (ChatRouter)->>Service (ChatService): upsert_chat_by_stock(user, stock_code)
    Service (ChatService)->>Database: Check existing chat for User+Stock
    
    alt 이미 존재하는 방 (활성 상태)
        Database-->>Service (ChatService): Chat
    else 방이 없거나 휴지통에 있음
        Service (ChatService)->>Database: Create or Restore Chat
        Database-->>Service (ChatService): Chat (New/Restored)
    end
    
    Service (ChatService)-->>Server (ChatRouter): Chat, existed(bool)
    Server (ChatRouter)-->>Frontend: 200 OK (ChatByStockResponse: chat_id)
    Frontend->>User: 채팅방 화면으로 전환 (chat_id)
```

### 2.2 메시지 전송 및 AI 응답 (Send Message & AI Reply)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (ChatRouter)
    participant Service (ChatService)
    participant RAG (RagService)
    participant Database
    participant OpenAI

    User->>Frontend: 메시지 입력 후 전송
    Frontend->>Server (ChatRouter): POST /api/rooms/{room_id}/chat-completions (content)
    
    Server (ChatRouter)->>Service (ChatService): create_message_and_reply()
    
    rect rgb(200, 240, 200)
        note right of Service (ChatService): User Message 저장
        Service (ChatService)->>Database: save_message(role='user', content)
    end

    Service (ChatService)->>RAG (RagService): Generate Answer Context
    RAG (RagService)->>OpenAI: Request Completion (Context + User Msg)
    OpenAI-->>RAG (RagService): Response Text
    
    rect rgb(200, 240, 200)
        note right of Service (ChatService): Assistant Message 저장
        Service (ChatService)->>Database: save_message(role='assistant', content)
    end

    Service (ChatService)-->>Server (ChatRouter): (UserMsg, AssistantMsg)
    Server (ChatRouter)-->>Frontend: 200 OK (ChatCompletionResponse)
    
    Frontend->>User: 내 메시지와 AI 답변 표시
```

### 2.3 채팅 내역 조회 (Get Messages)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (ChatRouter)
    participant Database

    User->>Frontend: 채팅방 스크롤 상단 도달 (More Load)
    Frontend->>Server (ChatRouter): GET /api/rooms/{room_id}/messages?last_message_id={id}
    Server (ChatRouter)->>Database: fetch_chat_messages(room_id, limit, cursor)
    Database-->>Server (ChatRouter): List[Message]
    Server (ChatRouter)-->>Frontend: 200 OK (MessageList)
    Frontend->>User: 이전 대화 내역 추가 표시
```

### 2.4 채팅방 목록 조회 (List Chats)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (ChatRouter)
    participant Database

    User->>Frontend: 사이드바 채팅 목록 열기
    Frontend->>Server (ChatRouter): GET /api/rooms
    Server (ChatRouter)->>Database: list_user_chat_rooms() (Trash='out'인 방만)
    Database-->>Server (ChatRouter): List[Chat]
    Server (ChatRouter)-->>Frontend: 200 OK (ChatList)
    Frontend->>User: 채팅방 리스트 표시
```

---

## 3. 사이드바 및 데이터 관리 (Sidebar & Data)

### 3.1 카테고리 관리 (Category CRUD)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (CategoryRouter)
    participant Database

    Note over User, Database: 1. 카테고리 생성
    User->>Frontend: '새 카테고리' 클릭 및 이름 입력
    Frontend->>Server (CategoryRouter): POST /api/categories (title)
    Server (CategoryRouter)->>Database: create_category(user_id, title)
    Database-->>Server (CategoryRouter): Category Created
    Server (CategoryRouter)-->>Frontend: 201 Created

    Note over User, Database: 2. 카테고리 조회
    Frontend->>Server (CategoryRouter): GET /api/categories
    Server (CategoryRouter)->>Database: get_categories_by_user()
    Database-->>Server (CategoryRouter): List[Category]
    Server (CategoryRouter)-->>Frontend: 200 OK

    Note over User, Database: 3. 카테고리 수정/삭제
    User->>Frontend: 카테고리 이름 수정
    Frontend->>Server (CategoryRouter): PUT /api/categories/{id} (new_title)
    Server (CategoryRouter)-->>Frontend: 200 OK
    User->>Frontend: 카테고리 삭제
    Frontend->>Server (CategoryRouter): DELETE /api/categories/{id}
    Server (CategoryRouter)-->>Frontend: 204 No Content
```

### 3.2 북마크 관리 (Bookmark CRUD)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (BookmarkRouter)
    participant Database

    Note over User, Database: 1. 메시지 북마크 하기
    User->>Frontend: 메시지 옆 '북마크' 아이콘 클릭
    Frontend->>Frontend: 카테고리 선택 팝업 (Optional)
    Frontend->>Server (BookmarkRouter): POST /api/bookmarks (msg_id, category_id)
    Server (BookmarkRouter)->>Database: create_bookmark()
    Database-->>Server (BookmarkRouter): Bookmark Created
    Server (BookmarkRouter)-->>Frontend: 201 Created
    
    Note over User, Database: 2. 북마크 조회 (저장된 메시지함)
    Frontend->>Server (BookmarkRouter): GET /api/bookmarks?category_id={id}
    Server (BookmarkRouter)->>Database: get_bookmarks_by_category()
    Database-->>Server (BookmarkRouter): List[Bookmark] + Message Detail
    Server (BookmarkRouter)-->>Frontend: 200 OK
```

### 3.3 휴지통 관리 (Trash Management)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (ChatRouter)
    participant Database

    Note over User, Database: 1. 채팅방 삭제 (휴지통 이동)
    User->>Frontend: 채팅방 '나가기' / '삭제' 클릭
    Frontend->>Server (ChatRouter): PATCH /api/rooms/{id} (trash_can='in')
    Server (ChatRouter)->>Database: update_chat(trash_can='in')
    Server (ChatRouter)-->>Frontend: 200 OK
    
    Note over User, Database: 2. 영구 삭제
    User->>Frontend: 휴지통에서 '삭제' 클릭
    Frontend->>Server (ChatRouter): DELETE /api/rooms/{id}
    Server (ChatRouter)->>Database: delete_chat_permanently()
    Server (ChatRouter)-->>Frontend: 204 No Content
```

---

## 4. 커뮤니티 (Community)

### 4.1 종목 토론 댓글 작성 (Write Comment)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (CommentRouter)
    participant Database

    User->>Frontend: 종목 토론 탭에서 내용 입력
    Frontend->>Server (CommentRouter): POST /api/comments/ (stock_code, content)
    Server (CommentRouter)->>Database: create_comment()
    Database-->>Server (CommentRouter): Comment
    Server (CommentRouter)-->>Frontend: 201 Created
    Frontend->>User: 댓글 리스트에 내가 쓴 글 추가
```

### 4.2 댓글 조회 (Read Comments)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (CommentRouter)
    participant Database

    User->>Frontend: 종목 상세 페이지 / 커뮤니티 탭 진입
    Frontend->>Server (CommentRouter): GET /api/comments?stock_code={code}
    Server (CommentRouter)->>Database: get_comments(stock_code)
    Database-->>Server (CommentRouter): List[Comment]
    Server (CommentRouter)-->>Frontend: 200 OK
    Frontend->>User: 댓글 목록 표시
```

---

## 5. 시스템 및 보안 (System & Security)

### 5.1 프로필 수정 (Edit Profile)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (UserRouter)
    participant Database

    User->>Frontend: 닉네임 변경 시도
    Frontend->>Server (UserRouter): PATCH /api/users/me (username)
    Server (UserRouter)->>Database: update_user()
    Server (UserRouter)-->>Frontend: 200 OK
```

### 5.2 비밀번호 변경 (Change Password)
```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant Server (UserRouter)
    participant Database

    User->>Frontend: 현재 비밀번호, 새 비밀번호 입력
    Frontend->>Server (UserRouter): PUT /api/users/me/password (current, new)
    
    Server (UserRouter)->>Database: get_user()
    Server (UserRouter)->>Server (UserRouter): verify(current, db_hash)
    
    alt 비밀번호 불일치
        Server (UserRouter)-->>Frontend: 400 Bad Request
    else 일치
        Server (UserRouter)->>Database: update_password(new_hash)
        Server (UserRouter)-->>Frontend: 200 OK
        Frontend->>User: "변경되었습니다."
    end
```
