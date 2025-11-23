/**
 * Add Node Modal Component
 *
 * Modal dialog for adding new nodes to the graph
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { NodeData } from '../../services/dataService-adapter';

interface AddNodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (nodeData: Partial<NodeData>) => void;
  darkMode: boolean;
}

export const AddNodeModal: React.FC<AddNodeModalProps> = ({ isOpen, onClose, onAdd, darkMode }) => {
  const [formData, setFormData] = useState<Partial<NodeData>>({
    type: 'person',
    label: '',
    description: '',
  });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        type: 'person',
        label: '',
        description: '',
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!formData.label) return;
    onAdd(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Add New Node</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as NodeData['type'] })}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
            >
              <option value="person">Person</option>
              <option value="pet">Pet</option>
              <option value="asset">Asset</option>
              <option value="document">Document</option>
              <option value="folder">Folder</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Label</label>
            <input
              type="text"
              value={formData.label}
              onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              placeholder="Enter node label..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              rows={3}
              placeholder="Enter description..."
            />
          </div>

          {formData.type === 'document' && (
            <div>
              <label className="block text-sm font-medium mb-1">Expiry Date</label>
              <input
                type="date"
                value={formData.expiry || ''}
                onChange={(e) => setFormData({ ...formData, expiry: e.target.value })}
                className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              />
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={!formData.label}
            className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg py-2 transition-colors"
          >
            Add Node
          </button>
        </div>
      </div>
    </div>
  );
};
