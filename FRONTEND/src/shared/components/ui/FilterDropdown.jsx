// Reusable admin UI primitive: FilterDropdown.
import { useState, useRef, useEffect } from 'react';
import { HiOutlineChevronDown } from 'react-icons/hi';
import './FilterDropdown.css';

export default function FilterDropdown({
  label,
  options,
  defaultValue,
  value,
  onSelect,
  id,
  className = '',
  selectedDark = false,
  direction = 'down',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue || options[0]);
  const dropdownRef = useRef(null);

  const selectedValue = value !== undefined ? value : internalValue;
  const isSelected = selectedDark && selectedValue !== (defaultValue || options[0]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    setInternalValue(option);
    setIsOpen(false);
    if (onSelect) onSelect(option);
  };

  return (
    <div
      className={`filter-dropdown-container ${className} ${isOpen ? 'filter-dropdown-container--open' : ''}`}
      ref={dropdownRef}
      id={id}
    >
      <button
        type="button"
        className={`filter__dropdown ${isOpen ? 'filter__dropdown--open' : ''} ${isSelected ? 'filter__dropdown--selected-dark' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="filter__dropdown-label">
          {label ? (
            <>
              {label}: <strong>{selectedValue}</strong>
            </>
          ) : (
            <strong>{selectedValue}</strong>
          )}
        </span>
        <HiOutlineChevronDown
          size={14}
          className={`filter__dropdown-chevron ${isOpen ? 'filter__dropdown-chevron--open' : ''}`}
        />
      </button>

      {isOpen && (
        <ul
          className={`filter__dropdown-menu ${direction === 'up' ? 'filter__dropdown-menu--up' : ''}`}
          role="listbox"
        >
          {options.map((option) => (
            <li
              key={option}
              className={`filter__dropdown-item ${selectedValue === option ? 'filter__dropdown-item--selected' : ''}`}
              onClick={() => handleSelect(option)}
              role="option"
              aria-selected={selectedValue === option}
            >
              {option}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
