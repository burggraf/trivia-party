import { useState, useEffect } from 'react'
import { Round, UpdateRoundData } from '@/types/rounds'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface RoundEditModalProps {
  round: Round | null
  isOpen: boolean
  onClose: () => void
  onSave: (data: UpdateRoundData, shouldReplaceQuestions?: boolean) => Promise<void>
  onDelete?: () => Promise<void>
  isLoading?: boolean
  isCreateMode?: boolean
}

export default function RoundEditModal({ round, isOpen, onClose, onSave, onDelete, isLoading = false, isCreateMode = false }: RoundEditModalProps) {
  const [formData, setFormData] = useState<UpdateRoundData>({
    title: '',
    question_count: 10,
    sequence_number: 1
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showReplaceConfirm, setShowReplaceConfirm] = useState(false)

  useEffect(() => {
    if (round) {
      setFormData({
        title: round.title || '',
        question_count: round.question_count || 10,
        sequence_number: round.sequence_number || 1
      })
    } else if (isCreateMode) {
      // Reset form for create mode
      setFormData({
        title: '',
        question_count: 10,
        sequence_number: 1
      })
    }
  }, [round, isCreateMode])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!round && !isCreateMode) return

    // If editing an existing round, show confirmation first
    if (!isCreateMode && round) {
      setShowReplaceConfirm(true)
      return
    }

    // Create mode proceeds normally
    await onSave(formData)
    onClose()
  }

  const handleInputChange = (field: keyof UpdateRoundData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true)
  }

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      await onDelete()
      setShowDeleteConfirm(false)
      onClose()
    }
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
  }

  const handleReplaceConfirm = async () => {
    await onSave(formData, true)
    setShowReplaceConfirm(false)
    onClose()
  }

  const handleReplaceCancel = () => {
    setShowReplaceConfirm(false)
  }

  if (!round && !isCreateMode) return null

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isCreateMode ? 'Add Round' : 'Edit Round'}</DialogTitle>
            <DialogDescription>
              {isCreateMode
                ? 'Create a new round for your game. Click save when you\'re done.'
                : 'Make changes to round information here. Click save when you\'re done.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="title" className="text-right">
                  Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 flex-1">
                  <Label htmlFor="question_count" className="whitespace-nowrap">
                    Question Count
                  </Label>
                  <Input
                    id="question_count"
                    type="number"
                    min="1"
                    max="999"
                    value={formData.question_count}
                    onChange={(e) => handleInputChange('question_count', parseInt(e.target.value))}
                    className="w-16"
                    required
                  />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  <Label htmlFor="sequence_number" className="whitespace-nowrap">
                    Sequence
                  </Label>
                  <Input
                    id="sequence_number"
                    type="number"
                    min="1"
                    max="999"
                    value={formData.sequence_number}
                    onChange={(e) => handleInputChange('sequence_number', parseInt(e.target.value))}
                    className="w-16"
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 w-full">
                <div className="flex flex-col-reverse sm:flex-row sm:justify-start sm:space-x-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? 'Saving...' : (isCreateMode ? 'Add Round' : 'Save Changes')}
                  </Button>
                </div>
                {!isCreateMode && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDeleteClick}
                    disabled={isLoading}
                    className="sm:ml-auto"
                  >
                    Delete Round
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Delete Round</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the round "{formData.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This will permanently delete the round and all its associated data.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDeleteConfirm}>
              Delete Round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Replace Questions Confirmation Dialog */}
      <Dialog open={showReplaceConfirm} onOpenChange={setShowReplaceConfirm}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Replace Round Questions?</DialogTitle>
            <DialogDescription>
              This will delete all existing questions for this round and generate new random questions based on the question count.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              This action will permanently remove the current questions and replace them with newly generated ones.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleReplaceCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleReplaceConfirm} disabled={isLoading}>
              Replace Questions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}