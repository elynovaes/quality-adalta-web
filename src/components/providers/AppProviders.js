'use client'

import { DocumentacaoFlowProvider } from '@/stores/documentacao-flow-store'

export default function AppProviders({ children }) {
  return <DocumentacaoFlowProvider>{children}</DocumentacaoFlowProvider>
}
