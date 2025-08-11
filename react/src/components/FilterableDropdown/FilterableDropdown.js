import React, { useState, useMemo, useRef, useEffect } from "react";

// Helper hook to detect clicks outside a component.
const useClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
    };
  }, [ref, handler]);
};

// Helper function to get a consistent string representation for display.
const getDisplayString = (value) => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
};

/**
 * A searchable, multi-select dropdown component for filtering.
 * Handle duplicates, mixed data types, and space/underscore matching.
 */
const FilterableDropdown = ({
  label,
  options,
  selectedOptions,
  onOptionToggle,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside.
  useClickOutside(wrapperRef, () => setIsOpen(false));

  // Process options to be flat, unique, and mapped to original values.
  const processedOptions = useMemo(() => {
    const optionMap = new Map();
    options.forEach((originalOption) => {
      if (Array.isArray(originalOption)) {
        originalOption.forEach((subValue) => {
          optionMap.set(subValue, originalOption);
        });
      } else {
        const displayString = getDisplayString(originalOption);
        optionMap.set(displayString, originalOption);
      }
    });
    return Array.from(optionMap.entries())
      .map(([display, original]) => ({ display, original }))
      .sort((a, b) => a.display.toLowerCase().localeCompare(b.display.toLowerCase()));
  }, [options]);

  // Memoized and filtered list to display in the dropdown.
  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return processedOptions;
    }

    // Normalize the user's search term.
    const normalizedSearchTerm = searchTerm.toLowerCase();

    return processedOptions.filter((option) => {
      // Normalize the option's display text by replacing underscores with spaces.
      const normalizedOptionDisplay = option.display
        .toLowerCase()
        .replaceAll("_", " ");

      // Perform the inclusion check on the normalized strings.
      return normalizedOptionDisplay.includes(normalizedSearchTerm);
    });
  }, [processedOptions, searchTerm]);

  // Helper to check if an option is selected.
  const isSelected = (option) => {
    const originalValue = option.original;
    if (Array.isArray(originalValue)) {
      const optAsString = JSON.stringify(originalValue);
      return selectedOptions.some(item => JSON.stringify(item) === optAsString);
    }
    return selectedOptions.includes(originalValue);
  };

  return (
    <div className="filterable-dropdown" ref={wrapperRef}>
      <input
        type="text"
        className="dropdown-input"
        placeholder={`Search ${label}...`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
      />

      {isOpen && (
        <ul className="dropdown-list">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <li
                key={option.display}
                className={`dropdown-item ${isSelected(option) ? "selected" : ""}`}
                onClick={() => {
                  onOptionToggle(option.original);
                }}
              >
                {option.display}
              </li>
            ))
          ) : (
            <li className="dropdown-item-none">No matches found</li>
          )}
        </ul>
      )}

      {/* Display selected options as "pills" below the input */}
      <div className="selected-options-pills">
        {selectedOptions.map((originalOption) => (
          <div key={getDisplayString(originalOption)} className="pill">
            {getDisplayString(originalOption)}
            <button
              className="pill-remove"
              onClick={() => onOptionToggle(originalOption)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FilterableDropdown;