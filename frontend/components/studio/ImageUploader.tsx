'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, ImageIcon, X, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface ImageUploaderProps {
  onUpload: (file: File, previewUrl: string) => void
  value?: string | null // current image URL/preview
  onClear?: () => void
  className?: string
  maxSizeMB?: number
}

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
}

export function ImageUploader({
  onUpload,
  value,
  onClear,
  className,
  maxSizeMB = 10,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: readonly { errors: readonly { message: string; code: string }[] }[]) => {
      setUploadError(null)

      if (rejectedFiles.length > 0) {
        const err = rejectedFiles[0].errors[0]
        const message =
          err.message.includes('file-too-large')
            ? `File too large. Maximum size is ${maxSizeMB}MB.`
            : err.message.includes('file-invalid-type')
            ? 'Invalid file type. Please upload JPG, PNG, or WEBP.'
            : err.message
        setUploadError(message)
        toast.error('Upload failed', { description: message })
        return
      }

      if (acceptedFiles.length === 0) return

      const file = acceptedFiles[0]
      const previewUrl = URL.createObjectURL(file)
      onUpload(file, previewUrl)
    },
    [onUpload, maxSizeMB]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: maxSizeMB * 1024 * 1024,
    maxFiles: 1,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
    onDropAccepted: () => setIsDragging(false),
    onDropRejected: () => setIsDragging(false),
  })

  return (
    <div className={cn('space-y-2', className)}>
      <label className="text-sm font-medium text-foreground/90">
        Source Image
        <span className="text-orange ml-1">*</span>
      </label>

      <AnimatePresence mode="wait">
        {value ? (
          // Preview state
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl overflow-hidden border border-orange/30 bg-surface-2 aspect-video"
          >
            <Image
              src={value}
              alt="Uploaded image"
              fill
              className="object-contain"
              unoptimized={value.startsWith('blob:')}
            />

            {/* Remove button */}
            <button
              type="button"
              onClick={() => {
                onClear?.()
                setUploadError(null)
              }}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
              title="Remove image"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            {/* Replace overlay */}
            <div
              {...getRootProps()}
              className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/50 transition-all duration-200 cursor-pointer group"
            >
              <input {...getInputProps()} />
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1">
                <Upload className="w-5 h-5 text-white" />
                <span className="text-xs text-white font-medium">Replace</span>
              </div>
            </div>
          </motion.div>
        ) : (
          // Drop zone state
          <motion.div
            key="dropzone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* eslint-disable-next-line react/jsx-props-no-spreading */}
            <div
              {...getRootProps()}
              className={cn(
                'relative flex flex-col items-center justify-center aspect-video rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 select-none',
                isDragActive || isDragging
                  ? 'border-orange bg-orange/8 shadow-[0_0_24px_rgba(255,107,43,0.2)]'
                  : uploadError
                  ? 'border-red-500/40 bg-red-500/5 hover:border-red-400/60'
                  : 'border-border bg-surface-2 hover:border-orange/40 hover:bg-orange/3'
              )}
            >
            <input {...getInputProps()} />

            <AnimatePresence>
              {isDragActive ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-orange/20 border border-orange/40 flex items-center justify-center animate-pulse">
                    <Upload className="w-6 h-6 text-orange" />
                  </div>
                  <p className="text-sm font-medium text-orange">Drop it here!</p>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center gap-3 text-center px-6"
                >
                  <div
                    className={cn(
                      'w-14 h-14 rounded-full border flex items-center justify-center',
                      uploadError
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-surface-3 border-border'
                    )}
                  >
                    {uploadError ? (
                      <AlertCircle className="w-6 h-6 text-red-400" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-muted" />
                    )}
                  </div>

                  {uploadError ? (
                    <p className="text-sm text-red-400">{uploadError}</p>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          Drag &amp; drop your image
                        </p>
                        <p className="text-xs text-muted mt-0.5">
                          or click to browse
                        </p>
                      </div>
                      <p className="text-[11px] text-muted/60">
                        JPG, PNG, WEBP &nbsp;&bull;&nbsp; Max {maxSizeMB}MB
                      </p>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
