# 잡셜록

직업의 단서를 하나씩 공개하며 학생이 추리하는 중학교 진로 수업용 실시간 퀴즈.
전체 스펙은 [`jikeop-quiz-spec.md`](./jikeop-quiz-spec.md) 참고.

## 스택

- Next.js (App Router, TypeScript, Tailwind CSS v4)
- Firebase Firestore (데이터 저장) — 프로젝트 `careerclue-quiz`
- Vercel (호스팅·배포)

## 시작하기

1. 의존성 설치: `npm install`
2. `.env.local.example`을 `.env.local`로 복사하고 Firebase 프로젝트 설정 값을 채우기
   (이미 `careerclue-quiz` 프로젝트로 세팅된 `.env.local`이 로컬에 있다면 그대로 사용)
3. 개발 서버 실행: `npm run dev`
4. [http://localhost:3000](http://localhost:3000) 접속

## Firebase

- 콘솔: https://console.firebase.google.com/project/careerclue-quiz/overview
- 규칙 배포: `firebase deploy --only firestore:rules`
- **주의**: 스펙상 로그인/인증이 없는 앱이라 `firestore.rules`가 `question_sets`·`games`·`roster` 컬렉션을 인증 없이 읽고 쓸 수 있게 열려 있습니다. 학급 내부용(민감 정보 없음)을 전제로 한 트레이드오프이니, 다른 용도로 확장할 경우 규칙을 다시 검토하세요.

## 폴더 구조

- `src/app/` — 역할 선택(`/`), 교사 화면(`/teacher`, 탭 4개), 학생 화면(`/student`)
- `src/lib/` — Firestore 서비스 함수(`questionSets`, `game`, `submissions`, `roster`), 타입(`types.ts`), 정답 판정(`answerJudge.ts`), 텍스트 유틸(초성·글자 수 미리보기: `text.ts`)
- `firestore.rules`, `firebase.json`, `.firebaserc` — Firestore 규칙/프로젝트 설정
- `jikeop-quiz-spec.md` — 데이터 모델·화면 구성·게임 흐름 등 전체 스펙

## 구현 현황

- [x] 역할 선택, 학생 학번+이름 등록/재접속 대조
- [x] 교사: 문제 선택(목록·적용·복제·삭제·JSON 가져오기/내보내기)
- [x] 교사: 게임 진행(단서·초성 공개, 정답 공개, 채점, 검토 필요 수동 전환)
- [x] 교사: 세트 편집(문제/힌트 드래그 순서 변경, 내용 수정)
- [x] 교사: 종료 화면(순위표, 오답노트 자동 분류)
- [x] 학생: 사건 파일·제출·정답 공개 후 결과 확인
- [ ] 오답노트 카드의 "직업 설명 한두 줄" — 현재 데이터 모델(`Job`)에 설명 필드가 없어 미구현. 필요하면 스펙에 필드 추가 후 반영 필요

## 폰트 참고

본문 폰트로 스펙에 명시된 스포카 한 산스 네오는 구글 폰트에 없는 자체 배포 폰트라, 웹폰트 파일을 프로젝트에 직접 포함해야 정확히 적용됩니다. 파일을 확보하기 전까지는 노토 산스 KR로 임시 대체되어 있습니다(`src/app/layout.tsx`).
