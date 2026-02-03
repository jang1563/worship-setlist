import axios from 'axios';

export interface ErrorInfo {
  title: string;
  message: string;
  suggestion?: string;
  retryable: boolean;
  retryDelay?: number; // seconds
}

// HTTP 상태 코드별 에러 메시지
const HTTP_ERROR_MESSAGES: Record<number, ErrorInfo> = {
  400: {
    title: '요청 오류',
    message: '입력하신 내용을 확인해주세요.',
    suggestion: '예배 정보(시간, 곡 수 등)를 다시 확인해보세요.',
    retryable: true,
  },
  401: {
    title: '인증 오류',
    message: 'API 인증에 실패했습니다.',
    suggestion: '관리자에게 문의하시거나, 페이지를 새로고침 해주세요.',
    retryable: false,
  },
  403: {
    title: '접근 권한 없음',
    message: '이 기능을 사용할 권한이 없습니다.',
    suggestion: '팀 관리자에게 권한을 요청해주세요.',
    retryable: false,
  },
  404: {
    title: '찾을 수 없음',
    message: '요청하신 내용을 찾을 수 없습니다.',
    suggestion: '주소가 올바른지 확인하거나, 목록에서 다시 선택해주세요.',
    retryable: false,
  },
  408: {
    title: '요청 시간 초과',
    message: '서버 응답이 너무 오래 걸렸습니다.',
    suggestion: '네트워크 연결을 확인하고 다시 시도해주세요.',
    retryable: true,
    retryDelay: 5,
  },
  429: {
    title: '요청 제한',
    message: 'AI 요청이 너무 많습니다.',
    suggestion: '약 1분 후에 다시 시도해주세요. 무료 서비스라 요청 횟수에 제한이 있습니다.',
    retryable: true,
    retryDelay: 60,
  },
  500: {
    title: '서버 오류',
    message: '서버에서 문제가 발생했습니다.',
    suggestion: '잠시 후 다시 시도해주세요. 문제가 계속되면 관리자에게 문의해주세요.',
    retryable: true,
    retryDelay: 10,
  },
  502: {
    title: '서버 연결 오류',
    message: '서버에 연결할 수 없습니다.',
    suggestion: '잠시 후 다시 시도해주세요.',
    retryable: true,
    retryDelay: 30,
  },
  503: {
    title: '서버 점검 중',
    message: '서버가 일시적으로 점검 중입니다.',
    suggestion: '잠시 후 다시 시도해주세요. 보통 몇 분 내에 복구됩니다.',
    retryable: true,
    retryDelay: 60,
  },
  504: {
    title: '서버 응답 지연',
    message: '서버 응답이 지연되고 있습니다.',
    suggestion: '네트워크 상태를 확인하고, 잠시 후 다시 시도해주세요.',
    retryable: true,
    retryDelay: 30,
  },
};

// 네트워크 관련 에러 메시지
const NETWORK_ERROR_MESSAGES: Record<string, ErrorInfo> = {
  offline: {
    title: '인터넷 연결 끊김',
    message: '인터넷에 연결되어 있지 않습니다.',
    suggestion: 'Wi-Fi나 데이터 연결을 확인해주세요.',
    retryable: true,
  },
  timeout: {
    title: '연결 시간 초과',
    message: '서버에 연결하는 데 시간이 너무 오래 걸렸습니다.',
    suggestion: '네트워크 상태를 확인하고 다시 시도해주세요.',
    retryable: true,
    retryDelay: 5,
  },
  network: {
    title: '네트워크 오류',
    message: '네트워크 연결에 문제가 있습니다.',
    suggestion: '인터넷 연결을 확인하고 다시 시도해주세요.',
    retryable: true,
  },
};

// 기능별 맥락 메시지
const CONTEXT_MESSAGES: Record<string, string> = {
  'ai-chat': '송리스트 생성',
  'ai-generate': '송리스트 생성',
  'songs-load': '곡 목록 불러오기',
  'songs-search': '곡 검색',
  'setlist-save': '송리스트 저장',
  'setlist-load': '송리스트 불러오기',
  'export': '내보내기',
  'share': '공유 링크 생성',
  'team': '팀 정보',
  'youtube': 'YouTube 연결',
  'chords': '코드 정보',
};

/**
 * 에러에서 사용자 친화적인 메시지 정보 추출
 */
export function getErrorInfo(error: unknown, context?: string): ErrorInfo {
  // 오프라인 체크
  if (!navigator.onLine) {
    return NETWORK_ERROR_MESSAGES.offline;
  }

  // Axios 에러 처리
  if (axios.isAxiosError(error)) {
    // 네트워크 에러 (요청이 전송되지 않음)
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return NETWORK_ERROR_MESSAGES.timeout;
      }
      return NETWORK_ERROR_MESSAGES.network;
    }

    // HTTP 상태 코드 기반 메시지
    const status = error.response.status;
    const httpError = HTTP_ERROR_MESSAGES[status];

    if (httpError) {
      // 맥락 추가
      if (context && CONTEXT_MESSAGES[context]) {
        return {
          ...httpError,
          message: `${CONTEXT_MESSAGES[context]} 중 ${httpError.message.toLowerCase()}`,
        };
      }
      return httpError;
    }

    // 서버에서 보낸 에러 메시지가 있는 경우
    const serverMessage = error.response.data?.detail || error.response.data?.message;
    if (serverMessage && typeof serverMessage === 'string') {
      return {
        title: '오류 발생',
        message: serverMessage,
        retryable: status >= 500,
      };
    }
  }

  // 일반 에러
  if (error instanceof Error) {
    // 특정 에러 메시지 패턴 처리
    if (error.message.includes('timeout')) {
      return NETWORK_ERROR_MESSAGES.timeout;
    }
    if (error.message.includes('network') || error.message.includes('Network')) {
      return NETWORK_ERROR_MESSAGES.network;
    }
  }

  // 기본 에러
  return {
    title: '오류 발생',
    message: '예상치 못한 오류가 발생했습니다.',
    suggestion: '페이지를 새로고침하거나 잠시 후 다시 시도해주세요.',
    retryable: true,
  };
}

/**
 * 간단한 에러 메시지만 필요한 경우
 */
export function getErrorMessage(error: unknown, context?: string): string {
  const info = getErrorInfo(error, context);

  if (info.suggestion) {
    return `${info.message} ${info.suggestion}`;
  }
  return info.message;
}

/**
 * 짧은 토스트 메시지용
 */
export function getShortErrorMessage(error: unknown): string {
  const info = getErrorInfo(error);
  return info.message;
}

/**
 * 재시도 가능 여부와 대기 시간 확인
 */
export function getRetryInfo(error: unknown): { canRetry: boolean; delay: number } {
  const info = getErrorInfo(error);
  return {
    canRetry: info.retryable,
    delay: info.retryDelay || 0,
  };
}
