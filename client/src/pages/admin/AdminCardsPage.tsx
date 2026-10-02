import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '@/features/admin/api/admin.api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { LoadingScreen } from '@/components/common/LoadingScreen'
import { toast } from '@/stores/toastStore'
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Search,
  User,
  RefreshCw,
  Download,
  Copy,
  ExternalLink,
  ShieldCheck,
  Ban,
  Power,
  X,
  Clock,
  FileSpreadsheet,
} from 'lucide-react'

const CARD_STATE_COLORS: Record<string, string> = {
  UNASSIGNED: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  INACTIVE: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
  BLOCKED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  RESERVED: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
  LOST: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
  REPLACED: 'bg-neutral-500/20 text-neutral-400 border border-neutral-500/30',
}

export default function AdminCardsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = React.useState<'inventory' | 'generate'>('inventory')

  // Inventory filter state
  const [searchCard, setSearchCard] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState('')
  const [currentPage, setCurrentPage] = React.useState(1)

  // Card Generation state
  const [generateCount, setGenerateCount] = React.useState(1)
  const [material, setMaterial] = React.useState<'pvc' | 'metal' | 'bamboo' | 'wooden' | 'metallic'>('pvc')
  const [generationNotes, setGenerationNotes] = React.useState('')
  const [generatedBatch, setGeneratedBatch] = React.useState<{
    count: number
    cards: Array<{ cardId: string; url: string; edition: string; status: string; activationCode?: string }>
    csv: string
  } | null>(null)

  // Modals state
  const [selectedCardCode, setSelectedCardCode] = React.useState<string | null>(null)
  const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false)
  const [isAssignModalOpen, setIsAssignModalOpen] = React.useState(false)

  // User search for assign
  const [userSearchQuery, setUserSearchQuery] = React.useState('')
  const [selectedTargetUser, setSelectedTargetUser] = React.useState<any | null>(null)

  // Query: Card List
  const { data: cardsData, isLoading: cardsLoading } = useQuery({
    queryKey: ['admin-cards', searchCard, statusFilter, currentPage],
    queryFn: () =>
      adminApi.listCards({
        search: searchCard || undefined,
        status: statusFilter || undefined,
        page: currentPage,
        limit: 25,
      }),
  })

  // Query: Selected Card Details
  const { data: cardDetailsData, isLoading: cardDetailsLoading } = useQuery({
    queryKey: ['admin-card-details', selectedCardCode],
    queryFn: () => adminApi.getCardDetails(selectedCardCode!),
    enabled: !!selectedCardCode && isDetailsModalOpen,
  })

  // Query: User Search for Assignment
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-search-users', userSearchQuery],
    queryFn: () => adminApi.listUsers({ q: userSearchQuery, limit: 10 }),
    enabled: isAssignModalOpen && userSearchQuery.trim().length > 1,
  })

  const cards = cardsData?.data?.cards || []
  const total = cardsData?.data?.total || 0
  const stats = cardsData?.data?.stats || {
    total: 0,
    active: 0,
    unassigned: 0,
    inactive: 0,
    blocked: 0,
  }

  // Mutation: Generate Cards
  const generateCardsMutation = useMutation({
    mutationFn: () =>
      adminApi.generateCards({
        count: generateCount,
        material,
        notes: generationNotes,
      }),
    onSuccess: (res) => {
      toast.success(`Successfully generated ${res.data.count} physical card records!`)
      setGeneratedBatch(res.data)
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to generate cards')
    },
  })

  // Mutation: Assign Card
  const assignCardMutation = useMutation({
    mutationFn: ({ cardCode, userId }: { cardCode: string; userId: string }) =>
      adminApi.assignCard(cardCode, { userId }),
    onSuccess: () => {
      toast.success('Card successfully assigned and activated!')
      setIsAssignModalOpen(false)
      setSelectedTargetUser(null)
      setUserSearchQuery('')
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] })
      queryClient.invalidateQueries({ queryKey: ['admin-card-details', selectedCardCode] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to assign card')
    },
  })

  // Mutation: Unassign Card
  const unassignCardMutation = useMutation({
    mutationFn: (cardCode: string) => adminApi.unassignCard(cardCode),
    onSuccess: () => {
      toast.success('Card unassigned. Permanent owner reservation remains intact.')
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] })
      queryClient.invalidateQueries({ queryKey: ['admin-card-details', selectedCardCode] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to unassign card')
    },
  })

  // Mutation: Update Card State (Activate, Deactivate, Block)
  const updateStateMutation = useMutation({
    mutationFn: ({ cardCode, state, reason }: { cardCode: string; state: string; reason?: string }) =>
      adminApi.updateCardState(cardCode, { state, reason }),
    onSuccess: (_, vars) => {
      toast.success(`Card state changed to ${vars.state}`)
      queryClient.invalidateQueries({ queryKey: ['admin-cards'] })
      queryClient.invalidateQueries({ queryKey: ['admin-card-details', selectedCardCode] })
    },
    onError: (err: unknown) => {
      const apiErr = err as { message?: string }
      toast.error(apiErr.message || 'Failed to update card state')
    },
  })

  // Copy helper
  const copyToClipboard = (text: string, label = 'Copied to clipboard!') => {
    navigator.clipboard.writeText(text)
    toast.success(label)
  }

  // Export CSV Helper for generated batch or inventory
  const downloadCsv = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const exportCurrentInventoryCsv = () => {
    if (!cards || cards.length === 0) {
      toast.error('No card records to export.')
      return
    }
    const rows = ['cardId,url,edition,status,assignedUser,createdAt']
    for (const c of cards) {
      const user = c.currentOwner ? c.currentOwner.email : 'UNASSIGNED'
      rows.push(`"${c.cardId}","${c.url}","${c.edition}","${c.status}","${user}","${new Date(c.createdAt).toISOString()}"`)
    }
    downloadCsv(rows.join('\n'), `onewinq-cards-inventory-${Date.now()}.csv`)
    toast.success('Inventory exported as CSV')
  }

  const activeDetailsCard = cardDetailsData?.data?.card
  const auditLogs = cardDetailsData?.data?.auditLogs || []

  return (
    <div className="space-y-6 text-left max-w-6xl">
      {/* Page Title & Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white">NFC Card Management</h1>
          <p className="text-xs text-white/60">
            Generate, assign, track, and manage physical OneWinq NFC cards and unique URLs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={exportCurrentInventoryCsv}
            className="border-white/15 bg-white/5 text-white hover:bg-white/10 flex-1 sm:flex-initial"
            leftIcon={<Download className="h-3.5 w-3.5 shrink-0" />}
          >
            Export Inventory CSV
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveTab('generate')}
            className="flex-1 sm:flex-initial"
            leftIcon={<Plus className="h-4 w-4 shrink-0" />}
          >
            Generate Cards
          </Button>
        </div>
      </div>

      {/* Real-time Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
          <div className="text-[11px] text-white/50">Total Cards</div>
          <div className="text-2xl font-extrabold text-white">{stats.total}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
          <div className="text-[11px] text-emerald-400/80">Active Cards</div>
          <div className="text-2xl font-extrabold text-emerald-400">{stats.active}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
          <div className="text-[11px] text-purple-300">Unassigned</div>
          <div className="text-2xl font-extrabold text-purple-300">{stats.unassigned}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
          <div className="text-[11px] text-amber-400">Inactive</div>
          <div className="text-2xl font-extrabold text-amber-400">{stats.inactive}</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#14141c] border border-white/10 space-y-1">
          <div className="text-[11px] text-rose-400">Blocked</div>
          <div className="text-2xl font-extrabold text-rose-400">{stats.blocked}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/10 pb-0">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'border-primary text-primary'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          <span>Card Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab('generate')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all -mb-px flex items-center gap-2 ${
            activeTab === 'generate'
              ? 'border-primary text-primary'
              : 'border-transparent text-white/50 hover:text-white'
          }`}
        >
          <Plus className="h-4 w-4" />
          <span>Generate Cards</span>
        </button>
      </div>

      {/* TAB: Card Inventory */}
      {activeTab === 'inventory' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={searchCard}
                onChange={(e) => {
                  setSearchCard(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Search by Card ID (OWQ-CARD-...) or assigned user name/email..."
                className="w-full bg-[#14141c] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="bg-[#14141c] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Statuses</option>
              {['UNASSIGNED', 'ACTIVE', 'INACTIVE', 'BLOCKED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-cards'] })}
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
              leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Refresh
            </Button>
          </div>

          {/* Cards Inventory Table */}
          {cardsLoading ? (
            <LoadingScreen message="Loading card records..." />
          ) : (
            <div className="rounded-3xl border border-white/10 bg-[#14141c] overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/60 font-medium">{total} physical cards found</span>
                <span className="text-[11px] text-white/40">Page {currentPage}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-white/5 text-white/60 uppercase text-[10px] tracking-wider border-b border-white/10">
                    <tr>
                      <th className="p-4">Card ID & URL</th>
                      <th className="p-4">Material</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Assigned User</th>
                      <th className="p-4">Created</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {cards.map((card: any) => (
                      <tr key={card.id} className="hover:bg-white/5 transition-colors">
                        {/* Card ID & URL */}
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-white text-[12px]">
                            <span>{card.cardId}</span>
                            <button
                              onClick={() => copyToClipboard(card.url, `URL for ${card.cardId} copied!`)}
                              title="Copy URL"
                              className="text-white/40 hover:text-white transition-colors"
                            >
                              <Copy className="h-3 w-3" />
                            </button>
                            <a
                              href={card.url}
                              target="_blank"
                              rel="noreferrer"
                              title="Open URL"
                              className="text-white/40 hover:text-white transition-colors"
                            >
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                          <div className="text-[10px] text-white/40 font-mono truncate max-w-xs">{card.url}</div>
                        </td>

                        {/* Material */}
                        <td className="p-4 text-white/70 uppercase font-medium">{card.edition}</td>

                        {/* Status */}
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              CARD_STATE_COLORS[card.status] || 'bg-white/10 text-white/60'
                            }`}
                          >
                            {card.status}
                          </span>
                        </td>

                        {/* Assigned User */}
                        <td className="p-4">
                          {card.currentOwner ? (
                            <div>
                              <div className="font-semibold text-white">{card.currentOwner.displayName}</div>
                              <div className="text-[11px] text-white/50">{card.currentOwner.email}</div>
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-white/5 text-white/40">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Created At */}
                        <td className="p-4 text-white/40">{new Date(card.createdAt).toLocaleDateString()}</td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs text-white/80 hover:text-white hover:bg-white/10"
                              onClick={() => {
                                setSelectedCardCode(card.cardId)
                                setIsDetailsModalOpen(true)
                              }}
                            >
                              Details
                            </Button>

                            {/* Assign button if unassigned */}
                            {(!card.currentOwner || card.status === 'UNASSIGNED') && (
                              <Button
                                size="sm"
                                className="text-xs"
                                onClick={() => {
                                  setSelectedCardCode(card.cardId)
                                  setSelectedTargetUser(null)
                                  setUserSearchQuery('')
                                  setIsAssignModalOpen(true)
                                }}
                              >
                                Assign
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}

                    {cards.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-white/40">
                          No cards found matching your search or filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              {total > 25 && (
                <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {currentPage} of {Math.ceil(total / 25)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage * 25 >= total}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB: Generate Cards */}
      {activeTab === 'generate' && (
        <div className="p-8 rounded-3xl border border-white/10 bg-[#14141c] space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              <span>Generate Physical NFC Cards</span>
            </h2>
            <p className="text-xs text-white/60 mt-1">
              Generate sequential unique Card IDs (e.g. OWQ-CARD-000001) and public URLs. Generated records can be exported directly to CSV for factory flashing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 max-w-md">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-white">Card Material / Edition</label>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as any)}
                  className="w-full rounded-xl border border-white/10 bg-[#1e1e28] p-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="pvc">PVC — Standard Durable Card</option>
                  <option value="metal">Metal — Matte Obsidian Card</option>
                  <option value="bamboo">Bamboo / Wood — Eco Sustainable Card</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white">Quantity (1 to 5000)</label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={generateCount}
                    onChange={(e) => setGenerateCount(Math.max(1, Math.min(5000, Number(e.target.value))))}
                    min={1}
                    max={5000}
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <div className="flex gap-1.5">
                    {[1, 10, 50, 100].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setGenerateCount(preset)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
                          generateCount === preset
                            ? 'bg-primary text-white'
                            : 'bg-white/5 text-white/60 hover:bg-white/10'
                        }`}
                      >
                        +{preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-white">Batch Notes (Optional)</label>
                <Input
                  value={generationNotes}
                  onChange={(e) => setGenerationNotes(e.target.value)}
                  placeholder="e.g. Q3 Mumbai Production Run"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>

              <Button
                isLoading={generateCardsMutation.isPending}
                disabled={generateCount < 1}
                onClick={() => generateCardsMutation.mutate()}
                leftIcon={<Plus className="h-4 w-4" />}
                className="w-full"
              >
                Generate {generateCount} Physical {generateCount === 1 ? 'Card' : 'Cards'}
              </Button>
            </div>

            {/* Information panel */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3 text-xs text-white/70">
              <div className="font-bold text-white flex items-center gap-1.5">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
                <span>Export Format for Physical Card Process</span>
              </div>
              <p>
                Each physical NFC card is provisioned with a globally unique Card ID and public resolution URL:
              </p>
              <div className="p-3 rounded-xl bg-black/40 font-mono text-[11px] text-white/80 space-y-1 overflow-x-auto scrollbar-thin">
                <div className="whitespace-nowrap text-white/60">cardId,url</div>
                <div className="text-primary whitespace-nowrap">OWQ-CARD-000001,https://onewinq.com/p/c/OWQ-CARD-000001</div>
                <div className="text-primary whitespace-nowrap">OWQ-CARD-000002,https://onewinq.com/p/c/OWQ-CARD-000002</div>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                The external card factory programs the generated URLs onto the physical NFC chips. When a user or client taps the card, OneWinq resolves the card ID and opens the assigned user's live profile.
              </p>
            </div>
          </div>

          {/* Generated Result Banner & CSV Download */}
          {generatedBatch && (
            <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span className="font-bold text-sm">
                    {generatedBatch.count} {generatedBatch.count === 1 ? 'Card' : 'Cards'} Generated Successfully!
                  </span>
                </div>

                <Button
                  size="sm"
                  onClick={() =>
                    downloadCsv(
                      generatedBatch.csv,
                      `onewinq-cards-${generatedBatch.cards[0]?.cardId}-to-${generatedBatch.cards[generatedBatch.cards.length - 1]?.cardId}.csv`
                    )
                  }
                  className="bg-emerald-600 hover:bg-emerald-500 text-white w-full sm:w-auto h-auto py-2 px-3 text-xs"
                  leftIcon={<Download className="h-4 w-4 shrink-0" />}
                >
                  Download CSV
                </Button>
              </div>

              {/* Preview List */}
              <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/40 p-2 text-xs font-mono space-y-1.5 scrollbar-thin">
                {generatedBatch.cards.map((c) => (
                  <div
                    key={c.cardId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 hover:bg-white/5 rounded-lg border border-white/5 bg-white/[0.02]"
                  >
                    <div className="flex items-center justify-between sm:justify-start gap-2 flex-wrap">
                      <span className="text-white font-bold tracking-wide">{c.cardId}</span>
                      {c.activationCode && (
                        <div className="flex items-center gap-1.5 bg-purple-500/20 px-2 py-0.5 rounded border border-purple-500/30">
                          <span className="text-[10px] text-purple-300">Code:</span>
                          <span className="text-white font-mono font-bold text-xs">{c.activationCode}</span>
                          <button
                            onClick={() => copyToClipboard(c.activationCode!, `Copied ${c.cardId} activation code`)}
                            className="text-purple-300 hover:text-white p-0.5 transition-colors"
                            title="Copy activation code"
                          >
                            <Copy className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-0 justify-between sm:justify-end">
                      <span className="text-white/50 truncate text-[11px] font-mono">{c.url}</span>
                      <button
                        onClick={() => copyToClipboard(c.url, `Copied ${c.cardId} URL`)}
                        className="text-white/40 hover:text-white p-1 rounded hover:bg-white/5 shrink-0 transition-colors"
                        title="Copy URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Card Details */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-3xl border border-white/15 bg-[#14141c] p-6 text-white space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  <span>Card Details — {selectedCardCode}</span>
                </h3>
                <p className="text-xs text-white/50">Complete card lifecycle, ownership, and audit trail.</p>
              </div>
              <button
                onClick={() => setIsDetailsModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cardDetailsLoading || !activeDetailsCard ? (
              <LoadingScreen message="Loading card details..." />
            ) : (
              <div className="space-y-6 text-xs">
                {/* Specs Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <span className="text-white/40 block text-[10px] uppercase font-bold">Card ID</span>
                    <span className="font-mono font-bold text-white text-sm">{activeDetailsCard.cardId}</span>
                  </div>

                  <div>
                    <span className="text-white/40 block text-[10px] uppercase font-bold">Status</span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        CARD_STATE_COLORS[activeDetailsCard.status] || 'bg-white/10 text-white/60'
                      }`}
                    >
                      {activeDetailsCard.status}
                    </span>
                  </div>

                  <div>
                    <span className="text-white/40 block text-[10px] uppercase font-bold">Material</span>
                    <span className="font-medium text-white capitalize">{activeDetailsCard.edition}</span>
                  </div>

                  <div>
                    <span className="text-white/40 block text-[10px] uppercase font-bold">Created Date</span>
                    <span className="text-white/70">{new Date(activeDetailsCard.createdAt).toLocaleString()}</span>
                  </div>

                  <div>
                    <span className="text-white/40 block text-[10px] uppercase font-bold">Assigned Date</span>
                    <span className="text-white/70">
                      {activeDetailsCard.assignedAt
                        ? new Date(activeDetailsCard.assignedAt).toLocaleString()
                        : 'Not assigned yet'}
                    </span>
                  </div>
                </div>

                {/* Public URL Box */}
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                  <div className="space-y-0.5 truncate">
                    <span className="text-[10px] text-white/40 uppercase font-bold block">Public Card URL</span>
                    <span className="font-mono text-white text-xs truncate block">{activeDetailsCard.url}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(activeDetailsCard.url, 'Card URL copied!')}
                      className="text-white/70 hover:text-white"
                      leftIcon={<Copy className="h-3 w-3" />}
                    >
                      Copy
                    </Button>
                    <a href={activeDetailsCard.url} target="_blank" rel="noreferrer">
                      <Button variant="ghost" size="sm" className="text-white/70 hover:text-white">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                  </div>
                </div>

                {/* Secret Activation Code Box */}
                {activeDetailsCard.activationCode && (
                  <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-purple-300 uppercase font-bold block">
                        Secret Activation Code (for card packaging / invoice)
                      </span>
                      <span className="font-mono text-white text-sm font-extrabold tracking-wider block">
                        {activeDetailsCard.activationCode}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(activeDetailsCard.activationCode, 'Activation code copied!')}
                      className="text-purple-300 hover:text-white hover:bg-purple-500/20 shrink-0"
                      leftIcon={<Copy className="h-3 w-3" />}
                    >
                      Copy Code
                    </Button>
                  </div>
                )}

                {/* Assigned User Information */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                  <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center justify-between">
                    <span>Current Assigned User</span>
                    {activeDetailsCard.currentOwner && (
                      <span className="text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Assigned
                      </span>
                    )}
                  </div>
                  {activeDetailsCard.currentOwner ? (
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <div className="text-sm font-bold text-white">{activeDetailsCard.currentOwner.displayName}</div>
                        <div className="text-white/50 text-xs">
                          @{activeDetailsCard.currentOwner.username} • {activeDetailsCard.currentOwner.email}
                        </div>
                      </div>
                      <Button
                        variant="destructive"
                        size="sm"
                        isLoading={unassignCardMutation.isPending}
                        onClick={() => unassignCardMutation.mutate(activeDetailsCard.cardId)}
                      >
                        Unassign Card
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-white/40">This card is currently unassigned.</span>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedTargetUser(null)
                          setUserSearchQuery('')
                          setIsAssignModalOpen(true)
                        }}
                      >
                        Assign to User
                      </Button>
                    </div>
                  )}
                </div>



                {/* Audit Logs Trail */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    <span>Card Audit History</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1.5 rounded-xl border border-white/10 bg-black/40 p-2">
                    {auditLogs.length > 0 ? (
                      auditLogs.map((log: any) => (
                        <div key={log.id} className="flex items-center justify-between text-[11px] px-2 py-1 border-b border-white/5">
                          <span className="font-semibold text-white/80">{log.action}</span>
                          <span className="text-white/40">{new Date(log.createdAt).toLocaleString()}</span>
                          <span className="text-primary">{log.performedBy}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-white/40 text-xs">No audit logs recorded for this card.</div>
                    )}
                  </div>
                </div>

                {/* Modal Footer Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    {activeDetailsCard.status === 'ACTIVE' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={updateStateMutation.isPending}
                        onClick={() =>
                          updateStateMutation.mutate({
                            cardCode: activeDetailsCard.cardId,
                            state: 'INACTIVE',
                            reason: 'Deactivated by admin',
                          })
                        }
                        className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10"
                        leftIcon={<Power className="h-3.5 w-3.5" />}
                      >
                        Deactivate Card
                      </Button>
                    ) : activeDetailsCard.status === 'INACTIVE' ? (
                      <Button
                        size="sm"
                        isLoading={updateStateMutation.isPending}
                        onClick={() =>
                          updateStateMutation.mutate({
                            cardCode: activeDetailsCard.cardId,
                            state: 'ACTIVE',
                            reason: 'Activated by admin',
                          })
                        }
                        leftIcon={<ShieldCheck className="h-3.5 w-3.5" />}
                      >
                        Activate Card
                      </Button>
                    ) : null}

                    {activeDetailsCard.status === 'BLOCKED' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={updateStateMutation.isPending}
                        onClick={() =>
                          updateStateMutation.mutate({
                            cardCode: activeDetailsCard.cardId,
                            state: activeDetailsCard.currentOwner ? 'ACTIVE' : 'UNASSIGNED',
                            reason: 'Unblocked by admin',
                          })
                        }
                      >
                        Unblock Card
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        isLoading={updateStateMutation.isPending}
                        onClick={() =>
                          updateStateMutation.mutate({
                            cardCode: activeDetailsCard.cardId,
                            state: 'BLOCKED',
                            reason: 'Blocked by admin',
                          })
                        }
                        className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                        leftIcon={<Ban className="h-3.5 w-3.5" />}
                      >
                        Block Card
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Assign Card */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#14141c] p-6 text-white space-y-5 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>Assign Card to User</span>
                </h3>
                <p className="text-xs text-white/50">Card: {selectedCardCode}</p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="text-white/40 hover:text-white p-1 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-white/80">Search User by Name, Username or Email</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <Input
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Type at least 2 characters..."
                  className="bg-white/5 border-white/10 text-white pl-9 text-xs"
                />
              </div>

              {/* User search results */}
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl border border-white/10 bg-black/30 p-2">
                {usersLoading ? (
                  <div className="text-xs text-white/50 text-center py-4">Searching users...</div>
                ) : (usersData?.data?.users || []).length > 0 ? (
                  (usersData?.data?.users || []).map((u: any) => {
                    const uId = u.id || u._id
                    const isSelected = (selectedTargetUser?.id || selectedTargetUser?._id) === uId
                    return (
                      <div
                        key={uId}
                        onClick={() => setSelectedTargetUser(u)}
                        className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between text-xs ${
                          isSelected
                            ? 'bg-primary/25 border border-primary/40 text-white'
                            : 'hover:bg-white/5 text-white/80'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-white">{u.displayName}</div>
                          <div className="text-[11px] text-white/50">
                            @{u.username} • {u.email}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                      </div>
                    )
                  })
                ) : (
                  <div className="text-xs text-white/40 text-center py-4">
                    {userSearchQuery.trim().length < 2
                      ? 'Search by typing user name or email'
                      : 'No users found matching query'}
                  </div>
                )}
              </div>

              {selectedTargetUser && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  Ready to assign card <strong>{selectedCardCode}</strong> to{' '}
                  <strong>{selectedTargetUser.displayName}</strong> ({selectedTargetUser.email}).
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
              <Button variant="ghost" size="sm" onClick={() => setIsAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!selectedTargetUser || !selectedCardCode}
                isLoading={assignCardMutation.isPending}
                onClick={() => {
                  const targetId = selectedTargetUser?.id || selectedTargetUser?._id
                  if (targetId && selectedCardCode) {
                    assignCardMutation.mutate({
                      cardCode: selectedCardCode,
                      userId: String(targetId),
                    })
                  }
                }}
              >
                Confirm Assignment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
