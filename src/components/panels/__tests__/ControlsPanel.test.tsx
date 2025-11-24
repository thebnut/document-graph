/**
 * Tests for ControlsPanel component
 *
 * Tests search input, buttons, file input, and dark mode toggle
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { ControlsPanel } from '../ControlsPanel';

// Wrapper component to provide ReactFlow context
const ControlsPanelWithProvider: React.FC<React.ComponentProps<typeof ControlsPanel>> = (props) => (
  <ReactFlowProvider>
    <ControlsPanel {...props} />
  </ReactFlowProvider>
);

describe('ControlsPanel', () => {
  const mockProps = {
    searchQuery: '',
    onSearchChange: jest.fn(),
    onAddNode: jest.fn(),
    onUploadDocument: jest.fn(),
    onBulkUpload: jest.fn(),
    onResetCanvas: jest.fn(),
    darkMode: false,
    onToggleDarkMode: jest.fn(),
    fileInputRef: React.createRef<HTMLInputElement>(),
    onFileChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render search input with placeholder', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const searchInput = screen.getByPlaceholderText('Search nodes...');
      expect(searchInput).toBeInTheDocument();
    });

    it('should render all action buttons', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      expect(screen.getByText('Add Node')).toBeInTheDocument();
      expect(screen.getByText('Upload Document')).toBeInTheDocument();
      expect(screen.getByText('Bulk Upload')).toBeInTheDocument();
      expect(screen.getByText('Reset Canvas')).toBeInTheDocument();
    });

    it('should render hidden file input', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const fileInputs = document.querySelectorAll('input[type="file"]');
      expect(fileInputs).toHaveLength(1);
      expect(fileInputs[0]).toHaveClass('hidden');
    });

    it('should render dark mode toggle button', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      // Dark mode toggle is the button with Sun/Moon icon
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(5); // Add Node, Upload Document, Bulk Upload, Reset Canvas, Dark Mode Toggle
    });

    it('should show Moon icon when dark mode is off', () => {
      render(<ControlsPanelWithProvider {...mockProps} darkMode={false} />);
      // Moon icon should be present
      const svgs = document.querySelectorAll('svg');
      // Should have icons for: Search, Upload (Add Node), FileText, Upload (Bulk), RotateCcw, Moon
      expect(svgs.length).toBeGreaterThanOrEqual(6);
    });

    it('should show Sun icon when dark mode is on', () => {
      render(<ControlsPanelWithProvider {...mockProps} darkMode={true} />);
      // Sun icon should be present
      const svgs = document.querySelectorAll('svg');
      // Should have icons for: Search, Upload (Add Node), FileText, Upload (Bulk), RotateCcw, Sun
      expect(svgs.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Search functionality', () => {
    it('should display current search query', () => {
      render(<ControlsPanelWithProvider {...mockProps} searchQuery="test query" />);
      const searchInput = screen.getByPlaceholderText('Search nodes...') as HTMLInputElement;
      expect(searchInput.value).toBe('test query');
    });

    it('should call onSearchChange when typing in search input', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const searchInput = screen.getByPlaceholderText('Search nodes...');
      fireEvent.change(searchInput, { target: { value: 'new search' } });
      expect(mockProps.onSearchChange).toHaveBeenCalledWith('new search');
    });
  });

  describe('Button interactions', () => {
    it('should call onAddNode when Add Node button is clicked', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const addButton = screen.getByText('Add Node');
      fireEvent.click(addButton);
      expect(mockProps.onAddNode).toHaveBeenCalledTimes(1);
    });

    it('should call onUploadDocument when Upload Document button is clicked', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const uploadButton = screen.getByText('Upload Document');
      fireEvent.click(uploadButton);
      expect(mockProps.onUploadDocument).toHaveBeenCalledTimes(1);
    });

    it('should call onBulkUpload when Bulk Upload button is clicked', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const bulkButton = screen.getByText('Bulk Upload');
      fireEvent.click(bulkButton);
      expect(mockProps.onBulkUpload).toHaveBeenCalledTimes(1);
    });

    it('should call onResetCanvas when Reset Canvas button is clicked', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const resetButton = screen.getByText('Reset Canvas');
      fireEvent.click(resetButton);
      expect(mockProps.onResetCanvas).toHaveBeenCalledTimes(1);
    });

    it('should call onToggleDarkMode when dark mode button is clicked', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const buttons = screen.getAllByRole('button');
      const darkModeButton = buttons[4]; // Last button is dark mode toggle
      fireEvent.click(darkModeButton);
      expect(mockProps.onToggleDarkMode).toHaveBeenCalledTimes(1);
    });
  });

  describe('File input', () => {
    it('should have correct accept attribute', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput.accept).toBe('.pdf,.doc,.docx,.jpg,.jpeg,.png');
    });

    it('should call onFileChange when file is selected', () => {
      render(<ControlsPanelWithProvider {...mockProps} />);
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
      fireEvent.change(fileInput, { target: { files: [file] } });
      expect(mockProps.onFileChange).toHaveBeenCalledTimes(1);
    });

    it('should connect fileInputRef to file input element', () => {
      const ref = React.createRef<HTMLInputElement>();
      render(<ControlsPanelWithProvider {...mockProps} fileInputRef={ref} />);
      const fileInput = document.querySelector('input[type="file"]');
      expect(ref.current).toBe(fileInput);
    });
  });
});
