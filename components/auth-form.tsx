'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Info, MapPin } from 'lucide-react'
import { FormField } from './form-parts'
import { FieldGroup, FieldSeparator } from './ui/field'
import { Input } from './ui/input'
import { Breadcrumbs } from './shared'
import { api, useRentalPlatform } from './platform-provider'
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
          minLength={create ? 10 : 1}
          maxLength={128}
          autoComplete={create ? 'new-password' : 'current-password'}
          placeholder={
            id === 'confirm-password'
              ? 'Re-enter your password'
              : create
                ? 'At least 10 characters'
                : 'Enter a password'
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
  useEffect(() => {
    if (new URLSearchParams(location.search).has('providerError'))
      setMessage(
        'Social sign-in could not be completed. Use your original sign-in method or continue with email.',
      )
  }, [])
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

  const { social } = useRentalPlatform()
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
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
        'Your passwords do not match. Enter the same password in both fields.',
      )
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const result = await api(
        `auth/${reset ? 'forgot' : create ? 'register' : 'login'}`,
        reset
          ? { email: data.get('email') }
          : create
            ? {
                name: data.get('name'),
                email: data.get('email'),
                password: data.get('password'),
                terms: data.has('terms'),
              }
            : {
                email: data.get('email'),
                password: data.get('password'),
                remember: data.has('remember'),
              },
      )
      if (result.redirect) window.location.assign(result.redirect)
      else setMessage(result.message)
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
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
                    onClick={async () => {
                      const name = provider.toLowerCase() as keyof typeof social
                      if (!social[name]) {
                        setMessage(
                          `${provider} sign-in is not enabled. You can continue with email and password.`,
                        )
                        return
                      }
                      try {
                        const r = await api(`oauth/${name}`, {})
                        window.location.assign(r.url)
                      } catch (e) {
                        setMessage((e as Error).message)
                      }
                    }}
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
              Enter your account email to request a single-use password reset
              link.
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
            <fieldset disabled={!ready || busy}>
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
              Your rental details are private. Social sign-in is subject to our{' '}
              <Link href="/terms">terms</Link> and{' '}
              <Link href="/privacy">privacy policy</Link>. U Drive will never
              ask for your password on WhatsApp.
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
