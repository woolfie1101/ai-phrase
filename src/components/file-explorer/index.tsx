'use client'

import { useState } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { FolderTree } from './folder-tree'
import { FileManager } from './file-manager'

interface FileExplorerProps {
  onFileSelect?: (fileId: string) => void
  selectedFileId?: string
  initialFolderId?: string
}

export function FileExplorer({ onFileSelect, selectedFileId, initialFolderId }: FileExplorerProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId || null)

  const handleFolderSelect = (folderId: string) => {
    setSelectedFolderId(folderId)
  }

  const handleFileSelect = (fileId: string) => {
    onFileSelect?.(fileId)
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex h-screen bg-white">
        {/* Left sidebar - Folder Tree */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          <FolderTree
            onFolderSelect={handleFolderSelect}
            onFileSelect={handleFileSelect}
            selectedFolderId={selectedFolderId || undefined}
            selectedFileId={selectedFileId}
          />
        </div>

        {/* Right content - File Manager */}
        <FileManager
          selectedFolderId={selectedFolderId}
          selectedFileId={selectedFileId}
          onFileSelect={handleFileSelect}
        />
      </div>
    </DndProvider>
  )
}

export default FileExplorer