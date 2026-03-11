'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { X, Save, Calendar, FileText, AlignLeft, Tag, User } from 'lucide-react'
import { Task, TaskStatus, TaskPriority } from '@/types'

interface TaskModalProps {
  task?:   Task | null
  onClose: () => void
  onSave:  (data: Partial<Task>) => Promise<void>
}

const EDITABLE_STATUSES: { value: TaskStatus; label: string }[] = [
  { value: 'pending',     label: 'Pending'     },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed'   },
]

export function TaskModal({ task, onClose, onSave }: TaskModalProps) {
  const { data: session } = useSession()
  const isEdit = !!task

  // The creator is always the logged-in user — read from session
  const currentUserName = session?.user?.name ?? ''

  const [title,       setTitle]       = useState(task?.title       ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority,    setPriority]    = useState<TaskPriority>(task?.priority ?? 'medium')
  const [status,      setStatus]      = useState<TaskStatus>(
    task?.status === 'overdue' ? 'pending' : (task?.status ?? 'pending')
  )
  const [dueDate,  setDueDate]  = useState(task?.dueDate ?? '')
  const [assignedUser, setAssignedUser] = useState(task?.assignedUser ?? '')  
  const [isSaving, setIsSaving] = useState(false)
  const [errors,   setErrors]   = useState<Record<string, string>>({})

  // The displayed assigned user: when editing, show original creator; when creating, show current user
  const displayAssignedUser = isEdit ? (task?.assignedUser ?? currentUserName) : currentUserName

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!title.trim()) errs.title   = 'Title is required'
    if (!dueDate)      errs.dueDate = 'Due date is required'
    if (!assignedUser.trim()) errs.assignedUser = 'Assigned user is required'
    return errs
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setIsSaving(true)
    try {
      await onSave({
        title:       title.trim(),
        description: description.trim(),
        priority,
        status,
        dueDate,
        assignedUser: assignedUser.trim(),  

      })
      onClose()
    } catch (err: any) {
      setErrors({ submit: err.message ?? 'Save failed. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-green-50">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {errors.submit && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {errors.submit}
            </p>
          )}

          {/* Assigned to — read-only, auto from session */}
          <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
          {/* Assigned User — manual input */}

          {/* Assigned User */}
<div>
  <label className="form-label flex items-center gap-1.5">
    <User className="w-3.5 h-3.5" /> Assigned User *
  </label>
  <input
    value={assignedUser}
    onChange={e => { setAssignedUser(e.target.value); setErrors(p => ({ ...p, assignedUser: '' })) }}
    className={`form-input ${errors.assignedUser ? 'border-red-400 focus:ring-red-400' : ''}`}
    placeholder="Enter assigned user name"
  />
  {errors.assignedUser && <p className="text-xs text-red-500 mt-1">{errors.assignedUser}</p>}
</div>



            <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {displayAssignedUser.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-blue-500 font-medium">Created by</p>
              <p className="text-sm font-semibold text-blue-800 truncate">{displayAssignedUser}</p>
            </div>
            <User className="w-4 h-4 text-blue-300 ml-auto flex-shrink-0" />
          </div>

          {/* Title */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Title *
            </label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: '' })) }}
              className={`form-input ${errors.title ? 'border-red-400 focus:ring-red-400' : ''}`}
              placeholder="Enter task title"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <AlignLeft className="w-3.5 h-3.5" /> Description
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="form-textarea"
              rows={3}
              placeholder="Optional description…"
            />
          </div>

          {/* Priority + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Priority
              </label>
              <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} className="form-select">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="form-label">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} className="form-select">
                {EDITABLE_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              {isEdit && task?.status === 'overdue' && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ Was overdue — update status or due date to resolve.
                </p>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={e => { setDueDate(e.target.value); setErrors(p => ({ ...p, dueDate: '' })) }}
              className={`form-input ${errors.dueDate ? 'border-red-400 focus:ring-red-400' : ''}`}
            />
            {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100 mt-2">
            <button type="button" onClick={onClose} className="btn-secondary px-5">Cancel</button>
            <button type="submit" disabled={isSaving} className="btn-primary px-5">
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEdit ? 'Update Task' : 'Create Task'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
