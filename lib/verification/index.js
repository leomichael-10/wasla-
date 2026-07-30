import { EmailOtpProvider } from './emailOtp'
import { WhatsAppOtpProvider } from './whatsappOtp'

const PROVIDERS = {
  email:    new EmailOtpProvider(),
  whatsapp: new WhatsAppOtpProvider(),
}

export function getVerificationProvider(channel) {
  return PROVIDERS[channel]
}
