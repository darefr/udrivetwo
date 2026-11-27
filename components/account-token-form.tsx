'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Editor } from './workspace/controls'
import { api } from './platform-provider'
export function TokenForm({ verify = false }: { verify?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <section className="section wrap">
      <p className="eyebrow">YOUR U DRIVE ACCOUNT</p>
      <h1>{verify ? 'Verify your email.' : 'Choose a new password.'}</h1>
      <div className="desk-stack">
        {done ? (
          <p role="status">
            {verify
              ? 'Your email address is verified.'
              : 'Your password was updated and previous sessions have been signed out.'}
          </p>
        ) : (
          <Editor
            title={
              verify
                ? 'Confirm the email address from your link'
                : 'Use at least 10 characters'
            }
            fields={
              verify
                ? []
                : [
                    {
                      name: 'password',
                      label: 'New password',
                      type: 'password',
                    },
                    {
                      name: 'confirm',
                      label: 'Confirm new password',
                      type: 'password',
                    },
                  ]
            }
            submit={verify ? 'Verify email address' : 'Reset password'}
            onSave={async (d) => {
              const token = new URLSearchParams(
                window.location.hash.slice(1),
              ).get('token')
              if (!token)
                throw new Error('Open the single-use link from your email.')
              if (!verify && d.password !== d.confirm)
                throw new Error('The passwords do not match.')
              await api(`auth/${verify ? 'verify' : 'reset'}`, {
                token,
                ...(!verify ? { password: d.password } : {}),
              })
              history.replaceState(null, '', location.pathname)
              setDone(true)
            }}
          />
        )}
        <Link className="text-link" href="/sign-in">
          Return to sign in
        </Link>
      </div>
    </section>
  )
}
