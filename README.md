# 잡셜록

직업의 단서를 하나씩 공개하며 학생이 추리하는 중학교 진로 수업용 실시간 퀴즈.
전체 스펙은 [`jikeop-quiz-spec.md`](./jikeop-quiz-spec.md) 참고.

## 스택

- Next.js (App Router, TypeScript, Tailwind CSS v4)
- Firebase Firestore (데이터 저장)
- Vercel (호스팅·배포)

## 시작하기

1. 의존성 설치: `npm install`
2. `.env.local.example`을 `.env.local`로 복사하고 Firebase 프로젝트 설정 값을 채우기
3. 개발 서버 실행: `npm run dev`
4. [http://localhost:3000](http://localhost:3000) 접속

## 폴더 구조

- `src/app/` — 역할 선택(`/`), 교사 화면(`/teacher`), 학생 화면(`/student`)
- `src/lib/firebase.ts` — Firebase 클라이언트 초기화(Firestore)
- `jikeop-quiz-spec.md` — 데이터 모델·화면 구성·게임 흐름 등 전체 스펙

## 폰트 참고

본문 폰트로 스펙에 명시된 스포카 한 산스 네오는 구글 폰트에 없는 자체 배포 폰트라, 웹폰트 파일을 프로젝트에 직접 포함해야 정확히 적용됩니다. 파일을 확보하기 전까지는 노토 산스 KR로 임시 대체되어 있습니다(`src/app/layout.tsx`).
