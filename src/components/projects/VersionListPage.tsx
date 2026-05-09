'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronRight, ChevronLeft, GitBranch, Settings, Pencil, FileDown, Link2, Check } from 'lucide-react'
import { Project, ProjectVersion } from '@/types'
import { getProjects, updateProject, getVersions, createVersion, updateVersion, deleteVersion } from '@/lib/db'
import { getVersionIdsWithData, getVersionsFixStats, VersionFixStats } from '@/lib/versionData'
import { useAppStore } from '@/store'
import dynamic from 'next/dynamic'
import RoleBadge from '@/components/role/RoleBadge'

const ReportModal = dynamic(() => import('@/components/shared/ReportModal'), { ssr: false })

const T = {
  paper:    '#F7F4EE',
  warm:     '#EDE9E1',
  charcoal: '#252525',
  ink:      '#3D3A36',
  mist:     '#8A8680',
  smoke:    '#D7D5D1',
  border:   '#E5E2DC',
  red:      '#B85C5C',
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

export default function VersionListPage({ projectId }: { projectId: string }) {
  const router = useRouter()
  const {
    setShowAIConfigModal, showReportModal, setShowReportModal,
    switchVersion, role,
  } = useAppStore()
  const isReviewer = role === 'reviewer'
  const [project, setProject] = useState<Project | null>(null)
  const [versions, setVersions] = useState<ProjectVersion[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [fixStats, setFixStats] = useState<Record<string, VersionFixStats>>({})
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const newInputRef = useRef<HTMLInputElement>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  async function loadVersions() {
    const all = await getVersions(projectId)
    let displayed = all
    if (role === 'developer') {
      const withData = await getVersionIdsWithData(all.map(v => v.id))
      displayed = all.filter(v => withData.has(v.id))
    }
    setVersions(displayed)
    const stats = await getVersionsFixStats(displayed.map(v => v.id))
    setFixStats(stats)
  }

  useEffect(() => {
    getProjects().then(list => setProject(list.find(p => p.id === projectId) ?? null))
    loadVersions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, role])

  useEffect(() => {
    switchVersion(null)
  }, [switchVersion])

  useEffect(() => {
    if (creating) newInputRef.current?.focus()
  }, [creating])

  useEffect(() => {
    if (editingId) editInputRef.current?.focus()
  }, [editingId])

  function clearVersionState() {
    switchVersion(null)
  }

  function getVersionEntryUrl(versionId: string) {
    // Always go to workbench — it will load data from Supabase and redirect to
    // the upload page only if the version truly has no data yet.
    return `/project/${projectId}/version/${versionId}/workbench`
  }

  function handleCopyLink(versionId: string) {
    const url = `${window.location.origin}/project/${projectId}/version/${versionId}/workbench`
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(versionId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  async function handleCreate() {
    const name = newName.trim() || `版本 ${versions.length + 1}`
    const version: ProjectVersion = {
      id: genId(),
      projectId,
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    await createVersion(version)
    if (project) await updateProject({ ...project, updatedAt: Date.now() })
    setCreating(false)
    setNewName('')
    // New version has no data yet — go directly to the upload page
    router.push(`/project/${projectId}/version/${version.id}`)
  }

  async function handleRename(version: ProjectVersion) {
    const name = editingName.trim() || version.name
    await updateVersion({ ...version, name, updatedAt: Date.now() })
    await loadVersions()
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await deleteVersion(id)
    await loadVersions()
    setDeleteConfirmId(null)
  }

  return (
    <>
    {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: T.paper }}>
      {/* Header */}
      <header
        className="shrink-0 flex items-center justify-between px-10"
        style={{ height: 56, borderBottom: `1px solid ${T.border}` }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center" style={{ width: 28, height: 28, background: T.charcoal, borderRadius: 6 }}>
            <span style={{ color: T.paper, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>DI</span>
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: T.charcoal, letterSpacing: '-0.01em' }}>设计走查</span>
          <span style={{ fontSize: 11, color: T.mist, marginLeft: 2 }}>v1.1</span>
        </div>
        <div className="flex items-center gap-3">
          <RoleBadge />
          <button
            onClick={() => setShowAIConfigModal(true)}
            className="flex items-center gap-1.5 transition-colors duration-150"
            style={{ fontSize: 12, color: T.mist }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
          >
            <Settings size={13} strokeWidth={1.5} />
            AI 配置
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-10 py-10" style={{ maxWidth: 900, width: '100%', margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div className="flex items-center gap-2" style={{ marginBottom: 28 }}>
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 transition-colors duration-150"
            style={{ fontSize: 12, color: T.mist, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
          >
            <ChevronLeft size={13} strokeWidth={1.5} />
            项目列表
          </button>
          <span style={{ fontSize: 12, color: T.smoke }}>/</span>
          <span style={{ fontSize: 12, color: T.charcoal, fontWeight: 500 }}>{project?.name ?? '…'}</span>
        </div>

        {/* Page title + action */}
        <div className="flex items-end justify-between" style={{ marginBottom: 32 }}>
          <div style={{ borderLeft: `3px solid #D9C8A0`, paddingLeft: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: T.charcoal, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              {project?.name ?? '项目版本'}
            </h1>
            <p style={{ fontSize: 13, color: T.mist, marginTop: 4, lineHeight: 1.7 }}>
              管理验收功能，开始走查
            </p>
          </div>
          {isReviewer && (
            <button
              onClick={() => { setCreating(true); setNewName('') }}
              className="flex items-center gap-2 transition-colors duration-150"
              style={{
                fontSize: 13, fontWeight: 500,
                color: T.paper, background: T.charcoal,
                border: 'none', borderRadius: 8,
                padding: '9px 18px', cursor: 'pointer',
              }}
              onMouseOver={e => (e.currentTarget.style.background = T.ink)}
              onMouseOut={e => (e.currentTarget.style.background = T.charcoal)}
            >
              <Plus size={14} strokeWidth={2} />
              新建验收
            </button>
          )}
        </div>

        {/* New version input */}
        {creating && (
          <div
            className="flex items-center gap-3"
            style={{
              background: T.warm, border: `1px solid #D9C8A0`,
              borderRadius: 10, padding: '14px 18px', marginBottom: 12,
            }}
          >
            <GitBranch size={15} strokeWidth={1.5} style={{ color: T.mist, flexShrink: 0 }} />
            <input
              ref={newInputRef}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate()
                if (e.key === 'Escape') { setCreating(false); setNewName('') }
              }}
              placeholder={`版本 ${versions.length + 1}`}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                fontSize: 13, color: T.charcoal,
              }}
            />
            <button
              onClick={handleCreate}
              style={{
                fontSize: 12, fontWeight: 500, color: T.paper,
                background: T.charcoal, border: 'none', borderRadius: 6,
                padding: '5px 14px', cursor: 'pointer', flexShrink: 0,
              }}
            >
              创建
            </button>
            <button
              onClick={() => { setCreating(false); setNewName('') }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 4 }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Version list */}
        {versions.length === 0 && !creating ? (
          <div
            className="flex flex-col items-center justify-center gap-4"
            style={{ paddingTop: 80, paddingBottom: 80 }}
          >
            <GitBranch size={36} strokeWidth={1} style={{ color: T.smoke }} />
            <p style={{ fontSize: 13, color: T.mist }}>还没有验收，点击「新建验收」开始</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {versions.map((version) => (
              <div
                key={version.id}
                style={{
                  background: T.warm,
                  border: `1px solid ${T.border}`,
                  borderRadius: 10,
                  padding: '16px 20px',
                }}
              >
                {deleteConfirmId === version.id ? (
                  <div className="flex items-center justify-between">
                    <p style={{ fontSize: 13, color: T.charcoal }}>
                      确认删除「{version.name}」？
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        style={{ fontSize: 12, color: T.mist, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 14px', cursor: 'pointer' }}
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleDelete(version.id)}
                        style={{ fontSize: 12, fontWeight: 500, color: '#fff', background: T.red, border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer' }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ) : editingId === version.id ? (
                  <div className="flex items-center gap-3">
                    <input
                      ref={editInputRef}
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleRename(version)
                        if (e.key === 'Escape') setEditingId(null)
                      }}
                      onBlur={() => handleRename(version)}
                      style={{
                        flex: 1, fontSize: 14, fontWeight: 500, color: T.charcoal,
                        background: T.paper, border: `1px solid #D9C8A0`,
                        borderRadius: 6, padding: '4px 10px', outline: 'none',
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0" style={{ cursor: 'pointer' }} onClick={() => router.push(getVersionEntryUrl(version.id))}>
                      <p style={{ fontSize: 14, fontWeight: 500, color: T.charcoal }}>
                        {version.name}
                      </p>
                      <p style={{ fontSize: 12, color: T.mist, marginTop: 2 }}>
                        创建于 {formatDate(version.createdAt)}
                      </p>
                      {/* Fix status summary */}
                      {fixStats[version.id] && fixStats[version.id].total > 0 && (() => {
                        const s = fixStats[version.id]
                        return (
                          <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
                            {s.pending > 0 && (
                              <span style={{ fontSize: 11, color: '#B85C5C', background: '#FEF0EF', borderRadius: 4, padding: '1px 7px' }}>
                                待修复 {s.pending}
                              </span>
                            )}
                            {s.fixing > 0 && (
                              <span style={{ fontSize: 11, color: '#C07828', background: '#FEF6E7', borderRadius: 4, padding: '1px 7px' }}>
                                修复中 {s.fixing}
                              </span>
                            )}
                            {s.fixed > 0 && (
                              <span style={{ fontSize: 11, color: '#4A7C59', background: '#EDF6EF', borderRadius: 4, padding: '1px 7px' }}>
                                已修复 {s.fixed}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleCopyLink(version.id) }}
                        title="复制链接"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: copiedId === version.id ? '#4A7C59' : T.mist, padding: 6, borderRadius: 6 }}
                        onMouseOver={e => { if (copiedId !== version.id) e.currentTarget.style.color = T.charcoal }}
                        onMouseOut={e => { if (copiedId !== version.id) e.currentTarget.style.color = T.mist }}
                      >
                        {copiedId === version.id ? <Check size={13} strokeWidth={2} /> : <Link2 size={13} strokeWidth={1.5} />}
                      </button>
                      {isReviewer && (
                        <button
                          onClick={e => { e.stopPropagation(); setShowReportModal(true) }}
                          title="导出报告"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 6, borderRadius: 6 }}
                          onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
                          onMouseOut={e => (e.currentTarget.style.color = T.mist)}
                        >
                          <FileDown size={13} strokeWidth={1.5} />
                        </button>
                      )}
                      {isReviewer && (
                        <button
                          onClick={e => { e.stopPropagation(); setEditingId(version.id); setEditingName(version.name) }}
                          title="重命名"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 6, borderRadius: 6 }}
                          onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
                          onMouseOut={e => (e.currentTarget.style.color = T.mist)}
                        >
                          <Pencil size={13} strokeWidth={1.5} />
                        </button>
                      )}
                      {isReviewer && (
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteConfirmId(version.id) }}
                          title="删除版本"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 6, borderRadius: 6 }}
                          onMouseOver={e => (e.currentTarget.style.color = T.red)}
                          onMouseOut={e => (e.currentTarget.style.color = T.mist)}
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      )}
                      <button
                        onClick={() => router.push(getVersionEntryUrl(version.id))}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 6, borderRadius: 6 }}
                        onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
                        onMouseOut={e => (e.currentTarget.style.color = T.mist)}
                      >
                        <ChevronRight size={16} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
    </>
  )
}
