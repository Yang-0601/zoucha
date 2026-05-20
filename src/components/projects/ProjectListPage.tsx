'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, ChevronRight, FolderOpen, Settings, Pencil, Clock, Check, X, GripVertical } from 'lucide-react'
import { Project } from '@/types'
import { getProjects, createProject, updateProject, deleteProject } from '@/lib/db'
import { useAppStore } from '@/store'
import { useAuth } from '@/hooks/useAuth'
import RoleBadge from '@/components/role/RoleBadge'

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
  return new Date(ts).toLocaleDateString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatDateTime(ts: number) {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function genId() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

interface EditState {
  name: string
  version: string
}

export default function ProjectListPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const {
    setShowAIConfigModal,
    setDesignImage, setLiveImage, clearAnnotationsAndDiffs,
    setAnalysisRunning, setAnalysisProgress, setAnalysisPhase,
    switchVersion, role,
  } = useAppStore()
  const isReviewer = role === 'reviewer'

  useEffect(() => {
    if (authLoading) return
    if (!user) router.replace('/login')
  }, [user, authLoading, router])

  function clearVersionState() {
    switchVersion(null)
  }
  const [projects, setProjects] = useState<Project[]>([])
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newVersion, setNewVersion] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editState, setEditState] = useState<EditState>({ name: '', version: '' })
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const newNameRef = useRef<HTMLInputElement>(null)
  const editNameRef = useRef<HTMLInputElement>(null)

  async function loadProjects() {
    try {
      setProjects(await getProjects())
      setErrorMsg(null)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
    }
  }

  useEffect(() => {
    switchVersion(null)
    loadProjects()
  }, [switchVersion])
  useEffect(() => { if (creating) newNameRef.current?.focus() }, [creating])
  useEffect(() => { if (editingId) editNameRef.current?.focus() }, [editingId])

  async function handleReorder(fromId: string, toId: string) {
    if (fromId === toId) return
    const arr = [...projects]
    const fromIdx = arr.findIndex(p => p.id === fromId)
    const toIdx = arr.findIndex(p => p.id === toId)
    if (fromIdx < 0 || toIdx < 0) return
    const [item] = arr.splice(fromIdx, 1)
    arr.splice(toIdx, 0, item)
    // reassign sortOrder: first item = highest value (list sorted descending)
    const base = Math.floor(Date.now() / 1000)
    const updated = arr.map((p, i) => ({ ...p, sortOrder: base - i }))
    setProjects(updated)
    await Promise.all(updated.map(p => updateProject(p)))
  }

  async function handleCreate() {
    const name = newName.trim() || '未命名项目'
    const version = newVersion.trim() || 'v1.0'
    const now = Date.now()
    const sortOrder = Math.floor(now / 1000)
    const projectId = genId()
    try {
      await createProject({ id: projectId, name, version, sortOrder, createdAt: now, updatedAt: now })
      setCreating(false)
      setNewName('')
      setNewVersion('')
      await loadProjects()
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : String(e))
    }
  }

  async function handleSaveEdit(project: Project) {
    const name = editState.name.trim() || project.name
    const version = editState.version.trim() || project.version
    await updateProject({ ...project, name, version, updatedAt: Date.now() })
    await loadProjects()
    setEditingId(null)
  }

  async function handleDelete(id: string) {
    await deleteProject(id)
    await loadProjects()
    setDeleteConfirmId(null)
  }

  function handleProjectClick(projectId: string) {
    router.push(`/project/${projectId}`)
  }

  return (
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
            className="flex items-center gap-1.5"
            style={{ fontSize: 12, color: T.mist, background: 'none', border: 'none', cursor: 'pointer' }}
            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
          >
            <Settings size={13} strokeWidth={1.5} />
            AI 配置
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 px-10 py-10" style={{ maxWidth: 960, width: '100%', margin: '0 auto' }}>

        {/* Page title + action */}
        <div className="flex items-end justify-between" style={{ marginBottom: 28 }}>
          <div style={{ borderLeft: `3px solid #D9C8A0`, paddingLeft: 16 }}>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: T.charcoal, letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              项目列表
            </h1>
            <p style={{ fontSize: 13, color: T.mist, marginTop: 4 }}>共 {projects.length} 个项目</p>
          </div>
          {isReviewer && (
            <button
              onClick={() => { setCreating(true); setNewName(''); setNewVersion('') }}
              className="flex items-center gap-2"
              style={{ fontSize: 13, fontWeight: 500, color: T.paper, background: T.charcoal, border: 'none', borderRadius: 8, padding: '9px 18px', cursor: 'pointer' }}
              onMouseOver={e => (e.currentTarget.style.background = T.ink)}
              onMouseOut={e => (e.currentTarget.style.background = T.charcoal)}
            >
              <Plus size={14} strokeWidth={2} />
              新建项目
            </button>
          )}
        </div>

        {/* Error banner */}
        {errorMsg && (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 12, color: '#B91C1C', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B91C1C', padding: '0 4px' }}>×</button>
          </div>
        )}

        {/* New project row — reviewer only */}
        {isReviewer && creating && (
          <div
            style={{ background: T.warm, border: `1px solid #D9C8A0`, borderRadius: 10, padding: '14px 20px', marginBottom: 10 }}
          >
            <div className="flex items-center gap-3">
              <FolderOpen size={15} strokeWidth={1.5} style={{ color: T.mist, flexShrink: 0 }} />
              <input
                ref={newNameRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="项目名称"
                style={{ flex: 1, background: T.paper, border: `1px solid ${T.border}`, borderRadius: 6, outline: 'none', fontSize: 13, color: T.charcoal, padding: '5px 10px' }}
              />
              <input
                value={newVersion}
                onChange={e => setNewVersion(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                placeholder="版本号（如 v1.0）"
                style={{ width: 160, background: T.paper, border: `1px solid ${T.border}`, borderRadius: 6, outline: 'none', fontSize: 13, color: T.charcoal, padding: '5px 10px' }}
              />
              <button
                onClick={handleCreate}
                style={{ fontSize: 12, fontWeight: 500, color: T.paper, background: T.charcoal, border: 'none', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', flexShrink: 0 }}
              >
                创建
              </button>
              <button onClick={() => setCreating(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 4 }}>
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        )}

        {/* Column headers */}
        {projects.length > 0 && (
          <div className="flex items-center" style={{ padding: '0 20px', marginBottom: 6 }}>
            <span style={{ flex: 1, fontSize: 11, color: T.mist, letterSpacing: '0.06em' }}>项目名称</span>
            <span style={{ width: 120, fontSize: 11, color: T.mist, letterSpacing: '0.06em' }}>版本号</span>
            <span style={{ width: 150, fontSize: 11, color: T.mist, letterSpacing: '0.06em' }}>创建时间</span>
            <span style={{ width: 170, fontSize: 11, color: T.mist, letterSpacing: '0.06em' }}>更新时间</span>
            <span style={{ width: 96 }} />
          </div>
        )}

        {/* Empty state */}
        {projects.length === 0 && !creating ? (
          <div className="flex flex-col items-center justify-center gap-4" style={{ paddingTop: 80, paddingBottom: 80 }}>
            <FolderOpen size={36} strokeWidth={1} style={{ color: T.smoke }} />
            <p style={{ fontSize: 13, color: T.mist }}>还没有项目，点击「新建项目」开始</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {projects.map(project => (
              <div
                key={project.id}
                draggable
                onDragStart={() => setDragId(project.id)}
                onDragEnd={() => { setDragId(null); setDragOverId(null) }}
                onDragOver={e => { e.preventDefault(); setDragOverId(project.id) }}
                onDrop={() => {
                  if (dragId && dragId !== project.id) handleReorder(dragId, project.id)
                  setDragId(null); setDragOverId(null)
                }}
                style={{
                  background: T.warm,
                  border: `1px solid ${dragOverId === project.id && dragId !== project.id ? '#C49A45' : T.border}`,
                  borderRadius: 10,
                  padding: '12px 20px',
                  opacity: dragId === project.id ? 0.4 : 1,
                  cursor: 'default',
                  transition: 'border-color 0.1s',
                }}
              >
                {/* Delete confirm */}
                {deleteConfirmId === project.id ? (
                  <div className="flex items-center justify-between">
                    <p style={{ fontSize: 13, color: T.charcoal }}>确认删除「{project.name}」及其所有版本？此操作不可恢复。</p>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDeleteConfirmId(null)} style={{ fontSize: 12, color: T.mist, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 14px', cursor: 'pointer' }}>取消</button>
                      <button onClick={() => handleDelete(project.id)} style={{ fontSize: 12, fontWeight: 500, color: '#fff', background: T.red, border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer' }}>删除</button>
                    </div>
                  </div>

                /* Edit mode */
                ) : editingId === project.id ? (
                  <div className="flex items-center gap-3">
                    <FolderOpen size={15} strokeWidth={1.5} style={{ color: T.mist, flexShrink: 0 }} />
                    <input
                      ref={editNameRef}
                      value={editState.name}
                      onChange={e => setEditState(s => ({ ...s, name: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(project); if (e.key === 'Escape') setEditingId(null) }}
                      placeholder="项目名称"
                      style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.charcoal, background: T.paper, border: `1px solid #D9C8A0`, borderRadius: 6, padding: '5px 10px', outline: 'none' }}
                    />
                    <input
                      value={editState.version}
                      onChange={e => setEditState(s => ({ ...s, version: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(project); if (e.key === 'Escape') setEditingId(null) }}
                      placeholder="版本号"
                      style={{ width: 160, fontSize: 13, color: T.charcoal, background: T.paper, border: `1px solid #D9C8A0`, borderRadius: 6, padding: '5px 10px', outline: 'none' }}
                    />
                    <button
                      onClick={() => handleSaveEdit(project)}
                      title="保存"
                      style={{ background: T.charcoal, border: 'none', borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: T.paper, display: 'flex', alignItems: 'center' }}
                    >
                      <Check size={13} strokeWidth={2} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      title="取消"
                      style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 10px', cursor: 'pointer', color: T.mist, display: 'flex', alignItems: 'center' }}
                    >
                      <X size={13} strokeWidth={1.5} />
                    </button>
                  </div>

                /* Normal row */
                ) : (
                  <div className="flex items-center">
                    {/* Drag handle — reviewer only */}
                    {isReviewer && (
                      <div
                        style={{ marginRight: 8, color: T.smoke, cursor: 'grab', flexShrink: 0, lineHeight: 0 }}
                        title="拖拽排序"
                      >
                        <GripVertical size={14} strokeWidth={1.5} />
                      </div>
                    )}
                    {/* Name */}
                    <div
                      className="flex items-center gap-2 flex-1 min-w-0"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <FolderOpen size={14} strokeWidth={1.5} style={{ color: T.mist, flexShrink: 0 }} />
                      <span style={{ fontSize: 14, fontWeight: 500, color: T.charcoal, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {project.name}
                      </span>
                    </div>

                    {/* Version tag */}
                    <div style={{ width: 120, flexShrink: 0 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: T.mist,
                        background: T.paper, border: `1px solid ${T.border}`,
                        borderRadius: 4, padding: '2px 8px', letterSpacing: '0.04em',
                      }}>
                        {project.version || '—'}
                      </span>
                    </div>

                    {/* Created at */}
                    <div className="flex items-center gap-1.5" style={{ width: 150, flexShrink: 0 }}>
                      <Clock size={11} strokeWidth={1.5} style={{ color: T.smoke }} />
                      <span style={{ fontSize: 12, color: T.mist }}>{formatDate(project.createdAt)}</span>
                    </div>

                    {/* Updated at */}
                    <div style={{ width: 170, flexShrink: 0 }}>
                      <span style={{ fontSize: 12, color: T.mist }}>{formatDateTime(project.updatedAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1" style={{ width: 96, flexShrink: 0, justifyContent: 'flex-end' }}>
                      {isReviewer && (
                        <>
                          <button
                            onClick={e => { e.stopPropagation(); setEditingId(project.id); setEditState({ name: project.name, version: project.version || '' }) }}
                            title="编辑"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 6, borderRadius: 6 }}
                            onMouseOver={e => (e.currentTarget.style.color = T.charcoal)}
                            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
                          >
                            <Pencil size={13} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={e => { e.stopPropagation(); setDeleteConfirmId(project.id) }}
                            title="删除"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.mist, padding: 6, borderRadius: 6 }}
                            onMouseOver={e => (e.currentTarget.style.color = T.red)}
                            onMouseOut={e => (e.currentTarget.style.color = T.mist)}
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => router.push(`/project/${project.id}`)}
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
  )
}
