/**
 * Lifemap Builder Wizard
 * Multi-step onboarding wizard for creating a new lifemap from documents
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { FamilyNameStep } from './FamilyNameStep';
import { DocumentUploadStep } from './DocumentUploadStep';
import { BuildProgressStep } from './BuildProgressStep';
import { BuildResultsStep } from './BuildResultsStep';
import { BuildProgress, BuildResult } from '../../services/lifemapBuilderService';

interface LifemapBuilderWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (result: BuildResult) => void;
  darkMode?: boolean;
}

type WizardStep = 'family-name' | 'upload' | 'building' | 'results';

export const LifemapBuilderWizard: React.FC<LifemapBuilderWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  darkMode = false
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('family-name');
  const [familyName, setFamilyName] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [buildProgress, setBuildProgress] = useState<BuildProgress | null>(null);
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);

  if (!isOpen) return null;

  const handleFamilyNameComplete = (name: string) => {
    setFamilyName(name);
    setCurrentStep('upload');
  };

  const handleUploadComplete = (files: File[]) => {
    setUploadedFiles(files);
    setCurrentStep('building');
  };

  const handleBuildProgress = (progress: BuildProgress) => {
    setBuildProgress(progress);
  };

  const handleBuildComplete = (result: BuildResult) => {
    setBuildResult(result);
    setCurrentStep('results');
  };

  const handleClose = () => {
    if (currentStep === 'building') {
      // Prevent closing during build
      if (!confirm('Building is in progress. Are you sure you want to cancel?')) {
        return;
      }
    }
    onClose();
  };

  const handleFinish = () => {
    if (buildResult) {
      onComplete(buildResult);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-2xl ${
          darkMode
            ? 'bg-gray-800 text-white'
            : 'bg-white text-gray-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          <div>
            <h2 className="text-2xl font-bold">Create Your Lifemap</h2>
            <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {currentStep === 'family-name' && 'Step 1 of 3: Family Name'}
              {currentStep === 'upload' && 'Step 2 of 3: Upload Documents'}
              {currentStep === 'building' && 'Step 3 of 3: Building Your Lifemap'}
              {currentStep === 'results' && 'Complete!'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? 'hover:bg-gray-700'
                : 'hover:bg-gray-100'
            }`}
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Progress Bar */}
        <div className={`h-1 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{
              width:
                currentStep === 'family-name' ? '25%' :
                currentStep === 'upload' ? '50%' :
                currentStep === 'building' ? '75%' :
                '100%'
            }}
          />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {currentStep === 'family-name' && (
            <FamilyNameStep
              onComplete={handleFamilyNameComplete}
              darkMode={darkMode}
            />
          )}

          {currentStep === 'upload' && (
            <DocumentUploadStep
              familyName={familyName}
              onComplete={handleUploadComplete}
              onBack={() => setCurrentStep('family-name')}
              darkMode={darkMode}
            />
          )}

          {currentStep === 'building' && (
            <BuildProgressStep
              familyName={familyName}
              files={uploadedFiles}
              onProgress={handleBuildProgress}
              onComplete={handleBuildComplete}
              darkMode={darkMode}
            />
          )}

          {currentStep === 'results' && buildResult && (
            <BuildResultsStep
              result={buildResult}
              onFinish={handleFinish}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>
    </div>
  );
};
