export function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and description */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-semibold text-primary mb-3">AI Phrase</h3>
            <p className="text-gray-600 text-sm">
              AI 기반 개인 맞춤형 간격 반복 학습 웹 애플리케이션으로 
              효율적인 언어 학습을 지원합니다.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">주요 기능</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>간격 반복 학습</li>
              <li>AI TTS 지원</li>
              <li>학습 진도 관리</li>
              <li>폴더/파일 시스템</li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">지원</h4>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>사용 가이드</li>
              <li>문의하기</li>
              <li>개발자 정보</li>
              <li>개인정보처리방침</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-6 text-center text-sm text-gray-500">
          <p>&copy; 2024 AI Phrase. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}