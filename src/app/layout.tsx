import type { Metadata } from "next";
import { IBM_Plex_Sans_KR, Noto_Sans_KR, Do_Hyeon } from "next/font/google";
import "./globals.css";

// 스포카 한 산스 네오는 구글 폰트에 없는 자체 배포 폰트라 웹폰트 파일을 직접 포함해야 함.
// 파일 확보 전까지는 노토 산스 KR로 임시 대체 (스펙 11장 참고).
const ibmPlexSansKr = IBM_Plex_Sans_KR({
  variable: "--font-ibm-plex-sans-kr",
  subsets: ["latin"],
  weight: ["600", "700"],
});

const bodyFont = Noto_Sans_KR({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const doHyeon = Do_Hyeon({
  variable: "--font-do-hyeon",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "잡셜록",
  description: "직업의 단서를 모아 추리하는 진로 수업용 실시간 퀴즈",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${ibmPlexSansKr.variable} ${bodyFont.variable} ${doHyeon.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
