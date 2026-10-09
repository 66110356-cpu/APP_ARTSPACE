import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

function EmailConfirmed() {
  const { user, authReady, logout } = useAuth()
  const navigate = useNavigate()
  const params = new URLSearchParams(
    `${window.location.search.slice(1)}&${window.location.hash.slice(1)}`
  )
  const hasAuthError = params.has('error') || params.has('error_code')
  const confirmationComplete = params.has('access_token')
    || params.has('token_hash')
    || params.has('code')
    || Boolean(user)
  const [continuing, setContinuing] = useState(false)
  const [continueError, setContinueError] = useState('')

  async function goToLogin() {
    setContinuing(true)
    setContinueError('')
    try {
      if (user) await logout()
      navigate('/login', { replace: true })
    } catch (error) {
      setContinueError(error.message || 'Could not return to login.')
    } finally {
      setContinuing(false)
    }
  }

  return (
    <main className={`email-confirmed-page${authReady && confirmationComplete && !hasAuthError ? ' email-confirmed-overlay' : ''}`}>
      <section className="email-confirmed-card" aria-labelledby="email-confirmed-title">
        <img
          className="email-confirmed-logo"
          src="/app-icon-192.png"
          alt="ARTSPACE"
        />
        <p className="small-title">ARTSPACE ACCOUNT SECURITY</p>
        {!authReady ? (
          <>
            <div className="email-confirmed-check" aria-hidden="true">✓</div>
            <h1 id="email-confirmed-title">Verifying your email</h1>
            <p>Please wait while ARTSPACE checks your confirmation link.</p>
          </>
        ) : hasAuthError ? (
          <>
            <h1 id="email-confirmed-title">ลิงก์ยืนยันไม่สามารถใช้งานได้</h1>
            <p>
              ลิงก์อาจหมดอายุหรือถูกใช้ไปแล้ว กรุณากลับไปยังหน้าเข้าสู่ระบบ
              แล้วขอส่งอีเมลยืนยันฉบับใหม่
            </p>
            <button className="email-confirmed-button" onClick={goToLogin}>กลับไปหน้าเข้าสู่ระบบ</button>
          </>
        ) : confirmationComplete ? (
          <div className="signup-success-modal">
            <div className="signup-success-icon" aria-hidden="true">✦</div>
            <p className="small-title">ARTSPACE</p>
            <h1 id="email-confirmed-title">Congratulations!</h1>
            <p>
              Your email has been verified and your ARTSPACE account is ready.
              Continue to the login page to sign in.
            </p>
            <button
              className="email-confirmed-button"
              onClick={goToLogin}
              disabled={continuing}
            >
              {continuing ? 'Please wait…' : 'Continue to login'}
            </button>
            {continueError && <p className="form-message error" role="alert">{continueError}</p>}
          </div>
        ) : (
          <>
            <h1 id="email-confirmed-title">
              Email verification opened
            </h1>
            <p>
              Return to ARTSPACE and sign in. If the email link did not confirm your account,
              request a new verification email from the login page.
            </p>
            <button className="email-confirmed-button" onClick={goToLogin}>Go to login</button>
          </>
        )}
        <p className="email-confirmed-footer">
          ARTSPACE · พื้นที่สำหรับค้นพบและแบ่งปันผลงานสร้างสรรค์
        </p>
      </section>
    </main>
  )
}

export default EmailConfirmed
