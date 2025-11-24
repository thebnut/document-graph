/**
 * Build Progress Step
 * Third step: shows real-time progress as the lifemap is being built
 */

import React, { useEffect, useState } from 'react';
import { Loader, CheckCircle, FileText, Users, FolderTree } from 'lucide-react';
import { lifemapBuilderService, BuildProgress, BuildResult } from '../../services/lifemapBuilderService';
import { dataService } from '../../services/dataService-adapter';

interface BuildProgressStepProps {
  familyName: string;
  files: File[];
  onProgress: (progress: BuildProgress) => void;
  onComplete: (result: BuildResult) => void;
  darkMode?: boolean;
}

export const BuildProgressStep: React.FC<BuildProgressStepProps> = ({
  familyName,
  files,
  onProgress,
  onComplete,
  darkMode = false
}) => {
  const [progress, setProgress] = useState<BuildProgress>({
    phase: 'analyzing',
    filesProcessed: 0,
    totalFiles: files.length,
    peopleFound: [],
    nodesCreated: 0,
    currentOperation: 'Starting...'
  });

  useEffect(() => {
    const buildLifemap = async () => {
      try {
        // Get the current data model
        const model = await dataService.getModel();
        const userEmail = 'lifemap-builder'; // TODO: Get from auth context

        // Start the build process
        const result = await lifemapBuilderService.buildFromDocuments(
          familyName,
          files,
          model,
          userEmail,
          (progressUpdate) => {
            setProgress(progressUpdate);
            onProgress(progressUpdate);
          }
        );

        // Save the updated model
        await dataService.saveModel(model);

        // Complete
        onComplete(result);
      } catch (error) {
        console.error('Build error:', error);
        const errorProgress: BuildProgress = {
          phase: 'error',
          filesProcessed: progress.filesProcessed,
          totalFiles: files.length,
          peopleFound: progress.peopleFound,
          nodesCreated: progress.nodesCreated,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
        setProgress(errorProgress);
        onProgress(errorProgress);
      }
    };

    buildLifemap();
  }, []);

  const getPhaseIcon = () => {
    switch (progress.phase) {
      case 'analyzing':
        return <FileText size={24} className="text-blue-500" />;
      case 'extracting-people':
        return <Users size={24} className="text-green-500" />;
      case 'creating-tree':
      case 'placing-documents':
        return <FolderTree size={24} className="text-purple-500" />;
      case 'complete':
        return <CheckCircle size={24} className="text-green-500" />;
      default:
        return <Loader size={24} className="text-blue-500 animate-spin" />;
    }
  };

  const getPhaseLabel = () => {
    switch (progress.phase) {
      case 'analyzing':
        return 'Analyzing Documents';
      case 'extracting-people':
        return 'Extracting People';
      case 'creating-tree':
        return 'Creating Lifemap Structure';
      case 'placing-documents':
        return 'Organizing Documents';
      case 'uploading':
        return 'Uploading to Google Drive';
      case 'complete':
        return 'Complete!';
      case 'error':
        return 'Error';
      default:
        return 'Processing...';
    }
  };

  const progressPercentage = progress.totalFiles > 0
    ? Math.round((progress.filesProcessed / progress.totalFiles) * 100)
    : 0;

  return (
    <div className="space-y-8 py-8">
      <div className="text-center">
        <h3 className="text-2xl font-bold mb-2">Building Your Lifemap</h3>
        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Processing {files.length} document{files.length !== 1 ? 's' : ''}...
        </p>
      </div>

      {/* Main Progress Indicator */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
          progress.phase === 'error'
            ? 'bg-red-100 dark:bg-red-900/20'
            : 'bg-blue-100 dark:bg-blue-900/20'
        }`}>
          {getPhaseIcon()}
        </div>

        <h4 className="text-xl font-semibold mb-2">{getPhaseLabel()}</h4>

        {progress.currentOperation && (
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {progress.currentOperation}
          </p>
        )}

        {progress.error && (
          <div className={`mt-4 p-4 rounded-lg ${
            darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'
          }`}>
            <p className="text-sm">{progress.error}</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {progress.phase !== 'error' && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Progress
            </span>
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              {progress.filesProcessed} / {progress.totalFiles} files
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${
            darkMode ? 'bg-gray-700' : 'bg-gray-200'
          }`}>
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-4 rounded-lg text-center ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <div className="text-2xl font-bold text-blue-500">
            {progress.filesProcessed}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Analyzed
          </div>
        </div>

        <div className={`p-4 rounded-lg text-center ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <div className="text-2xl font-bold text-green-500">
            {progress.peopleFound.length}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            People Found
          </div>
        </div>

        <div className={`p-4 rounded-lg text-center ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <div className="text-2xl font-bold text-purple-500">
            {progress.nodesCreated}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Nodes Created
          </div>
        </div>
      </div>

      {/* People Found List */}
      {progress.peopleFound.length > 0 && (
        <div className="space-y-2">
          <h4 className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            People Detected:
          </h4>
          <div className="space-y-1">
            {progress.peopleFound.map((person, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 rounded ${
                  darkMode ? 'bg-gray-700' : 'bg-gray-100'
                }`}
              >
                <Users size={16} className="text-blue-500" />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {person.fullName}
                </span>
                <span className={`text-xs ml-auto ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {person.confidence}% confidence
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
