import { business } from './rental-data'
export function rentalContact(value: string) {
  const digits = value.replace(/\D/g, '')
  const number =
    digits === business.whatsappNumber.replace(/\D/g, '')
      ? business.whatsappNumber
      : value
  const link = (
    text = 'I want to know more about your cars and rental options.',
  ) => `https://wa.me/${digits}?text=${encodeURIComponent(text)}`
  return {
    href: link(),
    link,
    number,
    label: `Chat with U Drive on WhatsApp at ${number}`,
  }
}
