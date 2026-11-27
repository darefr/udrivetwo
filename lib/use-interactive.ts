'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}
const onClient = () => true
const onServer = () => false

export function useInteractive() {
  return useSyncExternalStore(subscribe, onClient, onServer)
}
