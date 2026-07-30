import { VerificationProvider } from './VerificationProvider'
import { isSendRateLimited, issueCode, checkCode } from './core'
import { sendEmail } from '../email'

function emailTemplate(code) {
  return `
    <div dir="rtl" style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f9fafb;padding:32px 0">
      <div style="max-width:420px;margin:0 auto;background:#fff;border-radius:16px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <h2 style="margin:0 0 8px;color:#2B1B12">كود تفعيل حسابك في وصلة</h2>
        <p style="color:#374151;font-size:14px">استخدم الكود ده لتفعيل حسابك:</p>
        <p style="font-size:32px;font-weight:900;letter-spacing:6px;color:#6F4E37;margin:16px 0">${code}</p>
        <p style="color:#9ca3af;font-size:12px">الكود صالح لمدة 10 دقايق. لو ماكنتش انت اللي طلبت الكود ده، تجاهل الرسالة.</p>
      </div>
    </div>
  `
}

export class EmailOtpProvider extends VerificationProvider {
  get channel() { return 'email' }

  async requestCode({ target, purpose = 'signup' }) {
    if (await isSendRateLimited(this.channel, target)) {
      return { sent: false, reason: 'rate_limited' }
    }
    const code = await issueCode(this.channel, target, purpose)
    await sendEmail(target, 'كود تفعيل حسابك — وصلة', emailTemplate(code))
    return { sent: true }
  }

  async checkCode({ target, code, purpose = 'signup' }) {
    return checkCode(this.channel, target, purpose, code)
  }
}
