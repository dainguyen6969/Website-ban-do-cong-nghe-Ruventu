// Reusable admin UI primitive: FilterDropdown / CustomSelect.
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import './FilterDropdown.css';

export function FormDropdown(props) {
  return <FilterDropdown {...props} formField selectedDark={false} />;
}

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
  formField = false,
  required = false,
  selectedDark = true,
  direction = 'down',
  disabled = false,
  placeholder,
  style,
  title,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  'aria-describedby': ariaDescribedBy,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [invalid, setInvalid] = useState(false);
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
      const addOption = (option, group, groupDisabled) => {
        if (!React.isValidElement(option) || option.type !== 'option') return;
        const { value, label, children: content, disabled, hidden } = option.props;
        if (hidden) return;
        const text = label ?? React.Children.toArray(content).join('');
        list.push({ value: String(value ?? text), label: text, disabled: disabled || groupDisabled, group });
      };
      React.Children.forEach(children, (child) => {
        if (!React.isValidElement(child)) return;
        if (child.type === 'optgroup') {
          React.Children.forEach(child.props.children, (option) =>
            addOption(option, child.props.label, child.props.disabled),
          );
        } else {
          addOption(child);
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
    setInvalid(false);

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
    const dropdown = dropdownRef.current;
    const menu = dropdown?.querySelector('[role="listbox"]');
    if (formField && menu) {
      const rect = dropdown.getBoundingClientRect();
      let top = 0;
      let bottom = window.innerHeight;
      for (let parent = dropdown.parentElement; parent; parent = parent.parentElement) {
        if (!/auto|scroll|hidden|clip/.test(getComputedStyle(parent).overflowY)) continue;
        const bounds = parent.getBoundingClientRect();
        top = Math.max(top, bounds.top);
        bottom = Math.min(bottom, bounds.bottom);
      }
      const above = rect.top - top;
      const below = bottom - rect.bottom;
      const opensUp = below < Math.min(280, menu.scrollHeight) && above > below;
      menu.classList.toggle('filter__dropdown-menu--up', opensUp);
      menu.style.maxHeight = `${Math.max(0, Math.min(280, (opensUp ? above : below) - 4))}px`;
    }
    const active = menu?.querySelector('[aria-selected="true"]:not([aria-disabled="true"])');
    (active || menu?.querySelector('[role="option"]:not([aria-disabled="true"])'))?.focus();
  }, [isOpen, formField]);

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
      className={`filter-dropdown-container ${formField ? 'filter-dropdown--form' : className} ${isOpen ? 'filter-dropdown-container--open' : ''} ${disabled ? 'filter-dropdown-container--disabled' : ''}`}
      ref={dropdownRef}
      id={formField ? undefined : id}
      style={style}
      onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false); }}
    >
      <button
        type="button"
        id={formField ? id : undefined}
        title={title}
        disabled={disabled}
        className={`filter__dropdown ${formField ? className : ''} ${isOpen ? 'filter__dropdown--open' : ''} ${isSelected ? 'filter__dropdown--selected-dark' : ''}`}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || label || (formField ? undefined : displayLabel)}
        aria-invalid={invalid || ariaInvalid}
        aria-describedby={ariaDescribedBy}
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

      {formField && (name || required) && (
        <select
          className="filter-dropdown__validation"
          aria-hidden="true"
          tabIndex={-1}
          name={name}
          required={required}
          disabled={disabled}
          value={currentVal}
          onChange={onChange}
          onInvalid={(event) => {
            event.preventDefault();
            setInvalid(true);
            dropdownRef.current?.querySelector('button')?.focus();
          }}
        >
          {children}
        </select>
      )}
      {invalid && (
        <small className="filter-dropdown__error" role="alert">Vui lòng chọn một mục.</small>
      )}

      {isOpen && normalizedOptions.length > 0 && (
        <ul
          className={`filter__dropdown-menu ${direction === 'up' ? 'filter__dropdown-menu--up' : ''}`}
          role="listbox"
        >
          {normalizedOptions.map((option, idx) => {
            const isItemActive = String(option.value) === currentVal;
            return (
              <React.Fragment key={`${option.value}-${idx}`}>
                {option.group && option.group !== normalizedOptions[idx - 1]?.group && (
                  <li className="filter__dropdown-group" role="presentation">{option.group}</li>
                )}
                <li
                  className={`filter__dropdown-item ${isItemActive ? 'filter__dropdown-item--selected' : ''} ${option.disabled ? 'filter__dropdown-item--disabled' : ''}`}
                  onClick={(event) => {
                    event.preventDefault();
                    handleSelect(option);
                  }}
                  onKeyDown={(event) => handleOptionKeyDown(event, option)}
                  tabIndex={isItemActive && !option.disabled ? 0 : -1}
                  role="option"
                  aria-selected={isItemActive}
                  aria-disabled={option.disabled || undefined}
                >
                  {option.label}
                </li>
              </React.Fragment>
            );
          })}
        </ul>
      )}
    </div>
  );
}
