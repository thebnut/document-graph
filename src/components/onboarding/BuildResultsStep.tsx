/**
 * Build Results Step
 * Fourth step: shows final results and allows user to finish
 */

import React from 'react';
import { CheckCircle, Users, FolderTree, FileText, AlertTriangle, ArrowRight } from 'lucide-react';
import { BuildResult } from '../../services/lifemapBuilderService';

interface BuildResultsStepProps {
  result: BuildResult;
  onFinish: () => void;
  darkMode?: boolean;
}

export const BuildResultsStep: React.FC<BuildResultsStepProps> = ({
  result,
  onFinish,
  darkMode = false
}) => {
  const hasErrors = result.errors.length > 0;

  return (
    <div className="space-y-8 py-8">
      {/* Success/Warning Header */}
      <div className="text-center">
        <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${
          hasErrors
            ? 'bg-yellow-100 dark:bg-yellow-900/20'
            : 'bg-green-100 dark:bg-green-900/20'
        }`}>
          {hasErrors ? (
            <AlertTriangle size={48} className="text-yellow-500" />
          ) : (
            <CheckCircle size={48} className="text-green-500" />
          )}
        </div>

        <h3 className="text-2xl font-bold mb-2">
          {hasErrors ? 'Lifemap Created with Warnings' : 'Lifemap Created Successfully!'}
        </h3>

        <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          {hasErrors
            ? 'Your lifemap has been created, but some documents could not be processed.'
            : 'Your lifemap has been created and is ready to use.'}
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`p-6 rounded-lg text-center ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <Users size={32} className="text-blue-500 mx-auto mb-2" />
          <div className="text-3xl font-bold text-blue-500 mb-1">
            {result.peopleCreated}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {result.peopleCreated === 1 ? 'Person' : 'People'} Created
          </div>
        </div>

        <div className={`p-6 rounded-lg text-center ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <FolderTree size={32} className="text-purple-500 mx-auto mb-2" />
          <div className="text-3xl font-bold text-purple-500 mb-1">
            {result.categoriesCreated}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {result.categoriesCreated === 1 ? 'Category' : 'Categories'} Created
          </div>
        </div>

        <div className={`p-6 rounded-lg text-center ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <FileText size={32} className="text-green-500 mx-auto mb-2" />
          <div className="text-3xl font-bold text-green-500 mb-1">
            {result.documentsPlaced}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {result.documentsPlaced === 1 ? 'Document' : 'Documents'} Placed
          </div>
        </div>
      </div>

      {/* People Created List */}
      {result.people.length > 0 && (
        <div className="space-y-3">
          <h4 className={`font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            People Added to Your Lifemap:
          </h4>
          <div className="space-y-2">
            {result.people.map((personResult, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <Users size={20} className="text-blue-500" />
                  <span className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {personResult.person.label}
                  </span>
                  {personResult.isNew && (
                    <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}
                </div>
                <div className={`text-sm ml-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {personResult.categories.length} {personResult.categories.length === 1 ? 'category' : 'categories'}: {' '}
                  {personResult.categories.map(c => c.label).join(', ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Errors Section */}
      {hasErrors && (
        <div className={`p-4 rounded-lg ${
          darkMode ? 'bg-yellow-900/20 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={20} className="text-yellow-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h5 className={`font-medium mb-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
                {result.errors.length} {result.errors.length === 1 ? 'Warning' : 'Warnings'}
              </h5>
              <ul className={`text-sm space-y-1 ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
                {result.errors.slice(0, 5).map((error, index) => (
                  <li key={index} className="list-disc list-inside">
                    {error}
                  </li>
                ))}
                {result.errors.length > 5 && (
                  <li className="text-xs">
                    ...and {result.errors.length - 5} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'}`}>
        <h5 className={`font-medium mb-2 ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
          Next Steps:
        </h5>
        <ul className={`text-sm space-y-1 ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
          <li>• Explore your lifemap by clicking on nodes</li>
          <li>• Add more documents using the upload button</li>
          <li>• Organize documents by dragging them to different categories</li>
          <li>• Your data is automatically synced to Google Drive</li>
        </ul>
      </div>

      {/* Finish Button */}
      <button
        onClick={onFinish}
        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg"
      >
        View Your Lifemap
        <ArrowRight size={24} />
      </button>
    </div>
  );
};
