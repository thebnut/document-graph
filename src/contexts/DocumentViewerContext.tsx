import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Entity } from '../data/model';

interface DocumentViewerContextType {
  isOpen: boolean;
  currentEntity: Entity | null;
  openDocument: (entity: Entity) => void;
  closeDocument: () => void;
}

const DocumentViewerContext = createContext<DocumentViewerContextType | undefined>(undefined);

export const useDocumentViewer = () => {
  const context = useContext(DocumentViewerContext);
  if (!context) {
    throw new Error('useDocumentViewer must be used within a DocumentViewerProvider');
  }
  return context;
};

interface DocumentViewerProviderProps {
  children: ReactNode;
}

export const DocumentViewerProvider: React.FC<DocumentViewerProviderProps> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);

  const openDocument = (entity: Entity) => {
    setCurrentEntity(entity);
    setIsOpen(true);
  };

  const closeDocument = () => {
    setIsOpen(false);
    // Delay clearing the entity to allow for smooth closing animation
    setTimeout(() => {
      setCurrentEntity(null);
    }, 300);
  };

  const value: DocumentViewerContextType = {
    isOpen,
    currentEntity,
    openDocument,
    closeDocument,
  };

  return (
    <DocumentViewerContext.Provider value={value}>
      {children}
    </DocumentViewerContext.Provider>
  );
};