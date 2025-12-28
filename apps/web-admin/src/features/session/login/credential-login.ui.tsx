import React, { useCallback, useState } from 'react'

import { createPortal } from 'react-dom'

import { AnimatePresence, motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import { MdLock, MdPerson } from 'react-icons/md'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { sessionApi } from '@/entities/session/session.api'
import { useSessionStore } from '@/entities/session/session.store'
import { nestiaApiService } from '@/shared/api/api.service'
import errorIcon from '@/shared/assets/images/status/error.png'
import { useClickSound } from '@/shared/hooks/use-click-sound.hook'
import { pathKeys } from '@/shared/router'
import { zodResolver } from '@hookform/resolvers/zod'

import * as S from './credential-login.styles'

// 🎯 Zod 스키마 정의
const loginSchema = z.object({
  account: z
    .string()
    .min(1, '아이디를 입력해주세요')
    .min(3, '아이디는 최소 3자 이상이어야 합니다')
    .max(50, '아이디는 50자를 초과할 수 없습니다'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요')
    .min(4, '비밀번호는 최소 4자 이상이어야 합니다')
    .max(100, '비밀번호는 100자를 초과할 수 없습니다'),
  rememberMe: z.boolean().default(true),
})

type LoginFormData = z.infer<typeof loginSchema>

export interface CredentialLoginFormProps {
  // 에러 발생 시 모달을 열기 위한 콜백 함수 추가
  onError?: (error: string) => void
}

// 🚨 HTTP 에러를 역사적 인물이 말하듯이 변환
const getErrorMessage = (error: unknown): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const err = error as any

  // HTTP 상태 코드별 메시지 (보안: 상세 정보 노출 X)
  if (err?.statusCode) {
    switch (err.statusCode) {
      case 401:
        // 인증 실패 - 구체적인 이유는 숨김 (보안)
        return '그대의 신원을 확인할 수 없도다. 아이디와 비밀번호를 다시 확인하시게.'
      case 403:
        return '여기는 허가받은 자만이 들어올 수 있는 곳이니라.'
      case 404:
        return '입구를 찾을 수 없도다. 잠시 후 다시 시도해보시게.'
      case 429:
        return '너무 많은 시도를 하였도다. 잠시 기다렸다가 다시 시도하시게.'
      case 500:
      case 502:
      case 503:
      case 504:
        return '서버에 문제가 생겼도다. 잠시 후 다시 찾아오시게.'
      default:
        return '입장에 실패하였도다. 잠시 후 다시 시도해보시게.'
    }
  }

  // 네트워크 에러
  if (err?.message) {
    if (
      err.message.includes('Failed to fetch') ||
      err.message.includes('Network') ||
      err.message.includes('Failed to construct')
    ) {
      return '서버와의 연결에 문제가 생겼도다. 네트워크를 확인하고 다시 시도하시게.'
    }
  }

  // 기본 에러 메시지 (상세 정보 노출 X)
  return '알 수 없는 일이 일어났도다. 잠시 후 다시 시도해보시게.'
}

const CredentialLoginFormComponent = function ({
  onError, // 에러 발생 시 모달을 열기 위한 콜백 함수 추가
}: CredentialLoginFormProps) {
  const navigate = useNavigate()
  const setSession = useSessionStore((state) => state.setSession)

  // 🎯 React Hook Form 설정
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    watch,
    setError,
    clearErrors,
  } = useForm<LoginFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(loginSchema) as any,
    defaultValues: {
      account: '',
      password: '',
      rememberMe: true,
    },
    mode: 'onChange', // 실시간 유효성 검사
  })

  // 🚀 비밀번호 표시/숨김 상태
  const [showPassword, setShowPassword] = useState(false)

  // 🚀 폼 필드 값 감시
  const watchedAccount = watch('account')
  const watchedPassword = watch('password')

  // 🚀 성능 최적화: 스타일 props 계산
  const accountInputProps = {
    $isFocused: watchedAccount?.length > 0,
    $hasValue: watchedAccount?.length > 0,
  }

  const passwordInputProps = {
    $isFocused: watchedPassword?.length > 0,
    $hasValue: watchedPassword?.length > 0,
  }

  // 🎯 React Hook Form 제출 핸들러
  const onSubmit = async (data: LoginFormData) => {
    clearErrors()

    try {
      const response = await sessionApi.login({
        account: data.account,
        password: data.password,
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const responseData = response as any
      const token = responseData?.accessToken || responseData?.data?.accessToken

      if (token) {
        // API 서비스에 토큰 설정
        nestiaApiService.updateToken(token)

        // 세션 스토어에 상태 저장
        setSession({ token, username: data.account })

        // 세션 상태가 안정화될 때까지 잠시 대기
        await new Promise((resolve) => setTimeout(resolve, 200))

        // 대시보드로 이동
        setTimeout(() => {
          navigate(pathKeys.home(), { replace: true })
        }, 300)
      } else {
        setError('root', {
          type: 'manual',
          message: '로그인 응답에 토큰이 없습니다',
        })
      }
    } catch (caughtError: unknown) {
      const userFriendlyMessage = getErrorMessage(caughtError)

      // 🚨 에러 모달만 표시 (폼 내부 에러는 표시하지 않음)
      if (onError) {
        onError(userFriendlyMessage)
      }
    }
  }

  // 🚀 이벤트 핸들러들
  const togglePasswordVisibility = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  // 클릭 효과음 재생 함수
  const playClickSound = useClickSound()

  // 🚀 에러 메시지 렌더링
  const renderErrorAlert = () => {
    const rootError = errors.root?.message
    if (!rootError) return null

    return (
      <S.ErrorAlert
        as={motion.div}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        role="alert"
      >
        <S.ErrorIcon>
          <img
            src={errorIcon}
            alt="에러"
            style={{ width: '48px', height: '48px', objectFit: 'contain' }}
          />
        </S.ErrorIcon>
        <S.ErrorMessage>{rootError}</S.ErrorMessage>
      </S.ErrorAlert>
    )
  }

  return (
    <>
      {/* 로그인 중 전체 화면 로딩 오버레이 (Portal로 body에 직접 렌더링) */}
      {isSubmitting &&
        createPortal(
          <AnimatePresence>
            <S.FullScreenLoadingOverlay
              as={motion.div}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <S.BigLoadingSpinner />
              <S.LoadingText>로딩 중...</S.LoadingText>
            </S.FullScreenLoadingOverlay>
          </AnimatePresence>,
          document.body,
        )}

      <S.LoginFormWrapper>
        <S.LoginForm
          onSubmit={handleSubmit(onSubmit)}
          $hasError={Boolean(errors.root)}
          $isLoading={isSubmitting}
        >
          <S.InputGroup>
            <S.InputField>
              <S.InputLabel
                htmlFor="login-account"
                $isFocused={accountInputProps.$isFocused}
              >
                👤 아이디
              </S.InputLabel>
              <S.InputWrapper $hasValue={accountInputProps.$hasValue}>
                <S.InputIcon>
                  <MdPerson />
                </S.InputIcon>
                <S.Input
                  id="login-account"
                  {...register('account')}
                  placeholder="계정을 입력하세요"
                  autoComplete="username"
                />
              </S.InputWrapper>
              {errors.account && (
                <S.ErrorMessage
                  style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#f56565',
                  }}
                >
                  {errors.account.message}
                </S.ErrorMessage>
              )}
            </S.InputField>

            <S.InputField>
              <S.InputLabel
                htmlFor="login-password"
                $isFocused={passwordInputProps.$isFocused}
              >
                🔒 비밀번호
              </S.InputLabel>
              <S.InputWrapper $hasValue={passwordInputProps.$hasValue}>
                <S.InputIcon>
                  <MdLock />
                </S.InputIcon>
                <S.Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  placeholder="비밀번호를 입력하세요"
                  autoComplete="current-password"
                />
                <S.PasswordToggle
                  type="button"
                  onClick={togglePasswordVisibility}
                  aria-label={
                    showPassword ? '비밀번호 숨기기' : '비밀번호 보기'
                  }
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </S.PasswordToggle>
              </S.InputWrapper>
              {errors.password && (
                <S.ErrorMessage
                  style={{
                    marginTop: '4px',
                    fontSize: '12px',
                    color: '#f56565',
                  }}
                >
                  {errors.password.message}
                </S.ErrorMessage>
              )}
            </S.InputField>
          </S.InputGroup>

          <S.FormOptions>
            <S.CheckboxWrapper>
              <S.Checkbox
                type="checkbox"
                id="remember-me"
                {...register('rememberMe')}
              />
              <S.CheckboxLabel htmlFor="remember-me">
                로그인 상태 유지
              </S.CheckboxLabel>
            </S.CheckboxWrapper>
          </S.FormOptions>

          <S.SubmitButton
            type="submit"
            disabled={!isValid || isSubmitting}
            $isValid={isValid}
            $isLoading={isSubmitting}
            onClick={playClickSound}
            whileHover={isValid ? { scale: 1.02, y: -2 } : {}}
            whileTap={isValid ? { scale: 0.98 } : {}}
          >
            <S.ButtonContent>
              {isSubmitting ? (
                <>
                  <S.LoadingSpinner />
                  <span>로그인 중...</span>
                </>
              ) : (
                <>
                  <S.ButtonIcon>🚀</S.ButtonIcon>
                  <span>로그인</span>
                </>
              )}
            </S.ButtonContent>
          </S.SubmitButton>
        </S.LoginForm>
      </S.LoginFormWrapper>
    </>
  )
}

// React.memo로 감싸서 불필요한 리렌더링 방지
export const CredentialLoginForm = React.memo(CredentialLoginFormComponent)

export default CredentialLoginForm
