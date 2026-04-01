import React, { useEffect, useMemo, useRef, useState } from 'react'
import { gql } from "@apollo/client";
import { useSubscription, useQuery, useMutation } from "@apollo/client/react";
import SessionForm from './components/SessionForm'
import SessionDetailPage from './components/SessionDetailPage'
import EditMatchForm from './components/EditMatchForm'
import CreateMatchForm from './components/CreateMatchForm'
import Navbar from './components/Sidebar'
import CourtsPage from './pages/CourtsPage'
import DashboardPage from './pages/DashboardPage'
import PlayersPage from './pages/PlayersPage'
import OngoingMatchesPage from './pages/OngoingMatchesPage'
import RecordsPage from './pages/RecordsPage'
import WaitingRoomPage from './pages/WaitingRoomPage'
import PaymentsPage from './pages/PaymentsPage'

const SESSIONS_QUERY = gql`
  query Sessions {
    sessions {
      _id
      name
      status
      isArchived
      courts
      players {
        playerId
        gamesPlayed
      }
      price
      startedAt
      endedAt
      createdAt
      updatedAt
    }
  }
`

const SESSION_SUBSCRIPTION = gql`
  subscription SessionSub {
    sessionSub {
      type
      session {
        _id
        name
        status
        isArchived
        courts
        players {
          playerId
          gamesPlayed
        }
        price
        startedAt
        endedAt
        createdAt
        updatedAt
      }
    }
  }
`

const CREATE_SESSION_MUTATION = gql`
  mutation CreateSession($input: CreateSessionInput!) {
    createSession(input: $input) {
      ok
      message
      session {
        _id
        name
        status
        isArchived
        courts
        players {
          playerId
          gamesPlayed
        }
        price
        startedAt
        endedAt
        createdAt
        updatedAt
      }
    }
  }
`

const UPDATE_SESSION_MUTATION = gql`
  mutation UpdateSession($id: ID!, $input: UpdateSessionInput!) {
    updateSession(id: $id, input: $input) {
      ok
      message
      session {
        _id
        name
        status
        isArchived
        courts
        players {
          playerId
          gamesPlayed
        }
        price
        startedAt
        endedAt
        createdAt
        updatedAt
      }
    }
  }
`

const START_SESSION_MUTATION = gql`
  mutation StartSession($id: ID!) {
    startSession(id: $id) {
      ok
      message
      session {
        _id
        name
        status
        isArchived
        courts
        players {
          playerId
          gamesPlayed
        }
        startedAt
        endedAt
        createdAt
        updatedAt
      }
    }
  }
`

const END_SESSION_MUTATION = gql`
  mutation EndSession($id: ID!) {
    endSession(id: $id) {
      ok
      message
      session {
        _id
        name
        status
        isArchived
        courts
        players {
          playerId
          gamesPlayed
        }
        startedAt
        endedAt
        createdAt
        updatedAt
      }
    }
  }
`

const REMOVE_PLAYER_FROM_SESSIONS_MUTATION = gql`
  mutation RemovePlayerFromSessions($playerId: ID!, $sessionIds: [ID!]!, $isExempted: Boolean) {
    removePlayerFromSessions(playerId: $playerId, sessionIds: $sessionIds, isExempted: $isExempted) {
      ok
      message
      sessions {
        _id
        name
        status
        isArchived
        courts
        players {
          playerId
          gamesPlayed
        }
        price
        startedAt
        endedAt
        createdAt
        updatedAt
      }
    }
  }
`

const ONGOING_MATCHES_QUERY = gql`
  query OngoingMatches {
    ongoingMatches {
      _id
      sessionId
      courtId
      playerIds
      queued
      startedAt
      createdAt
      updatedAt
    }
  }
`

const START_MATCH_MUTATION = gql`
  mutation StartMatch($input: StartMatchInput!) {
    startMatch(input: $input) {
      ok
      message
      match {
        _id
        sessionId
        courtId
        playerIds
        queued
        startedAt
        createdAt
        updatedAt
      }
    }
  }
`

const END_MATCH_MUTATION = gql`
  mutation EndMatch($id: ID!) {
    endMatch(id: $id) {
      ok
      message
    }
  }
`

const START_QUEUED_MATCH_MUTATION = gql`
  mutation StartQueuedMatch($id: ID!, $courtId: ID) {
    startQueuedMatch(id: $id, courtId: $courtId) {
      ok
      message
      match {
        _id
        sessionId
        courtId
        playerIds
        queued
        startedAt
        createdAt
        updatedAt
      }
    }
  }
`

const RECORD_GAME_MUTATION = gql`
  mutation RecordGame($input: RecordGameInput!) {
    recordGame(input: $input) {
      ok
      message
      game {
        _id
        sessionId
        courtId
        players
        winnerPlayerIds
        finishedAt
        createdAt
        updatedAt
      }
    }
  }
`

const UPDATE_MATCH_MUTATION = gql`
  mutation UpdateMatch($id: ID!, $input: UpdateMatchInput!) {
    updateMatch(id: $id, input: $input) {
      ok
      message
      match {
        _id
        sessionId
        courtId
        playerIds
        queued
        startedAt
        createdAt
        updatedAt
      }
    }
  }
`

const COURTS_QUERY = gql`
  query Courts {
    courts {
      _id
      name
      surfaceType
      indoor
      description
      status
    }
  }
`

const COURT_SUBSCRIPTION = gql`
  subscription CourtSub {
    courtSub {
      type
      court {
        _id
        name
        surfaceType
        indoor
        description
        status
      }
    }
  }
`

const ONGOING_MATCHES_SUBSCRIPTION = gql`
  subscription OngoingMatchUpdates {
    ongoingMatchUpdates {
      type
      match {
        _id
        sessionId
        courtId
        playerIds
        queued
        startedAt
        createdAt
        updatedAt
      }
    }
  }
`

const PLAYERS_QUERY = gql`
  query Players {
    players {
      _id
      name
      gender
      playerLevel
      playCount
      winCount
      lossCount
      winRate
    }
  }
`

const GAMES_BY_SESSION_IDS_QUERY = gql`
  query GamesBySessionIds($sessionIds: [ID!]!) {
    gamesBySessionIds(sessionIds: $sessionIds) {
      _id
      sessionId
      players
      finishedAt
      createdAt
      updatedAt
    }
  }
`

const PAYMENTS_HISTORY_QUERY = gql`
  query PaymentsHistory {
    paymentsHistory {
      ok
      message
      payments {
        _id
        sessionId
        pricePerGame
        totalRevenue
        closedAt
        createdAt
        updatedAt
        players {
          playerId
          gamesPlayed
          total
          status
          checkedOutAt
        }
      }
    }
  }
`

const PAYMENT_SUBSCRIPTION = gql`
  subscription PaymentSub {
    paymentSub {
      type
      payment {
        _id
      }
    }
  }
`

const App = () => {
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editSession, setEditSession] = useState(null)
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [ongoingMatches, setOngoingMatches] = useState({})
  const [matchQueue, setMatchQueue] = useState({})
  const [isEditMatchModalOpen, setIsEditMatchModalOpen] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState(null)
  const [currentPage, setCurrentPage] = useState('dashboard')
  const [filteredSessionId, setFilteredSessionId] = useState(null)
  const [isCreateMatchModalOpen, setIsCreateMatchModalOpen] = useState(false)
  const [selectedMatchForWinners, setSelectedMatchForWinners] = useState(null)
  const [winnerTeam, setWinnerTeam] = useState('none')
  const [congratsToast, setCongratsToast] = useState(null)
  const [endSessionTarget, setEndSessionTarget] = useState(null)
  const [showEndConfirm, setShowEndConfirm] = useState(false)
  const [showEndBlocked, setShowEndBlocked] = useState(false)
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false)
  const [messageModalText, setMessageModalText] = useState('')
  const [isEndingMatch, setIsEndingMatch] = useState(false)
  const startingQueuedIds = useRef(new Set())
  const isDev = import.meta.env.DEV
  const isAnyModalOpen = Boolean(
    isFormOpen ||
    isEditMatchModalOpen ||
    isCreateMatchModalOpen ||
    isMessageModalOpen ||
    selectedMatchForWinners ||
    (showEndConfirm && endSessionTarget) ||
    showEndBlocked ||
    selectedSessionId
  )

  const showMessageModal = (message) => {
    setMessageModalText(message || 'Something went wrong')
    setIsMessageModalOpen(true)
  }
  
  const { data, loading, error, refetch } = useQuery(SESSIONS_QUERY)
  useSubscription(SESSION_SUBSCRIPTION, {
    onData: () => { refetch() },
    onError: () => { refetch() },
  })
  const { data: ongoingMatchesData, refetch: refetchOngoingMatches } = useQuery(ONGOING_MATCHES_QUERY)
  const { data: courtsData, refetch: refetchCourts } = useQuery(COURTS_QUERY)
  useSubscription(COURT_SUBSCRIPTION, {
    onData: () => { refetchCourts() },
    onError: () => { refetchCourts() },
  })
  const { data: ongoingMatchSubData } = useSubscription(ONGOING_MATCHES_SUBSCRIPTION, {
    onError: () => { refetchOngoingMatches() },
  })
  const { data: playersData, refetch: refetchPlayers } = useQuery(PLAYERS_QUERY)
  const sessionIdsForGames = useMemo(
    () => (data?.sessions || []).map((session) => session._id),
    [data?.sessions]
  )
  const { data: gamesBySessionData } = useQuery(GAMES_BY_SESSION_IDS_QUERY, {
    variables: { sessionIds: sessionIdsForGames },
    skip: sessionIdsForGames.length === 0,
  })
  const { data: paymentsHistoryData, refetch: refetchPaymentsHistory } = useQuery(PAYMENTS_HISTORY_QUERY)
  useSubscription(PAYMENT_SUBSCRIPTION, {
    onData: () => {
      refetchPaymentsHistory()
    },
    onError: () => {
      refetchPaymentsHistory()
    },
  })
  const [createSession, { loading: createLoading }] = useMutation(CREATE_SESSION_MUTATION)
  const [updateSession, { loading: updateLoading }] = useMutation(UPDATE_SESSION_MUTATION)
  const [removePlayerFromSessions] = useMutation(REMOVE_PLAYER_FROM_SESSIONS_MUTATION, {
    refetchQueries: [{ query: SESSIONS_QUERY }, { query: PAYMENTS_HISTORY_QUERY }]
  })
  const [startSession] = useMutation(START_SESSION_MUTATION)
  const [endSession, { loading: endSessionLoading }] = useMutation(END_SESSION_MUTATION, {
    refetchQueries: [{ query: SESSIONS_QUERY }]
  })
  const [startMatch] = useMutation(START_MATCH_MUTATION)
  const [endMatch] = useMutation(END_MATCH_MUTATION)
  const [recordGame, { loading: recordGameLoading }] = useMutation(RECORD_GAME_MUTATION)
  const [updateMatch] = useMutation(UPDATE_MATCH_MUTATION)
  const [startQueuedMatch] = useMutation(START_QUEUED_MATCH_MUTATION)


  const players = playersData?.players || []

  useEffect(() => {
    if (!congratsToast) return
    const timeout = setTimeout(() => setCongratsToast(null), 4000)
    return () => clearTimeout(timeout)
  }, [congratsToast])

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow
    const previousHtmlOverflow = document.documentElement.style.overflow

    if (isAnyModalOpen) {
      document.body.style.overflow = 'hidden'
      document.documentElement.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow
      document.documentElement.style.overflow = previousHtmlOverflow
    }
  }, [isAnyModalOpen])

  // Load ongoing matches from backend on mount and organize by session
  useEffect(() => {
    if (ongoingMatchesData?.ongoingMatches) {
      const ongoingBySession = {}
      const queuedBySession = {}
      
      ongoingMatchesData.ongoingMatches.forEach(match => {
        const matchWithId = { _id: match._id, ...match }
        
        if (match.queued) {
          // Add to queued state
          if (!queuedBySession[match.sessionId]) {
            queuedBySession[match.sessionId] = []
          }
          queuedBySession[match.sessionId].push(matchWithId)
        } else {
          // Add to ongoing state
          if (!ongoingBySession[match.sessionId]) {
            ongoingBySession[match.sessionId] = []
          }
          ongoingBySession[match.sessionId].push(matchWithId)
        }
      })
      
      setOngoingMatches(ongoingBySession)
      setMatchQueue(queuedBySession)
    }
  }, [ongoingMatchesData])

  // Handle real-time match updates from subscription
  useEffect(() => {
    if (!ongoingMatchSubData?.ongoingMatchUpdates) return
    
    const { type, match } = ongoingMatchSubData.ongoingMatchUpdates
    
    if (type === 'STARTED' || type === 'UPDATED' || type === 'CREATED') {
      setOngoingMatches(prev => {
        const updated = { ...prev }
        if (!updated[match.sessionId]) {
          updated[match.sessionId] = []
        }
        
        if (match.queued) {
          // Remove from ongoing if it exists
          updated[match.sessionId] = updated[match.sessionId].filter(m => m._id !== match._id)
          // Keep queued data isolated in matchQueue state
          setMatchQueue(q => {
            const q_updated = { ...q }
            if (!q_updated[match.sessionId]) q_updated[match.sessionId] = []
            const index = q_updated[match.sessionId].findIndex(m => m._id === match._id)
            if (index >= 0) {
              q_updated[match.sessionId][index] = { _id: match._id, ...match }
            } else {
              q_updated[match.sessionId].push({ _id: match._id, ...match })
            }
            return q_updated
          })
        } else {
          // Remove from queued if it exists
          setMatchQueue(q => {
            const q_updated = { ...q }
            if (q_updated[match.sessionId]) {
              q_updated[match.sessionId] = q_updated[match.sessionId].filter(m => m._id !== match._id)
            }
            return q_updated
          })
          // Add to ongoing
          const index = updated[match.sessionId].findIndex(m => m._id === match._id)
          if (index >= 0) {
            updated[match.sessionId][index] = { _id: match._id, ...match }
          } else {
            updated[match.sessionId].push({ _id: match._id, ...match })
          }
        }
        
        return updated
      })
    } else if (type === 'DELETED' || type === 'ENDED') {
      setOngoingMatches(prev => {
        const updated = { ...prev }
        if (updated[match.sessionId]) {
          updated[match.sessionId] = updated[match.sessionId].filter(m => m._id !== match._id)
        }
        return updated
      })
      
      setMatchQueue(prev => {
        const updated = { ...prev }
        if (updated[match.sessionId]) {
          updated[match.sessionId] = updated[match.sessionId].filter(m => m._id !== match._id)
        }
        return updated
      })
    }
  }, [ongoingMatchSubData])

  const sessions = (data?.sessions ?? []).filter(session => !session?.isArchived)

  // Auto-start any available queued matches through the backend so UI state stays authoritative.
  useEffect(() => {
    const allOngoingMatches = Object.values(ongoingMatches).flat()
    const occupiedCourtIdSet = new Set(
      allOngoingMatches
        .map((m) => m?.courtId)
        .filter(Boolean)
        .map((id) => String(id))
    )

    // Courts claimed by court-assigned queued matches must not be double-assigned to floating matches
    const allQueuedMatches = Object.values(matchQueue).flat()
    const queueReservedCourtIdSet = new Set(
      allQueuedMatches
        .filter((m) => m?.courtId)
        .map((m) => String(m.courtId))
    )
    // Prevent double-assignment of the same court to two floating matches in the same effect run
    const courtsAssignedThisRun = new Set()

    Object.entries(matchQueue).forEach(([, queue]) => {
      if (!queue || queue.length === 0) return

      // Find first queued match that CAN start (court free, players not in use)
      const availableMatch = queue.find((queuedMatch) => {
        if (!queuedMatch?._id || !queuedMatch.courtId || startingQueuedIds.current.has(queuedMatch._id)) return false

        const courtBusy = occupiedCourtIdSet.has(String(queuedMatch.courtId))
        const playersInUse = allOngoingMatches.some((m) =>
          queuedMatch.playerIds?.some((p) => m.playerIds?.includes(p))
        )

        return !courtBusy && !playersInUse
      })

      if (availableMatch) {
        startingQueuedIds.current.add(availableMatch._id)
        startQueuedMatch({
          variables: { id: availableMatch._id }
        }).catch((err) => {
          console.error('Error auto-starting queued match:', err)
        }).finally(() => {
          setTimeout(() => { startingQueuedIds.current.delete(availableMatch._id) }, 100)
        })
        return
      }

      // No court-assigned match found; try floating (no court) queued matches
    })

    Object.entries(matchQueue).forEach(([sessionId, queue]) => {
      if (!queue || queue.length === 0) return

      const floatingMatch = queue.find((qm) => {
        if (!qm?._id || qm.courtId || startingQueuedIds.current.has(qm._id)) return false
        const playersInUse = allOngoingMatches.some((m) =>
          qm.playerIds?.some((p) => m.playerIds?.includes(p))
        )
        return !playersInUse
      })

      if (!floatingMatch) {
        if (isDev) {
          console.debug('[QueueAutoAssign] skip: no eligible floating match', {
            sessionId,
            queueLength: queue.length,
          })
        }
        return
      }

      // Find a free court in this session
      const session = sessions?.find((s) => s._id === sessionId)
      const sessionCourtIds = session?.courts || []
      const sessionCourtIdSet = new Set(sessionCourtIds.map((id) => String(id)))
      const allCourts = courtsData?.courts || []

      if (!session) {
        if (isDev) {
          console.debug('[QueueAutoAssign] skip: session not found', {
            sessionId,
            floatingMatchId: floatingMatch._id,
          })
        }
        return
      }

      const freeCourt = allCourts.find(
        (c) =>
          sessionCourtIdSet.has(String(c._id)) &&
          !occupiedCourtIdSet.has(String(c._id)) &&
          !queueReservedCourtIdSet.has(String(c._id)) &&
          !courtsAssignedThisRun.has(String(c._id))
      )

      if (!freeCourt) {
        if (isDev) {
          console.debug('[QueueAutoAssign] skip: no free court', {
            sessionId,
            floatingMatchId: floatingMatch._id,
            sessionCourtIds,
          })
        }
        return
      }

      if (isDev) {
        console.debug('[QueueAutoAssign] start floating match', {
          sessionId,
          floatingMatchId: floatingMatch._id,
          assignedCourtId: freeCourt._id,
        })
      }

      startingQueuedIds.current.add(floatingMatch._id)
      courtsAssignedThisRun.add(String(freeCourt._id))
      startQueuedMatch({
        variables: { id: floatingMatch._id, courtId: freeCourt._id }
      }).catch((err) => {
        console.error('Error auto-starting floating queued match:', err)
      }).finally(() => {
        setTimeout(() => { startingQueuedIds.current.delete(floatingMatch._id) }, 100)
      })
    })
  }, [matchQueue, ongoingMatches, startQueuedMatch, sessions, courtsData])

  const handleCreateSession = async (formData) => {
    try {
      if (editSession) {
        // Update existing session
        const input = {
          name: formData.name,
          courtIds: formData.courts,
          playerIds: formData.players,
        }
        
        // Only add price if it has a value
        if (formData.price !== '' && formData.price !== null && formData.price !== undefined) {
          input.price = parseFloat(formData.price)
        }
        
        const result = await updateSession({
          variables: {
            id: editSession._id,
            input
          }
        })
        
        if (result.data.updateSession.ok) {
          setIsFormOpen(false)
          setEditSession(null)
        } else {
          showMessageModal(result.data.updateSession.message)
        }
      } else {
        // Create new session
        const input = {
          name: formData.name,
          courtIds: formData.courts,
          playerIds: formData.players,
        }
        
        // Only add price if it has a value
        if (formData.price !== '' && formData.price !== null && formData.price !== undefined) {
          input.price = parseFloat(formData.price)
        }
        
        const result = await createSession({
          variables: {
            input
          }
        })
        
        if (result.data.createSession.ok) {
          // Automatically start the newly created session
          const newSessionId = result.data.createSession.session._id
          await handleStartSession(newSessionId)
          setIsFormOpen(false)
        } else {
          alert(result.data.createSession.message)
        }
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleStartSession = async (sessionId) => {
    try {
      const result = await startSession({
        variables: { id: sessionId }
      })
      
      if (!result.data.startSession.ok) {
        alert(result.data.startSession.message)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleViewSession = (session) => {
    setSelectedSessionId(session._id)
  }

  const handleEditSession = (session) => {
    setEditSession(session)
    setIsFormOpen(true)
  }

  const handleEndSessionClick = (session) => {
    setEndSessionTarget(session)
    setShowEndConfirm(true)
  }

  const handleConfirmEndSession = async () => {
    if (!endSessionTarget) return

    const sessionId = endSessionTarget._id
    const hasOngoingForSession = (ongoingMatches[sessionId] || []).length > 0
    const hasQueuedForSession = (matchQueue[sessionId] || []).length > 0

    if (hasOngoingForSession || hasQueuedForSession) {
      setShowEndBlocked(true)
      return
    }

    try {
      const result = await endSession({
        variables: { id: sessionId }
      })

      if (result.data?.endSession?.ok) {
        setShowEndConfirm(false)
        setEndSessionTarget(null)
      } else {
        alert(result.data?.endSession?.message || 'Failed to end session')
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const handleEditMatch = (match) => {
    setSelectedMatch(match)
    setIsEditMatchModalOpen(true)
  }

  const handleEditMatchSubmit = async (formData) => {
    try {
      const result = await updateMatch({
        variables: { 
          id: selectedMatch._id, 
          input: {
            courtId: formData.courtId,
            playerIds: formData.playerIds
          }
        }
      })
      
      if (result.data.updateMatch.ok) {
        setIsEditMatchModalOpen(false)
        setSelectedMatch(null)
        await refetchOngoingMatches()
      } else {
        alert(result.data.updateMatch.message)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleCancelMatch = async (match) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel this queued match?`
    )
    
    if (!confirmed) return
    
    try {
      const result = await endMatch({
        variables: { id: match._id }
      })
      
      if (result.data.endMatch.ok) {
        await refetchOngoingMatches()
      } else {
        alert(result.data.endMatch.message)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleUpdateOngoingMatch = (match) => {
    setSelectedMatch(match)
    setIsEditMatchModalOpen(true)
  }

  const handleStartQueuedMatch = async (match) => {
    if (!match?.queued) return

    try {
      const result = await startQueuedMatch({
        variables: { id: match._id }
      })

      if (result.data?.startQueuedMatch?.ok) {
        const updatedMatch = result.data.startQueuedMatch.match
        // Update the existing match instead of adding a new one
        setOngoingMatches((prev) => ({
          ...prev,
          [updatedMatch.sessionId]: (prev[updatedMatch.sessionId] || []).map((m) =>
            m._id === updatedMatch._id ? updatedMatch : m
          ),
        }))
      } else {
        alert(result.data?.startQueuedMatch?.message || 'Failed to start match')
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleEndOngoingMatch = async (match) => {
    setSelectedMatchForWinners(match)
    setWinnerTeam('none')
  }

  const getPlayerName = (playerId) => {
    return players.find(p => p._id === playerId)?.name || 'Unknown'
  }

  const getTeamsForMatch = (match) => {
    const ids = match?.playerIds || []
    const midpoint = Math.floor(ids.length / 2)
    return {
      team1: ids.slice(0, midpoint),
      team2: ids.slice(midpoint),
    }
  }

  const handleConfirmEndMatch = async () => {
    if (!selectedMatchForWinners || isEndingMatch) return

    const { team1, team2 } = getTeamsForMatch(selectedMatchForWinners)
    const hasWinnerSelection = winnerTeam === 'team1' || winnerTeam === 'team2'
    const winnerIds = hasWinnerSelection ? (winnerTeam === 'team1' ? team1 : team2) : []
    const loserIds = hasWinnerSelection ? (winnerTeam === 'team1' ? team2 : team1) : []

    if (hasWinnerSelection && (winnerIds.length === 0 || loserIds.length === 0)) {
      alert('Unable to determine teams for this match')
      return
    }

    const gameInput = {
      matchId: selectedMatchForWinners._id,
      sessionId: selectedMatchForWinners.sessionId,
      courtId: selectedMatchForWinners.courtId,
      playerIds: selectedMatchForWinners.playerIds,
      winnerPlayerIds: winnerIds,
      finishedAt: new Date().toISOString(),
    }

    try {
      setIsEndingMatch(true)
      const recordResult = await recordGame({
        variables: { input: gameInput }
      })

      if (!recordResult.data.recordGame.ok) {
        alert(recordResult.data.recordGame.message)
        return
      }

      const endResult = await endMatch({
        variables: { id: selectedMatchForWinners._id }
      })

      if (!endResult.data.endMatch.ok && endResult.data.endMatch.message !== 'Match not found') {
        alert(endResult.data.endMatch.message)
        return
      }

      // Keep session.players.gamesPlayed in sync for Payments match counts
      await refetch()
      await refetchOngoingMatches()
      if (winnerIds.length > 0) {
        setCongratsToast({
          winners: winnerIds.map(getPlayerName),
          losers: loserIds.map(getPlayerName),
        })
      }
      setSelectedMatchForWinners(null)
      setWinnerTeam('none')
    } catch (err) {
      alert(err.message)
    } finally {
      setIsEndingMatch(false)
    }
  }

  const handleCreateMatch = () => {
    setIsCreateMatchModalOpen(true)
  }

  const handleCreateMatchSubmit = async (matchData) => {
    try {
      const result = await startMatch({
        variables: {
          input: {
            sessionId: matchData.sessionId,
            courtId: matchData.courtId,
            playerIds: matchData.playerIds,
            queued: matchData.queued || false,
          }
        }
      })
      
      if (result.data.startMatch.ok) {
        await refetchOngoingMatches()
      } else {
        alert(result.data.startMatch.message)
      }
    } catch (err) {
      alert(err.message)
    }
  }

  const handleFinishPlayer = async (playerId, options = {}) => {
    try {
      const { isExempted, sessionsToRemoveFrom } = options
      
      // Remove player from sessions
      if (sessionsToRemoveFrom && sessionsToRemoveFrom.length > 0) {
        const result = await removePlayerFromSessions({
          variables: {
            playerId,
            sessionIds: sessionsToRemoveFrom,
            isExempted: Boolean(isExempted),
          }
        })
        
        if (result.data.removePlayerFromSessions.ok) {
          //console.log(`Player ${playerId} removed from ${sessionsToRemoveFrom.length} session(s)`, isExempted ? '(Exempted)' : '(Payment required)')
        } else {
          alert(result.data.removePlayerFromSessions.message)
        }
      }
    } catch (err) {
      alert(`Error finishing player: ${err.message}`)
    }
  }

  const isWaitingRoomStandalone = new URLSearchParams(window.location.search).get('waiting-room') === 'true'

  if (isWaitingRoomStandalone) {
    return <WaitingRoomPage />
  }

  const isLoading = loading
  const errorMessage = error?.message ?? ''

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 right-0 h-80 w-80 rounded-full bg-linear-to-br from-amber-300/60 to-rose-400/50 blur-2xl" />
        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-linear-to-br from-sky-400/40 to-emerald-400/30 blur-2xl" />
      </div>

      {/* Navbar */}
      <Navbar
        currentPage={currentPage}
        onNavigate={(page) => {
          if (page !== 'ongoing') {
            setFilteredSessionId(null)
          }
          setCurrentPage(page)
        }}
      />

      <div className="lg:ml-72">
        {currentPage === 'dashboard' && (
          <header className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-10 pt-20 lg:pt-10">
            
            <h1 className="text-xl font-semibold text-white md:text-2xl">
              DASHBOARD
            </h1>
            <p className="max-w-1xl text-sm text-slate-300 sm:text-base">
              C-ONE SPORT CENTER BADMINTON QUEUING
            </p>
          </header>
        )}

        <main className="mx-auto w-full max-w-6xl space-y-8 px-6 pb-14 pt-20 lg:pt-0">
        {currentPage === 'dashboard' && (
          <DashboardPage 
            sessions={sessions} 
            ongoingMatches={ongoingMatches} 
            matchQueue={matchQueue} 
            players={players}
            courts={courtsData?.courts || []}
            isLoading={isLoading}
            error={errorMessage}
            onStartSession={handleStartSession}
            onViewSession={handleViewSession}
            onEditSession={handleEditSession}
            onEndSession={handleEndSessionClick}
            onCreateSession={() => {
              setEditSession(null)
              setIsFormOpen(true)
            }}
            onNavigateToMatches={(session) => {
              setFilteredSessionId(session._id)
              setCurrentPage('ongoing')
            }}
          />
        )}
        {currentPage === 'players' && (
          <PlayersPage
            players={playersData?.players || []}
            onPlayersUpdated={() => refetchPlayers()}
            ongoingMatches={ongoingMatches}
          matchQueue={matchQueue}
          />
        )}
        {currentPage === 'ongoing' && (
          <OngoingMatchesPage
            ongoingMatches={ongoingMatches}
            matchQueue={matchQueue}
            sessions={sessions}
            players={playersData?.players || []}
            courts={courtsData?.courts || []}
            onUpdateMatch={handleUpdateOngoingMatch}
            onEndMatch={handleEndOngoingMatch}
            onCreateMatch={handleCreateMatch}
            onStartMatch={handleStartQueuedMatch}
            onEditMatch={handleEditMatch}
            onCancelMatch={handleCancelMatch}
            filteredSessionId={filteredSessionId}
            onClearFilter={() => setFilteredSessionId(null)}
            onFilterSessionChange={(sessionId) => setFilteredSessionId(sessionId)}
          />
        )}
        {currentPage === 'queued' && (
          <OngoingMatchesPage
            ongoingMatches={ongoingMatches}
            matchQueue={matchQueue}
            sessions={sessions}
            players={playersData?.players || []}
            courts={courtsData?.courts || []}
            onUpdateMatch={handleUpdateOngoingMatch}
            onEndMatch={handleEndOngoingMatch}
            onCreateMatch={handleCreateMatch}
            onStartMatch={handleStartQueuedMatch}
            onEditMatch={handleEditMatch}
            onCancelMatch={handleCancelMatch}
            filteredSessionId={filteredSessionId}
            onClearFilter={() => setFilteredSessionId(null)}
            onFilterSessionChange={(sessionId) => setFilteredSessionId(sessionId)}
          />
        )}
        {currentPage === 'payments' && (
          <PaymentsPage
            sessions={sessions}
            players={playersData?.players || []}
            ongoingMatches={ongoingMatches}
            matchQueue={matchQueue}
            games={gamesBySessionData?.gamesBySessionIds || []}
            payments={paymentsHistoryData?.paymentsHistory?.payments || []}
            onFinishPlayer={handleFinishPlayer}
            filteredSessionId={filteredSessionId}
            onFilterSessionChange={(sessionId) => setFilteredSessionId(sessionId)}
          />
        )}
        {currentPage === 'records' && (
          <RecordsPage
            onViewSession={handleViewSession}
          />
        )}
        {currentPage === 'courts' && (
          <CourtsPage />
        )}
        </main>
      </div>

      <SessionForm
        session={editSession}
        sessions={sessions}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false)
          setEditSession(null)
        }}
        onSubmit={handleCreateSession}
        isLoading={editSession ? updateLoading : createLoading}
      />

      <EditMatchForm
        match={selectedMatch}
        courts={courtsData?.courts || []}
        sessions={sessions}
        players={playersData?.players || []}
        ongoingMatches={ongoingMatches}
        matchQueue={matchQueue}
        isOpen={isEditMatchModalOpen}
        onClose={() => {
          setIsEditMatchModalOpen(false)
          setSelectedMatch(null)
        }}
        onSubmit={handleEditMatchSubmit}
        isLoading={false}
      />

      <CreateMatchForm
        sessions={sessions}
        players={players}
        isOpen={isCreateMatchModalOpen}
        onClose={() => setIsCreateMatchModalOpen(false)}
        onSubmit={handleCreateMatchSubmit}
        isLoading={false}
        ongoingMatches={ongoingMatches}
        matchQueue={matchQueue}
        currentSessionId={filteredSessionId || selectedSessionId}
      />

      {isMessageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
            <button
              onClick={() => setIsMessageModalOpen(false)}
              className="absolute right-3 top-3 text-slate-400 hover:text-white"
              type="button"
              aria-label="Close message"
            >
              ✕
            </button>
            <h3 className="mb-2 text-lg font-semibold text-white">Cannot Update Session</h3>
            <p className="mb-4 text-sm text-slate-300">{messageModalText}</p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIsMessageModalOpen(false)}
                className="rounded-full bg-emerald-500/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-200 transition hover:bg-emerald-500/30"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedMatchForWinners && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-lg bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setSelectedMatchForWinners(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-800 p-2 hover:bg-slate-700 transition"
            >
              <svg className="h-5 w-5 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="mb-4 text-xl font-semibold text-white">End Match</h2>
            <p className="mb-4 text-sm text-slate-300">Winner selection is optional for casual games.</p>

            {(() => {
              const { team1, team2 } = getTeamsForMatch(selectedMatchForWinners)

              const renderTeamCard = (teamKey, label, teamPlayers, styleClasses) => {
                const isSelected = winnerTeam === teamKey
                return (
                  <button
                    key={teamKey}
                    type="button"
                    onClick={() => setWinnerTeam(teamKey)}
                    className={`mb-4 w-full rounded-lg border p-3 text-left transition ${
                      isSelected
                        ? styleClasses.selected
                        : styleClasses.default
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">{label}</div>
                      {isSelected && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Selected</span>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {teamPlayers.length > 0 ? (
                        teamPlayers.map((playerId) => (
                          <span
                            key={playerId}
                            className={`rounded-md border px-2 py-1 text-sm transition ${
                              isSelected
                                ? 'border-emerald-300/50 bg-emerald-500/20 text-emerald-100'
                                : 'border-white/15 bg-white/5 text-white'
                            }`}
                          >
                            {getPlayerName(playerId)}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400">Unknown</span>
                      )}
                    </div>
                  </button>
                )
              }

              return (
                <div className="mb-6">
                  <button
                    type="button"
                    onClick={() => setWinnerTeam('none')}
                    className={`mb-4 w-full rounded-lg border p-3 text-left transition ${
                      winnerTeam === 'none'
                        ? 'border-emerald-300/50 bg-emerald-500/15'
                        : 'border-white/10 bg-white/5 hover:border-emerald-300/30 hover:bg-emerald-500/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-300">Casual Match</div>
                      {winnerTeam === 'none' && (
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">Selected</span>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-slate-300">No winner will be recorded.</div>
                  </button>

                  {renderTeamCard('team1', 'Team 1', team1, {
                    selected: 'border-blue-300/50 bg-blue-500/20',
                    default: 'border-white/10 bg-white/5 hover:border-blue-300/30 hover:bg-blue-500/10',
                  })}
                  {renderTeamCard('team2', 'Team 2', team2, {
                    selected: 'border-rose-300/50 bg-rose-500/20',
                    default: 'border-white/10 bg-white/5 hover:border-rose-300/30 hover:bg-rose-500/10',
                  })}
                </div>
              )
            })()}

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedMatchForWinners(null)}
                className="flex-1 rounded-lg border border-white/20 px-4 py-2 font-semibold text-white/80 transition hover:bg-white/5 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndMatch}
                disabled={recordGameLoading || isEndingMatch}
                className="flex-1 rounded-lg bg-emerald-500/20 px-4 py-2 font-semibold text-emerald-200 transition hover:bg-emerald-500/30 disabled:opacity-50"
              >
                {(recordGameLoading || isEndingMatch) ? 'Recording...' : 'End Match'}
              </button>
            </div>
          </div>
        </div>
      )}

      {congratsToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="relative w-full max-w-2xl rounded-2xl border border-emerald-400/20 bg-slate-900/95 p-10 text-center shadow-2xl">
            <button
              onClick={() => setCongratsToast(null)}
              className="absolute right-4 top-4 rounded-full bg-slate-800 p-2 hover:bg-slate-700 transition"
            >
              <svg className="h-5 w-5 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="mb-4 text-4xl sm:text-5xl">🎉</div>
            <div className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 sm:text-sm">Congratulations</div>
            <div className="mt-4 text-2xl font-semibold text-white sm:text-3xl">
              {congratsToast.winners.join(' & ')}
            </div>
            <div className="mt-6 text-xs uppercase tracking-[0.3em] text-slate-400 sm:text-sm">Defeated</div>
            <div className="mt-2 text-lg font-semibold text-slate-300 sm:text-xl">
              {congratsToast.losers.join(' & ')}
            </div>
            <button
              onClick={() => setCongratsToast(null)}
              className="mt-8 w-full rounded-lg bg-emerald-500/30 px-4 py-3 text-base font-semibold text-emerald-100 transition hover:bg-emerald-500/40 sm:text-lg"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {showEndConfirm && endSessionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-lg bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowEndConfirm(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-800 p-2 hover:bg-slate-700 transition"
            >
              <svg className="h-5 w-5 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="mb-4 text-xl font-bold text-white">End Session?</h2>
            <p className="mb-6 text-sm text-slate-300">
              Are you sure you want to end the session "{endSessionTarget.name}"? This will close the session and prevent further matches from being recorded.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 rounded-lg border border-slate-500 px-4 py-2 font-semibold text-slate-200 transition hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndSession}
                disabled={endSessionLoading}
                className="flex-1 rounded-lg bg-rose-500/30 px-4 py-2 font-semibold text-rose-200 transition hover:bg-rose-500/40 disabled:opacity-50"
              >
                {endSessionLoading ? 'Ending...' : 'End Session'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndBlocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="relative w-full max-w-md rounded-lg bg-slate-900 p-6 shadow-2xl">
            <button
              onClick={() => setShowEndBlocked(false)}
              className="absolute right-4 top-4 rounded-full bg-slate-800 p-2 hover:bg-slate-700 transition"
            >
              <svg className="h-5 w-5 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="mb-4 text-xl font-bold text-white uppercase">Cannot End Session</h2>
            <p className="mb-6 text-sm text-slate-300">
              There are ongoing or queued matches. Please finish or clear them before ending this session.
            </p>

            <button
              onClick={() => setShowEndBlocked(false)}
              className="w-full rounded-lg bg-slate-800 px-4 py-2 font-semibold text-slate-200 transition hover:bg-slate-700"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSessionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-8 overflow-auto">
          <div className="relative w-full max-w-4xl my-auto rounded-lg bg-slate-900 shadow-2xl">
            <button
              onClick={() => setSelectedSessionId(null)}
              className="absolute top-4 right-4 z-10 rounded-full bg-slate-800 hover:bg-slate-700 p-2 transition"
            >
              <svg className="h-6 w-6 text-slate-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="p-6">
              <SessionDetailPage 
                sessionId={selectedSessionId}
                onClose={() => setSelectedSessionId(null)}
                ongoingMatches={Object.values(ongoingMatches).flat() || []}
                setOngoingMatches={(matches) => setOngoingMatches(prev => ({ ...prev, [selectedSessionId]: matches }))}
                matchQueue={matchQueue[selectedSessionId] || []}
                setMatchQueue={(queue) => setMatchQueue(prev => ({ ...prev, [selectedSessionId]: queue }))}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
