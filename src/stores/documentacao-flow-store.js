'use client'

import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { buildResumeViewModel, createInitialFlowState, normalizeDocumentConfiguration, normalizeGeneralData, normalizeSystemDraft, summarizeSelections, applySystemCount } from '@/features/documentacao/mappers/documentacaoFlowMappers'
import { buildDocumentationSet } from '@/features/documentacao/utils/buildDocumentationSet'
import { MODO_CRIACAO_DOCUMENTACAO } from '@/types/documentacao-flow'

const STORAGE_PREFIX = 'quality-adalta-web:documentacao-flow'

const DocumentacaoFlowContext = createContext(null)

function getStorageKey(serviceId) {
  return `${STORAGE_PREFIX}:${serviceId}`
}

function persistState(state) {
  if (typeof window === 'undefined' || !state.serviceId) {
    return
  }

  window.sessionStorage.setItem(getStorageKey(state.serviceId), JSON.stringify(state))
}

function readPersistedState(serviceId) {
  if (typeof window === 'undefined' || !serviceId) {
    return null
  }

  const rawState = window.sessionStorage.getItem(getStorageKey(serviceId))

  if (!rawState) {
    return null
  }

  try {
    return JSON.parse(rawState)
  } catch (error) {
    console.log(error)
    return null
  }
}

function computeDerivedState(state) {
  const selectionSummary = summarizeSelections({
    groupedDocuments: state.groupedDocuments,
    sistemas: state.sistemas,
    modoCriacaoDocumentacao: state.modoCriacaoDocumentacao,
  })
  const plan = buildDocumentationSet(state)

  return {
    ...state,
    qualificacoes: selectionSummary.qualificacoes,
    tiposDocumento: selectionSummary.tiposDocumento,
    resumoCriacao: buildResumeViewModel(plan),
  }
}

function hydrateState(data) {
  const initial = createInitialFlowState()

  const nextState = {
    ...initial,
    ...data,
    quantidadeSistemas: Math.max(1, Number(data?.quantidadeSistemas) || 1),
    sistemas: (data?.sistemas || initial.sistemas).map((system, index) =>
      normalizeSystemDraft(system, index)
    ),
    groupedDocuments: normalizeDocumentConfiguration(data?.groupedDocuments),
    dadosGerais: normalizeGeneralData(data?.dadosGerais),
    serviceSnapshot: data?.serviceSnapshot || null,
    documentacaoIds: data?.documentacaoIds || [],
    logoUpload: {
      uploading: false,
      error: '',
      ...(data?.logoUpload || {}),
    },
  }

  return computeDerivedState(nextState)
}

function reducer(state, action) {
  switch (action.type) {
    case 'START_FLOW': {
      const nextState = hydrateState({
        serviceId: action.payload.serviceId,
        os: action.payload.os || '',
        cliente: action.payload.cliente || '',
        quantidadeSistemas: action.payload.quantidadeSistemas,
        modoCriacaoDocumentacao: action.payload.modoCriacaoDocumentacao,
        sistemas: applySystemCount(state.sistemas, action.payload.quantidadeSistemas),
        serviceSnapshot: action.payload.serviceSnapshot || null,
      })

      return nextState
    }

    case 'HYDRATE_FLOW':
      return hydrateState({
        ...state,
        ...action.payload,
      })

    case 'SET_SERVICE_SNAPSHOT':
      return computeDerivedState({
        ...state,
        serviceId: action.payload.id,
        os: action.payload.os || state.os,
        cliente: action.payload.cliente || state.cliente,
        serviceSnapshot: action.payload,
      })

    case 'SET_SYSTEM_COUNT':
      return computeDerivedState({
        ...state,
        quantidadeSistemas: Math.max(1, Number(action.payload) || 1),
        sistemas: applySystemCount(state.sistemas, action.payload),
      })

    case 'SET_CREATION_MODE':
      return computeDerivedState({
        ...state,
        modoCriacaoDocumentacao: action.payload,
      })

    case 'UPDATE_SYSTEM_NAME':
      return computeDerivedState({
        ...state,
        sistemas: state.sistemas.map((system, index) =>
          index === action.payload.index
            ? { ...system, nome: action.payload.nome }
            : system
        ),
      })

    case 'UPDATE_GENERAL_DATA':
      return computeDerivedState({
        ...state,
        dadosGerais: {
          ...state.dadosGerais,
          [action.payload.section]: {
            ...(state.dadosGerais[action.payload.section] || {}),
            ...action.payload.value,
          },
        },
      })

    case 'SET_LOGO_UPLOAD_STATUS':
      return computeDerivedState({
        ...state,
        logoUpload: {
          ...state.logoUpload,
          ...action.payload,
        },
      })

    case 'SET_LOGO_CLIENTE':
      return computeDerivedState({
        ...state,
        dadosGerais: {
          ...state.dadosGerais,
          logoCliente: action.payload,
        },
        logoUpload: {
          uploading: false,
          error: '',
        },
      })

    case 'UPDATE_GROUPED_DOCUMENT':
      return computeDerivedState({
        ...state,
        groupedDocuments: {
          ...state.groupedDocuments,
          [action.payload.typeId]: action.payload.value,
        },
      })

    case 'UPDATE_SYSTEM_DOCUMENT':
      return computeDerivedState({
        ...state,
        sistemas: state.sistemas.map((system, index) =>
          index === action.payload.index
            ? {
                ...system,
                documentosQualificacao: {
                  ...system.documentosQualificacao,
                  [action.payload.typeId]: action.payload.value,
                },
              }
            : system
        ),
      })

    case 'SET_PERSISTENCE_RESULT':
      return computeDerivedState({
        ...state,
        resumoCriacao: action.payload.resumoCriacao || state.resumoCriacao,
        documentacaoIds: action.payload.documentacaoIds || [],
      })

    case 'RESET_FLOW':
      return createInitialFlowState()

    default:
      return state
  }
}

export function DocumentacaoFlowProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, createInitialFlowState)

  useEffect(() => {
    persistState(state)
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])

  return (
    <DocumentacaoFlowContext.Provider value={value}>
      {children}
    </DocumentacaoFlowContext.Provider>
  )
}

export function useDocumentacaoFlowStore() {
  const context = useContext(DocumentacaoFlowContext)

  if (!context) {
    throw new Error('useDocumentacaoFlowStore deve ser usado dentro de DocumentacaoFlowProvider')
  }

  const { state, dispatch } = context

  const actions = useMemo(
    () => ({
      hydratePersistedFlow(serviceId) {
        const persisted = readPersistedState(serviceId)

        if (!persisted) {
          return false
        }

        dispatch({
          type: 'HYDRATE_FLOW',
          payload: persisted,
        })

        return true
      },
      setServiceSnapshot(payload) {
        dispatch({ type: 'SET_SERVICE_SNAPSHOT', payload })
      },
      startFlow(payload) {
        dispatch({ type: 'START_FLOW', payload })
      },
      setSystemCount(value) {
        dispatch({ type: 'SET_SYSTEM_COUNT', payload: value })
      },
      setCreationMode(value) {
        dispatch({ type: 'SET_CREATION_MODE', payload: value })
      },
      updateSystemName(index, nome) {
        dispatch({ type: 'UPDATE_SYSTEM_NAME', payload: { index, nome } })
      },
      updateGeneralData(section, value) {
        dispatch({ type: 'UPDATE_GENERAL_DATA', payload: { section, value } })
      },
      setLogoUploadStatus(payload) {
        dispatch({ type: 'SET_LOGO_UPLOAD_STATUS', payload })
      },
      setLogoCliente(payload) {
        dispatch({ type: 'SET_LOGO_CLIENTE', payload })
      },
      updateDocumentSelection({ scope, index, typeId, value }) {
        dispatch({
          type: scope === 'grouped' ? 'UPDATE_GROUPED_DOCUMENT' : 'UPDATE_SYSTEM_DOCUMENT',
          payload: { index, typeId, value },
        })
      },
      setPersistenceResult(payload) {
        dispatch({ type: 'SET_PERSISTENCE_RESULT', payload })
      },
      resetFlow() {
        dispatch({ type: 'RESET_FLOW' })
      },
    }),
    [dispatch]
  )

  return {
    state,
    ...actions,
  }
}

export function useDocumentacaoFlowViewModel() {
  const { state } = useDocumentacaoFlowStore()
  const plan = buildDocumentationSet(state)

  return {
    ...state,
    plan,
    totalDocuments: plan.reduce((sum, group) => sum + group.documentos.length, 0),
  }
}

export { MODO_CRIACAO_DOCUMENTACAO }
