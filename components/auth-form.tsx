'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Info, MapPin } from 'lucide-react'
import { FormField } from './form-parts'
import { FieldGroup, FieldSeparator } from './ui/field'
import { Input } from './ui/input'
import { Breadcrumbs } from './shared'
import { useInteractive } from '@/lib/use-interactive'

type AuthMode = 'sign-in' | 'create-account' | 'forgot-password'

function PasswordField({
  id,
  label,
  create = false,
}: {
  id: string
  label: string
  create?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <FormField id={id} label={label}>
      <div className="password-input">
        <Input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          required
          minLength={create ? 8 : 1}
          maxLength={128}
          autoComplete="off"
          placeholder={
            id === 'confirm-password'
              ? 'Re-enter your sample password'
              : create
                ? 'At least 8 characters'
                : 'Enter a sample password'
          }
        />
        <button
          type="button"
          aria-label={`${show ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={show}
          onClick={() => setShow((s) => !s)}
        >
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
    </FormField>
  )
}

export function AuthForm({ mode }: { mode: AuthMode }) {
  const create = mode === 'create-account'
  const reset = mode === 'forgot-password'
  const ready = useInteractive()
  const [message, setMessage] = useState('')
  const status = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (message) status.current?.focus()
  }, [message])
  const title = create
    ? 'Create your account'
    : reset
      ? 'Reset your password'
      : 'Welcome back'
  const current = create
    ? 'Create Account'
    : reset
      ? 'Forgot Password'
      : 'Sign In'

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)
    const invalid = (id: string, text: string) => {
      const field = form.elements.namedItem(id) as HTMLInputElement
      field.setCustomValidity(text)
      field.setAttribute('aria-invalid', 'true')
      field.closest('[data-slot="field"]')?.setAttribute('data-invalid', '')
      field.reportValidity()
      field.focus()
    }
    if (create && String(data.get('name') ?? '').trim().length < 2) {
      invalid('name', 'Enter a full name of at least two characters.')
      return
    }
    if (create && data.get('password') !== data.get('confirm-password')) {
      invalid(
        'confirm-password',
        'Your passwords do not match. Enter the same sample password in both fields.',
      )
      return
    }
    form.reset()
    setMessage(
      reset
        ? 'Password recovery is not connected. No reset email was sent.'
        : create
          ? 'Registration is not connected. No account was created and no credentials were sent.'
          : 'Sign-in is not connected. No credentials were sent and no session was created.',
    )
  }

  return (
    <section className="wrap account-page">
      <Breadcrumbs items={[{ label: current }]} />
      <div className="auth-layout">
        <div className="auth-photo">
          <picture>
            <source
              media="(max-width: 730px)"
              srcSet="/images/showcase-deepal-s05.webp"
            />
            <img
              src="/images/showcase-deepal-s05-mobile.webp"
              alt="Silver Deepal S05 on a winding Nepal road"
              width={739}
              height={799}
            />
          </picture>
          <div className="auth-photo-shade" />
          <div className="auth-photo-copy">
            <p className="eyebrow">U DRIVE CAR RENTAL</p>
            <p className="auth-photo-title">
              Your next drive
              <br />
              starts here.
            </p>
            <p className="inline-icon">
              <MapPin size={14} />
              Kathmandu, Nepal
            </p>
          </div>
        </div>
        <div className="auth-panel">
          <p className="eyebrow">YOUR U DRIVE ACCOUNT</p>
          <h1>{title}</h1>
          <p className="auth-subtitle">
            {create
              ? 'Already a member? '
              : reset
                ? 'Remember your password? '
                : 'Don’t have an account? '}
            <Link href={create || reset ? '/sign-in' : '/create-account'}>
              {create || reset ? 'Sign in' : 'Create account'}
            </Link>
          </p>
          {!reset && (
            <>
              <div className="social-sign-in">
                {['Google', 'Facebook'].map((provider) => (
                  <button
                    type="button"
                    className="action outline"
                    key={provider}
                    disabled={!ready}
                    aria-describedby="account-preview"
                    onClick={() =>
                      setMessage(
                        `${provider} sign-in is not connected. No credentials were requested or sent.`,
                      )
                    }
                  >
                    <img
                      src={`/images/${provider.toLowerCase()}.svg`}
                      alt=""
                      width={18}
                      height={18}
                    />
                    Continue with {provider}
                  </button>
                ))}
              </div>
              <FieldSeparator className="auth-divider">
                {create ? 'OR REGISTER WITH EMAIL' : 'OR SIGN IN WITH EMAIL'}
              </FieldSeparator>
            </>
          )}
          {reset && (
            <p className="auth-reset-copy">
              Enter a sample email address to preview password recovery.
            </p>
          )}
          <form
            method="post"
            onSubmit={submit}
            data-ready={ready}
            aria-describedby="account-preview"
            onInput={(event) => {
              setMessage('')
              const form = event.currentTarget
              form
                .querySelectorAll<HTMLInputElement>(
                  'input[aria-invalid="true"]',
                )
                .forEach((input) => {
                  input.setCustomValidity('')
                  input.removeAttribute('aria-invalid')
                  input
                    .closest('[data-slot="field"]')
                    ?.removeAttribute('data-invalid')
                })
            }}
          >
            <fieldset disabled={!ready}>
              <legend className="sr-only">{current} with email</legend>
              <FieldGroup className="auth-fields">
                {create && (
                  <FormField id="account-name" label="Full name">
                    <Input
                      id="account-name"
                      name="name"
                      autoComplete="off"
                      required
                      minLength={2}
                      maxLength={100}
                      placeholder="Your full name"
                    />
                  </FormField>
                )}
                <FormField id="account-email" label="Email address">
                  <Input
                    id="account-email"
                    type="email"
                    name="email"
                    autoComplete="off"
                    required
                    maxLength={254}
                    placeholder="you@example.com"
                  />
                </FormField>
                {!reset && (
                  <PasswordField
                    id="password"
                    label="Password"
                    create={create}
                  />
                )}
                {create && (
                  <PasswordField
                    id="confirm-password"
                    label="Confirm password"
                    create
                  />
                )}
              </FieldGroup>
              {mode === 'sign-in' && (
                <div className="account-options">
                  <label className="account-check">
                    <input type="checkbox" name="remember" />
                    Remember me
                  </label>
                  <Link href="/forgot-password">Forgot password?</Link>
                </div>
              )}
              {create && (
                <div className="account-check terms-check">
                  <input
                    id="accept-terms"
                    type="checkbox"
                    name="terms"
                    required
                    aria-labelledby="terms-label"
                  />
                  <span id="terms-label">
                    <label htmlFor="accept-terms">I agree to the </label>
                    <Link
                      href="/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Terms &amp; Conditions
                    </Link>{' '}
                    and{' '}
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Privacy Policy
                    </Link>
                    .
                  </span>
                </div>
              )}
              <button className="action primary auth-submit" type="submit">
                {reset
                  ? 'Request password reset'
                  : create
                    ? 'Create account'
                    : 'Sign in'}
                <ArrowRight size={16} />
              </button>
            </fieldset>
          </form>
          {message && (
            <p
              ref={status}
              tabIndex={-1}
              className="form-response"
              role="status"
            >
              {message}
            </p>
          )}
          <p className="account-preview" id="account-preview">
            <Info size={14} />
            <span>
              Account preview. Authentication is not connected. Use sample
              details only.
            </span>
          </p>
          <Link className="guest-link" href="/booking">
            <ArrowLeft size={14} />
            Rent a car without an account
          </Link>
        </div>
      </div>
    </section>
  )
}
