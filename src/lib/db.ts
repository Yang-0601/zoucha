import { supabase } from './supabase'
import { Project, ProjectVersion } from '@/types'
import { deleteVersionImages } from './versionData'

// ── Projects ──────────────────────────────────────────────────────────────────

function toError(e: unknown): Error {
  if (e instanceof Error) return e
  if (e && typeof e === 'object' && 'message' in e) return new Error(String((e as { message: unknown }).message))
  return new Error(String(e))
}

export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('sort_order', { ascending: false })
  if (error) throw toError(error)
  return (data ?? []).map(r => ({
    id: r.id,
    name: r.name,
    version: r.version ?? '',
    sortOrder: r.sort_order ?? 0,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  }))
}

export async function createProject(project: Project): Promise<void> {
  const { error } = await supabase.from('projects').insert({
    id: project.id,
    name: project.name,
    version: project.version,
    sort_order: project.sortOrder,
    created_at: new Date(project.createdAt).toISOString(),
    updated_at: new Date(project.updatedAt).toISOString(),
  })
  if (error) throw toError(error)
}

export async function updateProject(project: Project): Promise<void> {
  const { error } = await supabase.from('projects').update({
    name: project.name,
    version: project.version,
    sort_order: project.sortOrder,
    updated_at: new Date(project.updatedAt).toISOString(),
  }).eq('id', project.id)
  if (error) throw toError(error)
}

export async function deleteProject(id: string): Promise<void> {
  // Clean up Storage files for all versions of this project
  const { data: versions } = await supabase
    .from('versions')
    .select('id')
    .eq('project_id', id)
  if (versions && versions.length > 0) {
    await Promise.allSettled(versions.map(v => deleteVersionImages(v.id)))
  }
  // DB cascade handles versions → version_data automatically
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw toError(error)
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function getVersions(projectId: string): Promise<ProjectVersion[]> {
  const { data, error } = await supabase
    .from('versions')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
  if (error) throw toError(error)
  return (data ?? []).map(r => ({
    id: r.id,
    projectId: r.project_id,
    name: r.name,
    createdAt: new Date(r.created_at).getTime(),
    updatedAt: new Date(r.updated_at).getTime(),
  }))
}

export async function createVersion(version: ProjectVersion): Promise<void> {
  const { error } = await supabase.from('versions').insert({
    id: version.id,
    project_id: version.projectId,
    name: version.name,
    created_at: new Date(version.createdAt).toISOString(),
    updated_at: new Date(version.updatedAt).toISOString(),
  })
  if (error) throw toError(error)
}

export async function updateVersion(version: ProjectVersion): Promise<void> {
  const { error } = await supabase.from('versions').update({
    name: version.name,
    updated_at: new Date(version.updatedAt).toISOString(),
  }).eq('id', version.id)
  if (error) throw toError(error)
}

export async function deleteVersion(id: string): Promise<void> {
  // Clean up Storage files first (version_data row is cascade-deleted by DB)
  await deleteVersionImages(id).catch(() => { /* storage cleanup is best-effort */ })
  const { error } = await supabase.from('versions').delete().eq('id', id)
  if (error) throw toError(error)
}
