import { Project, ProjectVersion, AuditReport } from '@/types'

const DB_NAME = 'design-review-db'
const DB_VERSION = 2

let _db: IDBDatabase | null = null

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db)
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = e => {
      const db = (e.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains('projects')) {
        db.createObjectStore('projects', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('versions')) {
        const vs = db.createObjectStore('versions', { keyPath: 'id' })
        vs.createIndex('projectId', 'projectId', { unique: false })
      }
      if (!db.objectStoreNames.contains('audit_reports')) {
        const ar = db.createObjectStore('audit_reports', { keyPath: 'id' })
        ar.createIndex('versionId', 'versionId', { unique: false })
      }
    }
    req.onsuccess = e => {
      _db = (e.target as IDBOpenDBRequest).result
      resolve(_db)
    }
    req.onerror = () => reject(req.error)
  })
}

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(r.error)
  })
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const db = await openDB()
  const all: Project[] = await req(db.transaction('projects', 'readonly').objectStore('projects').getAll())
  return all.sort((a, b) => (b.sortOrder ?? b.createdAt) - (a.sortOrder ?? a.createdAt))
}

export async function createProject(project: Project): Promise<void> {
  const db = await openDB()
  await req(db.transaction('projects', 'readwrite').objectStore('projects').add(project))
}

export async function updateProject(project: Project): Promise<void> {
  const db = await openDB()
  await req(db.transaction('projects', 'readwrite').objectStore('projects').put(project))
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDB()

  // cascade: delete all versions first
  const versions: ProjectVersion[] = await req(
    db.transaction('versions', 'readonly').objectStore('versions').index('projectId').getAll(id)
  )
  if (versions.length > 0) {
    const vt = db.transaction('versions', 'readwrite')
    for (const v of versions) vt.objectStore('versions').delete(v.id)
    await new Promise<void>((resolve, reject) => {
      vt.oncomplete = () => resolve()
      vt.onerror = () => reject(vt.error)
    })
  }

  await req(db.transaction('projects', 'readwrite').objectStore('projects').delete(id))
}

// ── Versions ──────────────────────────────────────────────────────────────────

export async function getVersions(projectId: string): Promise<ProjectVersion[]> {
  const db = await openDB()
  const all: ProjectVersion[] = await req(
    db.transaction('versions', 'readonly').objectStore('versions').index('projectId').getAll(projectId)
  )
  return all.sort((a, b) => b.createdAt - a.createdAt)
}

export async function createVersion(version: ProjectVersion): Promise<void> {
  const db = await openDB()
  await req(db.transaction('versions', 'readwrite').objectStore('versions').add(version))
}

export async function updateVersion(version: ProjectVersion): Promise<void> {
  const db = await openDB()
  await req(db.transaction('versions', 'readwrite').objectStore('versions').put(version))
}

export async function deleteVersion(id: string): Promise<void> {
  const db = await openDB()
  await deleteAuditReport(id)
  await req(db.transaction('versions', 'readwrite').objectStore('versions').delete(id))
}

// ── Audit Reports ─────────────────────────────────────────────────────────────

export async function saveAuditReport(report: AuditReport): Promise<void> {
  const db = await openDB()
  await req(db.transaction('audit_reports', 'readwrite').objectStore('audit_reports').put(report))
}

export async function getAuditReport(versionId: string): Promise<AuditReport | undefined> {
  const db = await openDB()
  const all: AuditReport[] = await req(
    db.transaction('audit_reports', 'readonly').objectStore('audit_reports').index('versionId').getAll(versionId)
  )
  return all[0]
}

export async function deleteAuditReport(versionId: string): Promise<void> {
  const db = await openDB()
  const all: AuditReport[] = await req(
    db.transaction('audit_reports', 'readonly').objectStore('audit_reports').index('versionId').getAll(versionId)
  )
  if (all.length > 0) {
    const t = db.transaction('audit_reports', 'readwrite')
    for (const r of all) t.objectStore('audit_reports').delete(r.id)
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve()
      t.onerror = () => reject(t.error)
    })
  }
}
