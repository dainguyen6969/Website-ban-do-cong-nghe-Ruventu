// Reusable admin UI primitive: FilterDropdown / CustomSelect.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import './FilterDropdown.css';

export default function FilterDropdown({
  label,
  options,
  children,
  defaultValue,
  value,
  onChange,
  onSelect,
  id,
  name,
  className = '',
  selectedDark = true,
  direction = 'down',
  disabled = false,
  placeholder,
  style,
  'aria-label': ariaLabel,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Normalize options from either props.options OR children (<option> tags)
  const normalizedOptions = useMemo(() => {
    const list = [];

    if (Array.isArray(options) && options.length > 0) {
      options.forEach((opt) => {
        if (opt === null || opt === undefined) return;
        if (typeof opt === 'string' || typeof opt === 'number') {
          list.push({ value: String(opt), label: String(opt) });
        } else if (Array.isArray(opt)) {
          list.push({ value: String(opt[0]), label: String(opt[1] ?? opt[0]) });
        } else if (typeof opt === 'object') {
          const val = opt.value !== undefined ? opt.value : (opt.id ?? opt.key ?? opt.code ?? opt.label);
          const lbl = opt.label !== undefined ? opt.label : (opt.name ?? opt.title ?? opt.text ?? val);
          list.push({ value: String(val ?? ''), label: String(lbl ?? ''), disabled: !!opt.disabled });
        }
      });
    } else if (children) {
      React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;
        if (child.type === 'option') {
          const val = child.props.value !== undefined ? String(child.props.value) : String(child.props.children ?? '');
          const lbl = child.props.children !== undefined ? String(child.props.children) : val;
          list.push({ value: val, label: lbl, disabled: !!child.props.disabled });
        } else if (child.type === 'optgroup') {
          React.Children.forEach(child.props.children, (subChild) => {
            if (React.isValidElement(subChild) && subChild.type === 'option') {
              const val = subChild.props.value !== undefined ? String(subChild.props.value) : String(subChild.props.children ?? '');
              const lbl = subChild.props.children !== undefined ? String(subChild.props.children) : val;
              list.push({ value: val, label: lbl, disabled: !!subChild.props.disabled });
            }
          });
        }
      });
    }

    return list;
  }, [options, children]);

  // Determine effective default value
  const effectiveDefault = useMemo(() => {
    if (defaultValue !== undefined && defaultValue !== null) return String(defaultValue);
    return normalizedOptions[0]?.value ?? '';
  }, [defaultValue, normalizedOptions]);

  const [internalValue, setInternalValue] = useState(effectiveDefault);

  const isControlled = value !== undefined && value !== null;
  const currentVal = String(isControlled ? value : internalValue);

  // Find currently selected option object
  const currentOption = normalizedOptions.find((opt) => String(opt.value) === currentVal);
  const displayLabel = currentOption ? currentOption.label : (currentVal || placeholder || '');

  // Active/selected check for dark styling
  const isDefault =
    currentVal === effectiveDefault ||
    currentVal === '' ||
    currentVal === 'ALL' ||
    currentVal === 'all' ||
    (normalizedOptions.length > 0 && currentVal === normalizedOptions[0]?.value);

  const isSelected = selectedDark && !isDefault;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    if (option.disabled) return;
    if (!isControlled) {
      setInternalValue(option.value);
    }
    setIsOpen(false);

    if (onChange) {
      onChange({
        target: {
          value: option.value,
          name: name || id || '',
        },
      });
    }
    if (onSelect) {
      onSelect(option.value);
    }
    dropdownRef.current?.querySelector('button')?.focus();
  };

  useEffect(() => {
    if (!isOpen) return;
    const active = dropdownRef.current?.querySelector('[aria-selected="true"]:not([aria-disabled="true"])');
    (active || dropdownRef.current?.querySelector('[role="option"]:not([aria-disabled="true"])'))?.focus();
  }, [isOpen]);

  const handleOptionKeyDown = (event, option) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleSelect(option);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      setIsOpen(false);
      dropdownRef.current?.querySelector('button')?.focus();
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const items = [...event.currentTarget.parentElement.querySelectorAll('[role="option"]:not([aria-disabled="true"])')];
      const index = items.indexOf(event.currentTarget);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 :
        (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setIsOpen((prev) => !prev);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setIsOpen(false);
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div
      className={`filter-dropdown-container ${className} ${isOpen ? 'filter-dropdown-container--open' : ''} ${disabled ? 'filter-dropdown-container--disabled' : ''}`}
      ref={dropdownRef}
      id={id}
      style={style}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
    >
      <button
        type="button"
        disabled={disabled}
        className={`filter__dropdown ${isOpen ? 'filter__dropdown--open' : ''} ${isSelected ? 'filter__dropdown--selected-dark' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || displayLabel}
      >
        <span className="filter__dropdown-label">
          {label ? (
            <>
              {label}: <strong>{displayLabel}</strong>
            </>
          ) : (
            <strong>{displayLabel}</strong>
          )}
        </span>
        <HiOutlineChevronDown
          size={14}
          className={`filter__dropdown-chevron ${isOpen ? 'filter__dropdown-chevron--open' : ''}`}
        />
      </button>

      {isOpen && normalizedOptions.length > 0 && (
        <ul
          className={`filter__dropdown-menu ${direction === 'up' ? 'filter__dropdown-menu--up' : ''}`}
          role="listbox"
        >
          {normalizedOptions.map((option, idx) => {
            const isItemActive = String(option.value) === currentVal;
            return (
              <li
                key={`${option.value}-${idx}`}
                className={`filter__dropdown-item ${isItemActive ? 'filter__dropdown-item--selected' : ''} ${option.disabled ? 'filter__dropdown-item--disabled' : ''}`}
                onClick={() => handleSelect(option)}
                onKeyDown={(event) => handleOptionKeyDown(event, option)}
                tabIndex={isItemActive && !option.disabled ? 0 : -1}
                role="option"
                aria-selected={isItemActive}
                aria-disabled={option.disabled || undefined}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
