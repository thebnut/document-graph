/**
 * Sync Status Indicator Component
 * Shows the current sync status with Google Drive
 */

import React, { useEffect, useState } from 'react';
import { Cloud, CloudOff, CloudUpload, AlertCircle, Check } from 'lucide-react';
import { SyncStatus } from '../services/googleDriveDataService';
import { dataService } from '../services/dataService-adapter';

export const SyncStatusIndicator: React.FC = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const driveService = dataService.getGoogleDriveService();
    if (!driveService) {
      return;
    }

    // Subscribe to sync status changes
    const unsubscribe = driveService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  if (!syncStatus || !dataService.isUsingGoogleDrive()) {
    return null;
  }

  const getIcon = () => {
    if (syncStatus.syncError) {
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
    if (syncStatus.isSyncing) {
      return <CloudUpload className="w-4 h-4 text-blue-500 animate-pulse" />;
    }
    if (syncStatus.pendingChanges) {
      return <Cloud className="w-4 h-4 text-yellow-500" />;
    }
    if (syncStatus.lastSyncTime) {
      return <Check className="w-4 h-4 text-green-500" />;
    }
    return <CloudOff className="w-4 h-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (syncStatus.syncError) {
      return 'Sync error';
    }
    if (syncStatus.isSyncing) {
      return 'Syncing...';
    }
    if (syncStatus.pendingChanges) {
      return 'Changes pending';
    }
    if (syncStatus.lastSyncTime) {
      return 'Synced';
    }
    return 'Not synced';
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes === 1) return '1 minute ago';
    if (minutes < 60) return `${minutes} minutes ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center space-x-2 px-3 py-1.5 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
        title={getStatusText()}
      >
        {getIcon()}
        <span className="text-sm text-gray-600">{getStatusText()}</span>
      </button>

      {showDetails && (
        <div className="absolute top-10 right-0 w-64 bg-white rounded-lg shadow-lg p-4 z-50">
          <h3 className="font-semibold text-sm mb-2">Sync Status</h3>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className={`font-medium ${
                syncStatus.syncError ? 'text-red-600' :
                syncStatus.isSyncing ? 'text-blue-600' :
                syncStatus.pendingChanges ? 'text-yellow-600' :
                'text-green-600'
              }`}>
                {getStatusText()}
              </span>
            </div>

            {syncStatus.lastSyncTime && (
              <div className="flex justify-between">
                <span className="text-gray-500">Last sync:</span>
                <span className="text-gray-700">
                  {formatTime(syncStatus.lastSyncTime)}
                </span>
              </div>
            )}

            {syncStatus.syncError && (
              <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                {syncStatus.syncError}
              </div>
            )}

            {syncStatus.pendingChanges && !syncStatus.isSyncing && (
              <button
                onClick={async () => {
                  await dataService.saveChanges();
                }}
                className="mt-2 w-full px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
              >
                Sync Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};