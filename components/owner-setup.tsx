'use client'
import { Editor } from './workspace/controls'
import { api } from './platform-provider'
export function OwnerSetup() {
  return (
    <section className="section wrap">
      <p className="eyebrow">U DRIVE · INSTALLATION</p>
      <h1>Set up the rental desk.</h1>
      <p>
        Use the one-time owner code supplied by your deployment operator. There
        is no default administrator password.
      </p>
      <Editor
        fields={[
          { name: 'code', label: 'One-time owner code', type: 'password' },
        ]}
        submit="Activate owner account"
        onSave={(d) => api('auth/bootstrap', d)}
      />
    </section>
  )
}
