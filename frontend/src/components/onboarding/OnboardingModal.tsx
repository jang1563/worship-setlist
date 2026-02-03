import { useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Church,
  MessageSquare,
  ListMusic,
  GripVertical,
  Sparkles,
} from 'lucide-react';
import { useOnboardingStore } from '@/stores/onboardingStore';

interface StepContent {
  icon: React.ReactNode;
  title: string;
  description: string;
  content: React.ReactNode;
}

const TOTAL_STEPS = 3;

export function OnboardingModal() {
  const { isModalOpen, currentStep, nextStep, prevStep, completeOnboarding, closeModal } =
    useOnboardingStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isModalOpen) return;
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (currentStep < TOTAL_STEPS - 1) {
          nextStep();
        } else {
          completeOnboarding();
        }
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    },
    [isModalOpen, currentStep, nextStep, prevStep, completeOnboarding, closeModal]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isModalOpen) return null;

  const steps: StepContent[] = [
    {
      icon: <Church className="w-12 h-12 text-primary-600 dark:text-primary-400" />,
      title: '예배 유형 선택',
      description: '어떤 예배를 위한 찬양을 준비하시나요?',
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '주일 예배', emoji: '🌅' },
              { label: '수요 예배', emoji: '🌙' },
              { label: '청년 예배', emoji: '🔥' },
              { label: '새벽 예배', emoji: '⭐' },
            ].map((type) => (
              <div
                key={type.label}
                className="p-4 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 cursor-pointer transition-all text-center"
              >
                <span className="text-2xl">{type.emoji}</span>
                <p className="mt-2 font-medium text-gray-700 dark:text-gray-200">{type.label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-4">
            AI가 예배 유형에 맞는 최적의 찬양을 추천해드립니다
          </p>
        </div>
      ),
    },
    {
      icon: <MessageSquare className="w-12 h-12 text-primary-600 dark:text-primary-400" />,
      title: '첫 송리스트 생성',
      description: 'AI와 대화하여 찬양 목록을 만들어보세요',
      content: (
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="bg-white dark:bg-gray-600 rounded-lg p-3 shadow-sm flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-200">
                  "이번 주일 예배 주제는 '감사'입니다. 은혜로운 분위기로 30분 정도
                  찬양을 준비해주세요."
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <div className="bg-primary-600 rounded-lg p-3 shadow-sm max-w-[80%]">
                <p className="text-sm text-white">
                  감사를 주제로 한 찬양 목록을 준비했습니다. 시작은 "주 하나님 지으신
                  모든 세계"로...
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <ListMusic className="w-4 h-4" />
            <span>예배 주제, 분위기, 시간을 알려주시면 최적의 목록을 추천합니다</span>
          </div>
        </div>
      ),
    },
    {
      icon: <ListMusic className="w-12 h-12 text-primary-600 dark:text-primary-400" />,
      title: '송리스트 편집',
      description: '드래그앤드롭으로 쉽게 순서를 변경하세요',
      content: (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 space-y-2">
            {[
              { num: 1, title: '주 하나님 지으신 모든 세계', key: 'G' },
              { num: 2, title: '감사해 감사해', key: 'A' },
              { num: 3, title: '주님의 은혜라', key: 'D' },
            ].map((song) => (
              <div
                key={song.num}
                className="flex items-center gap-3 bg-white dark:bg-gray-600 rounded-lg p-3 shadow-sm border border-gray-100 dark:border-gray-500"
              >
                <GripVertical className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="w-6 h-6 bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 rounded-full flex items-center justify-center text-sm font-medium">
                  {song.num}
                </span>
                <span className="flex-1 text-gray-700 dark:text-gray-200">{song.title}</span>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-500 rounded text-sm text-gray-600 dark:text-gray-200">
                  {song.key}
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 justify-center text-sm">
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full">
              키 자동 체크
            </span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
              전환 가이드
            </span>
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
              시간 계산
            </span>
          </div>
        </div>
      ),
    },
  ];

  const currentStepData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors z-10"
          aria-label="닫기"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className="h-full bg-primary-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>

        {/* Content */}
        <div className="p-6 pt-8">
          {/* Welcome header for first step */}
          {currentStep === 0 && (
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                송플래너에 오신 것을 환영합니다!
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                AI와 함께 예배 찬양을 계획해보세요
              </p>
            </div>
          )}

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-primary-600'
                    : index < currentStep
                    ? 'bg-primary-300 dark:bg-primary-500'
                    : 'bg-gray-200 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Icon and title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-50 dark:bg-primary-900/30 rounded-full mb-4">
              {currentStepData.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {currentStep + 1}. {currentStepData.title}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mt-1">{currentStepData.description}</p>
          </div>

          {/* Step content */}
          <div className="mb-8">{currentStepData.content}</div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center gap-1 px-4 py-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              이전
            </button>

            <span className="text-sm text-gray-400 dark:text-gray-500">
              {currentStep + 1} / {TOTAL_STEPS}
            </span>

            {currentStep < TOTAL_STEPS - 1 ? (
              <button
                onClick={nextStep}
                className="flex items-center gap-1 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={completeOnboarding}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
              >
                시작하기
              </button>
            )}
          </div>
        </div>

        {/* Skip link */}
        <div className="pb-4 text-center">
          <button
            onClick={completeOnboarding}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  );
}
