// Enhanced ARIA utilities for comprehensive screen reader support
import { useEffect, useRef, useState, useCallback } from 'react';
import { announceToScreenReader } from './accessibility-utils';

// Enhanced ARIA live region manager
export class AriaLiveRegionManager {
  private static instance: AriaLiveRegionManager;
  private politeRegion: HTMLElement | null = null;
  private assertiveRegion: HTMLElement | null = null;
  private statusRegion: HTMLElement | null = null;

  static getInstance(): AriaLiveRegionManager {
    if (!AriaLiveRegionManager.instance) {
      AriaLiveRegionManager.instance = new AriaLiveRegionManager();
    }
    return AriaLiveRegionManager.instance;
  }

  constructor() {
    this.createLiveRegions();
  }

  private createLiveRegions() {
    if (typeof document === 'undefined') return;

    // Polite announcements (non-interrupting)
    if (!this.politeRegion) {
      this.politeRegion = document.createElement('div');
      this.politeRegion.setAttribute('aria-live', 'polite');
      this.politeRegion.setAttribute('aria-atomic', 'true');
      this.politeRegion.setAttribute('aria-relevant', 'all');
      this.politeRegion.className = 'sr-only';
      this.politeRegion.id = 'aria-live-polite';
      document.body.appendChild(this.politeRegion);
    }

    // Assertive announcements (interrupting)
    if (!this.assertiveRegion) {
      this.assertiveRegion = document.createElement('div');
      this.assertiveRegion.setAttribute('aria-live', 'assertive');
      this.assertiveRegion.setAttribute('aria-atomic', 'true');
      this.assertiveRegion.setAttribute('aria-relevant', 'all');
      this.assertiveRegion.className = 'sr-only';
      this.assertiveRegion.id = 'aria-live-assertive';
      document.body.appendChild(this.assertiveRegion);
    }

    // Status announcements (for form validation, etc.)
    if (!this.statusRegion) {
      this.statusRegion = document.createElement('div');
      this.statusRegion.setAttribute('role', 'status');
      this.statusRegion.setAttribute('aria-live', 'polite');
      this.statusRegion.setAttribute('aria-atomic', 'true');
      this.statusRegion.className = 'sr-only';
      this.statusRegion.id = 'aria-status';
      document.body.appendChild(this.statusRegion);
    }
  }

  announce(message: string, priority: 'polite' | 'assertive' | 'status' = 'polite') {
    const region = this.getRegion(priority);
    if (!region) return;

    // Clear previous content
    region.textContent = '';
    
    // Add new content after a brief delay to ensure screen readers notice the change
    setTimeout(() => {
      region.textContent = message;
    }, 10);

    // Clear after announcement to prevent repetition
    setTimeout(() => {
      region.textContent = '';
    }, 3000);
  }

  private getRegion(priority: 'polite' | 'assertive' | 'status'): HTMLElement | null {
    switch (priority) {
      case 'assertive': return this.assertiveRegion;
      case 'status': return this.statusRegion;
      default: return this.politeRegion;
    }
  }
}

// Hook for managing ARIA live announcements
export function useAriaLive() {
  const manager = AriaLiveRegionManager.getInstance();

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' | 'status' = 'polite') => {
    manager.announce(message, priority);
  }, [manager]);

  return { announce };
}

// Enhanced ARIA describedby manager
export function useAriaDescribedBy() {
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});

  const addDescription = useCallback((id: string, content: string) => {
    setDescriptions(prev => ({ ...prev, [id]: content }));

    // Create or update the description element
    let element = document.getElementById(`desc-${id}`);
    if (!element) {
      element = document.createElement('div');
      element.id = `desc-${id}`;
      element.className = 'sr-only';
      document.body.appendChild(element);
    }
    element.textContent = content;

    return `desc-${id}`;
  }, []);

  const removeDescription = useCallback((id: string) => {
    setDescriptions(prev => {
      const newDescriptions = { ...prev };
      delete newDescriptions[id];
      return newDescriptions;
    });

    const element = document.getElementById(`desc-${id}`);
    if (element) {
      document.body.removeChild(element);
    }
  }, []);

  const getDescriptionId = useCallback((id: string) => {
    return descriptions[id] ? `desc-${id}` : undefined;
  }, [descriptions]);

  return { addDescription, removeDescription, getDescriptionId };
}

// ARIA expanded state management
export function useAriaExpanded(initialState = false) {
  const [isExpanded, setIsExpanded] = useState(initialState);
  const { announce } = useAriaLive();

  const toggle = useCallback((customMessage?: string) => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    
    const message = customMessage || `${newState ? 'Expanded' : 'Collapsed'}`;
    announce(message, 'polite');
  }, [isExpanded, announce]);

  const expand = useCallback((customMessage?: string) => {
    if (!isExpanded) {
      setIsExpanded(true);
      const message = customMessage || 'Expanded';
      announce(message, 'polite');
    }
  }, [isExpanded, announce]);

  const collapse = useCallback((customMessage?: string) => {
    if (isExpanded) {
      setIsExpanded(false);
      const message = customMessage || 'Collapsed';
      announce(message, 'polite');
    }
  }, [isExpanded, announce]);

  return {
    isExpanded,
    'aria-expanded': isExpanded,
    toggle,
    expand,
    collapse
  };
}

// ARIA selected state management for lists and grids
export function useAriaSelected() {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const { announce } = useAriaLive();

  const select = useCallback((id: string, itemName?: string) => {
    setSelectedItems(prev => new Set([...prev, id]));
    const message = itemName ? `${itemName} selected` : 'Item selected';
    announce(message, 'polite');
  }, [announce]);

  const deselect = useCallback((id: string, itemName?: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
    const message = itemName ? `${itemName} deselected` : 'Item deselected';
    announce(message, 'polite');
  }, [announce]);

  const toggle = useCallback((id: string, itemName?: string) => {
    if (selectedItems.has(id)) {
      deselect(id, itemName);
    } else {
      select(id, itemName);
    }
  }, [selectedItems, select, deselect]);

  const isSelected = useCallback((id: string) => selectedItems.has(id), [selectedItems]);

  const getAriaSelected = useCallback((id: string) => ({
    'aria-selected': isSelected(id)
  }), [isSelected]);

  return {
    selectedItems,
    select,
    deselect,
    toggle,
    isSelected,
    getAriaSelected
  };
}

// ARIA form field enhancement
export function useAriaFormField(fieldName: string, options: {
  required?: boolean;
  description?: string;
  errorMessage?: string;
  validationState?: 'valid' | 'invalid' | 'pending';
}) {
  const { addDescription, getDescriptionId } = useAriaDescribedBy();
  const { announce } = useAriaLive();
  const [fieldId] = useState(() => `field-${fieldName}-${Math.random().toString(36).substr(2, 9)}`);

  // Add description if provided
  useEffect(() => {
    if (options.description) {
      addDescription(fieldId, options.description);
    }
  }, [fieldId, options.description, addDescription]);

  // Announce validation changes
  useEffect(() => {
    if (options.errorMessage && options.validationState === 'invalid') {
      announce(`${fieldName}: ${options.errorMessage}`, 'assertive');
    } else if (options.validationState === 'valid') {
      announce(`${fieldName} is valid`, 'status');
    }
  }, [options.errorMessage, options.validationState, fieldName, announce]);

  const fieldProps = {
    id: fieldId,
    'aria-invalid': options.validationState === 'invalid',
    'aria-required': options.required,
    'aria-describedby': [
      getDescriptionId(fieldId),
      options.errorMessage ? `${fieldId}-error` : null
    ].filter(Boolean).join(' ') || undefined
  };

  const labelProps = {
    htmlFor: fieldId
  };

  const errorProps = options.errorMessage ? {
    id: `${fieldId}-error`,
    role: 'alert',
    'aria-live': 'polite'
  } : {};

  return {
    fieldProps,
    labelProps,
    errorProps,
    fieldId
  };
}

// ARIA breadcrumb navigation
export function useBreadcrumbNavigation(items: Array<{ label: string; href?: string; current?: boolean }>) {
  const { announce } = useAriaLive();

  const breadcrumbProps = {
    'aria-label': 'Breadcrumb navigation',
    role: 'navigation'
  };

  const getItemProps = useCallback((item: typeof items[0], index: number) => {
    const isLast = index === items.length - 1;
    const isCurrent = item.current || isLast;

    return {
      'aria-current': isCurrent ? 'page' : undefined,
      role: item.href && !isCurrent ? 'link' : undefined,
      'aria-label': isCurrent ? `Current page: ${item.label}` : undefined
    };
  }, []);

  const announceBreadcrumb = useCallback(() => {
    const path = items.map(item => item.label).join(' > ');
    announce(`Breadcrumb navigation: ${path}`, 'polite');
  }, [items, announce]);

  return {
    breadcrumbProps,
    getItemProps,
    announceBreadcrumb
  };
}

// ARIA data table enhancements
export function useDataTableAria(options: {
  caption?: string;
  sortable?: boolean;
  selectable?: boolean;
}) {
  const { announce } = useAriaLive();
  const [sortState, setSortState] = useState<{ column: string; direction: 'asc' | 'desc' } | null>(null);

  const tableProps = {
    role: 'table',
    'aria-label': options.caption || 'Data table',
    'aria-describedby': options.caption ? 'table-caption' : undefined
  };

  const getHeaderProps = useCallback((columnKey: string, columnLabel: string) => {
    const isSorted = sortState?.column === columnKey;
    
    return {
      role: 'columnheader',
      scope: 'col' as const,
      'aria-sort': isSorted ? sortState.direction : (options.sortable ? 'none' : undefined),
      'aria-label': options.sortable 
        ? `${columnLabel}, ${isSorted ? `sorted ${sortState.direction}ending` : 'sortable'}`
        : columnLabel,
      tabIndex: options.sortable ? 0 : undefined,
      onClick: options.sortable ? () => handleSort(columnKey, columnLabel) : undefined,
      onKeyDown: options.sortable ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSort(columnKey, columnLabel);
        }
      } : undefined
    };
  }, [sortState, options.sortable]);

  const handleSort = useCallback((columnKey: string, columnLabel: string) => {
    const newDirection = sortState?.column === columnKey && sortState.direction === 'asc' ? 'desc' : 'asc';
    setSortState({ column: columnKey, direction: newDirection });
    
    announce(`Table sorted by ${columnLabel} in ${newDirection}ending order`, 'polite');
  }, [sortState, announce]);

  const getRowProps = useCallback((rowIndex: number, isSelected?: boolean) => ({
    role: 'row',
    'aria-rowindex': rowIndex + 1,
    'aria-selected': options.selectable ? isSelected : undefined
  }), [options.selectable]);

  const getCellProps = useCallback((columnIndex: number) => ({
    role: 'cell',
    'aria-colindex': columnIndex + 1
  }), []);

  return {
    tableProps,
    getHeaderProps,
    getRowProps,
    getCellProps,
    sortState
  };
}

// Progress indicator with ARIA support
export function useAriaProgress(value: number, max: number = 100, label?: string) {
  const { announce } = useAriaLive();
  const previousValue = useRef(value);

  // Announce progress changes
  useEffect(() => {
    if (value !== previousValue.current) {
      const percentage = Math.round((value / max) * 100);
      const message = label 
        ? `${label}: ${percentage}% complete`
        : `Progress: ${percentage}% complete`;
      
      // Only announce significant changes to avoid spam
      if (Math.abs(value - previousValue.current) >= max * 0.05) {
        announce(message, 'status');
      }
      
      previousValue.current = value;
    }
  }, [value, max, label, announce]);

  const progressProps = {
    role: 'progressbar',
    'aria-valuenow': value,
    'aria-valuemin': 0,
    'aria-valuemax': max,
    'aria-label': label,
    'aria-valuetext': `${Math.round((value / max) * 100)}% complete`
  };

  return { progressProps };
}

// Dialog/Modal ARIA management
export function useDialogAria(isOpen: boolean, title: string, description?: string) {
  const { announce } = useAriaLive();
  const titleId = `dialog-title-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description ? `dialog-desc-${Math.random().toString(36).substr(2, 9)}` : undefined;

  useEffect(() => {
    if (isOpen) {
      announce(`Dialog opened: ${title}`, 'polite');
    } else {
      announce('Dialog closed', 'polite');
    }
  }, [isOpen, title, announce]);

  const dialogProps = {
    role: 'dialog',
    'aria-modal': true,
    'aria-labelledby': titleId,
    'aria-describedby': descriptionId
  };

  const titleProps = {
    id: titleId
  };

  const descriptionProps = descriptionId ? {
    id: descriptionId
  } : {};

  return {
    dialogProps,
    titleProps,
    descriptionProps
  };
}