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
 * Handle duplicates and mixed data types (strings/arrays).
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

    // Flatten and map options.
    options.forEach((originalOption) => {
      if (Array.isArray(originalOption)) {
        // If option is an array, treat each item as a separate choice.
        originalOption.forEach((subValue) => {
          // The key is the display string, value is the original option for dispatching.
          optionMap.set(subValue, originalOption);
        });
      } else {
        // If option is a string, it maps to itself.
        const displayString = getDisplayString(originalOption);
        optionMap.set(displayString, originalOption);
      }
    });

    // Convert map to an array of objects and sort alphabetically.
    return Array.from(optionMap.entries())
      .map(([display, original]) => ({ display, original }))
      .sort((a, b) =>
        a.display.toLowerCase().localeCompare(b.display.toLowerCase()),
      );
  }, [options]);

  // Memoized and filtered list to display in the dropdown.
  const filteredOptions = useMemo(() => {
    if (!searchTerm) {
      return processedOptions;
    }
    return processedOptions.filter((option) =>
      option.display.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [processedOptions, searchTerm]);

  // Helper to check if an option's original value is in the selected list.
  const isSelected = (option) => {
    const originalValue = option.original;
    if (Array.isArray(originalValue)) {
      const optAsString = JSON.stringify(originalValue);
      return selectedOptions.some(
        (item) => JSON.stringify(item) === optAsString,
      );
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
                  /* Dispatch the original value (string or array). */
                  onOptionToggle(option.original);
                }}
              >
                {/* Show the clean, flattened display string. */}
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
