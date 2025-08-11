'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { FileExplorer } from '@/components/file-explorer'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function FilesPage() {
  return (
    <ProtectedRoute>
      <FilesPageContent />
    </ProtectedRoute>
  )
}

function FilesPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>()
  
  // URL에서 folder 쿼리 매개변수 읽기
  const initialFolderId = searchParams.get('folder') || undefined

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId)
    console.log('Selected file:', fileId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="text-gray-600"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              뒤로 가기
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">파일 관리</h1>
              <p className="text-gray-600">플래시카드 파일과 폴더를 관리하세요</p>
            </div>
          </div>
        </div>
      </div>

      {/* File Explorer */}
      <div className="h-[calc(100vh-120px)]">
        <FileExplorer
          onFileSelect={handleFileSelect}
          selectedFileId={selectedFileId}
          initialFolderId={initialFolderId}
        />
      </div>

    </div>
  )
}