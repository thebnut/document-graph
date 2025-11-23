/**
 * Tests for AddNodeModal component
 *
 * Tests modal visibility, form interactions, and submission
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddNodeModal } from '../AddNodeModal';

describe('AddNodeModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    onAdd: jest.fn(),
    darkMode: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Modal visibility', () => {
    it('should not render when isOpen is false', () => {
      render(<AddNodeModal {...mockProps} isOpen={false} />);
      expect(screen.queryByText('Add New Node')).not.toBeInTheDocument();
    });

    it('should render when isOpen is true', () => {
      render(<AddNodeModal {...mockProps} isOpen={true} />);
      expect(screen.getByText('Add New Node')).toBeInTheDocument();
    });
  });

  describe('Form rendering', () => {
    it('should render type select with all options', () => {
      render(<AddNodeModal {...mockProps} />);
      expect(screen.getByText('Type')).toBeInTheDocument();
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select).toBeInTheDocument();

      const options = Array.from(select.options).map(opt => opt.value);
      expect(options).toEqual(['person', 'pet', 'asset', 'document', 'folder']);
    });

    it('should render label input', () => {
      render(<AddNodeModal {...mockProps} />);
      expect(screen.getByText('Label')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter node label...')).toBeInTheDocument();
    });

    it('should render description textarea', () => {
      render(<AddNodeModal {...mockProps} />);
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter description...')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<AddNodeModal {...mockProps} />);
      expect(screen.getByRole('button', { name: 'Add Node' })).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<AddNodeModal {...mockProps} />);
      // Close button is the X icon button
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2); // Close button + Submit button
    });
  });

  describe('Form initialization', () => {
    it('should initialize with default values', () => {
      render(<AddNodeModal {...mockProps} />);
      const typeSelect = screen.getByRole('combobox') as HTMLSelectElement;
      const labelInput = screen.getByPlaceholderText('Enter node label...') as HTMLInputElement;
      const descriptionInput = screen.getByPlaceholderText('Enter description...') as HTMLTextAreaElement;

      expect(typeSelect.value).toBe('person');
      expect(labelInput.value).toBe('');
      expect(descriptionInput.value).toBe('');
    });

    it('should reset form when modal opens', async () => {
      const { rerender } = render(<AddNodeModal {...mockProps} isOpen={false} />);

      // Open modal and fill form
      rerender(<AddNodeModal {...mockProps} isOpen={true} />);
      const labelInput = screen.getByPlaceholderText('Enter node label...') as HTMLInputElement;
      fireEvent.change(labelInput, { target: { value: 'Test Label' } });
      expect(labelInput.value).toBe('Test Label');

      // Close and reopen modal
      rerender(<AddNodeModal {...mockProps} isOpen={false} />);
      rerender(<AddNodeModal {...mockProps} isOpen={true} />);

      // Form should be reset
      await waitFor(() => {
        const resetLabelInput = screen.getByPlaceholderText('Enter node label...') as HTMLInputElement;
        expect(resetLabelInput.value).toBe('');
      });
    });
  });

  describe('Form interactions', () => {
    it('should update type when selection changes', () => {
      render(<AddNodeModal {...mockProps} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;

      fireEvent.change(select, { target: { value: 'document' } });
      expect(select.value).toBe('document');
    });

    it('should update label when input changes', () => {
      render(<AddNodeModal {...mockProps} />);
      const input = screen.getByPlaceholderText('Enter node label...') as HTMLInputElement;

      fireEvent.change(input, { target: { value: 'New Label' } });
      expect(input.value).toBe('New Label');
    });

    it('should update description when textarea changes', () => {
      render(<AddNodeModal {...mockProps} />);
      const textarea = screen.getByPlaceholderText('Enter description...') as HTMLTextAreaElement;

      fireEvent.change(textarea, { target: { value: 'Test description' } });
      expect(textarea.value).toBe('Test description');
    });

    it('should show expiry date field when type is document', () => {
      render(<AddNodeModal {...mockProps} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;

      fireEvent.change(select, { target: { value: 'document' } });
      expect(screen.getByText('Expiry Date')).toBeInTheDocument();
      const dateInputs = document.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBeGreaterThan(0);
    });

    it('should not show expiry date field for non-document types', () => {
      render(<AddNodeModal {...mockProps} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;

      fireEvent.change(select, { target: { value: 'person' } });
      expect(screen.queryByText('Expiry Date')).not.toBeInTheDocument();

      fireEvent.change(select, { target: { value: 'pet' } });
      expect(screen.queryByText('Expiry Date')).not.toBeInTheDocument();
    });

    it('should update expiry date when changed', () => {
      render(<AddNodeModal {...mockProps} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'document' } });

      const expiryInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      expect(expiryInput).toBeInTheDocument();
      fireEvent.change(expiryInput, { target: { value: '2025-12-31' } });
      expect(expiryInput.value).toBe('2025-12-31');
    });
  });

  describe('Submit button state', () => {
    it('should disable submit button when label is empty', () => {
      render(<AddNodeModal {...mockProps} />);
      const submitButton = screen.getByRole('button', { name: 'Add Node' });
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when label is provided', () => {
      render(<AddNodeModal {...mockProps} />);
      const labelInput = screen.getByPlaceholderText('Enter node label...') as HTMLInputElement;
      const submitButton = screen.getByRole('button', { name: 'Add Node' });

      fireEvent.change(labelInput, { target: { value: 'Test Label' } });
      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('Form submission', () => {
    it('should call onAdd with form data and close modal when submitted', () => {
      render(<AddNodeModal {...mockProps} />);

      // Fill form
      const typeSelect = screen.getByRole('combobox') as HTMLSelectElement;
      const labelInput = screen.getByPlaceholderText('Enter node label...') as HTMLInputElement;
      const descriptionInput = screen.getByPlaceholderText('Enter description...') as HTMLTextAreaElement;

      fireEvent.change(typeSelect, { target: { value: 'asset' } });
      fireEvent.change(labelInput, { target: { value: 'My Asset' } });
      fireEvent.change(descriptionInput, { target: { value: 'Asset description' } });

      // Submit
      const submitButton = screen.getByRole('button', { name: 'Add Node' });
      fireEvent.click(submitButton);

      expect(mockProps.onAdd).toHaveBeenCalledWith({
        type: 'asset',
        label: 'My Asset',
        description: 'Asset description',
      });
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('should include expiry date in submission for document type', () => {
      render(<AddNodeModal {...mockProps} />);

      const typeSelect = screen.getByRole('combobox') as HTMLSelectElement;
      const labelInput = screen.getByPlaceholderText('Enter node label...') as HTMLInputElement;

      fireEvent.change(typeSelect, { target: { value: 'document' } });
      fireEvent.change(labelInput, { target: { value: 'My Document' } });

      const expiryInput = document.querySelector('input[type="date"]') as HTMLInputElement;
      fireEvent.change(expiryInput, { target: { value: '2025-12-31' } });

      const submitButton = screen.getByRole('button', { name: 'Add Node' });
      fireEvent.click(submitButton);

      expect(mockProps.onAdd).toHaveBeenCalledWith({
        type: 'document',
        label: 'My Document',
        description: '',
        expiry: '2025-12-31',
      });
    });

    it('should not submit when label is empty', () => {
      render(<AddNodeModal {...mockProps} />);

      const submitButton = screen.getByRole('button', { name: 'Add Node' });
      fireEvent.click(submitButton);

      expect(mockProps.onAdd).not.toHaveBeenCalled();
      expect(mockProps.onClose).not.toHaveBeenCalled();
    });
  });

  describe('Close button', () => {
    it('should call onClose when close button is clicked', () => {
      render(<AddNodeModal {...mockProps} />);

      const buttons = screen.getAllByRole('button');
      const closeButton = buttons[0]; // First button is the X close button

      fireEvent.click(closeButton);
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
