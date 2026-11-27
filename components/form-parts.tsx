import { Info } from 'lucide-react'
import { Field, FieldLabel } from './ui/field'

export function FormField({
  id,
  label,
  optional = false,
  required = false,
  error,
  wide = false,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  required?: boolean
  error?: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <Field
      data-invalid={error ? true : undefined}
      className={wide ? 'form-field field-wide' : 'form-field'}
    >
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="required-mark" aria-hidden="true">
            *
          </span>
        )}
        {optional && <span className="optional-label">Optional</span>}
      </FieldLabel>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </Field>
  )
}
export function PreviewNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="preview-note">
      <Info size={16} aria-hidden="true" />
      <p>{children}</p>
    </div>
  )
}
