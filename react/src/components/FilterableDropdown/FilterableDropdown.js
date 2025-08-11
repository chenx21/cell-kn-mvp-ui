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

// Helper function to get a consistent string representation for sorting and display.
const getDisplayString = (value) => {
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return String(value);
};

/**
 * A searchable, multi-select dropdown component for filtering.
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

  // Memoized, sorted, and filtered list of options to display.
  const filteredOptions = useMemo(() => {
    // Sort options: handles strings and arrays of strings.
    const sorted = [...options].sort((a, b) => {
      const valA = getDisplayString(a).toLowerCase();
      const valB = getDisplayString(b).toLowerCase();
      return valA.localeCompare(valB);
    });

    // Filter by search term if one exists.
    if (!searchTerm) {
      return sorted;
    }
    return sorted.filter((option) =>
      getDisplayString(option).toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [options, searchTerm]);

  // Helper to check if an option is selected.
  const isSelected = (option) => {
    if (Array.isArray(option)) {
      const optAsString = JSON.stringify(option);
      return selectedOptions.some(
        (item) => JSON.stringify(item) === optAsString,
      );
    }
    return selectedOptions.includes(option);
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
                key={getDisplayString(option)}
                className={`dropdown-item ${isSelected(option) ? "selected" : ""}`}
                onClick={() => {
                  onOptionToggle(option);
                  // Optional: clear search term after selection.
                  // setSearchTerm("");
                }}
              >
                {getDisplayString(option)}
              </li>
            ))
          ) : (
            <li className="dropdown-item-none">No matches found</li>
          )}
        </ul>
      )}

      {/* Display selected options below input */}
      <div className="selected-options-pills">
        {selectedOptions.map((option) => (
          <div key={getDisplayString(option)} className="pill">
            {getDisplayString(option)}
            <button
              className="pill-remove"
              onClick={() => onOptionToggle(option)}
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
