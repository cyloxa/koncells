"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, ChevronDown, X, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string, label: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  error?: string;
  className?: string;
  /** If true, user can type a custom value not in the list */
  allowCustom?: boolean;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found",
  error,
  className = "",
  allowCustom = false,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  // Also show the custom typed option if it doesn't match anything exactly
  const showCustomOption =
    allowCustom &&
    search.trim() &&
    !options.some(
      (o) => o.label.toLowerCase() === search.trim().toLowerCase()
    );

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = useCallback(
    (optValue: string, optLabel: string) => {
      onChange(optValue, optLabel);
      setIsOpen(false);
      setSearch("");
    },
    [onChange]
  );

  const handleCustom = useCallback(() => {
    // Use the search text as both value and label (custom brand name)
    onChange(search.trim(), search.trim());
    setIsOpen(false);
    setSearch("");
  }, [search, onChange]);

  const handleClear = useCallback(() => {
    onChange("", "");
  }, [onChange]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-all duration-200 ${
          isOpen
            ? "border-brand ring-2 ring-brand/20"
            : error
            ? "border-red-300 ring-1 ring-red-300"
            : "border-gray-300 hover:border-gray-400"
        } ${selectedLabel ? "text-gray-900" : "text-gray-400"}`}
      >
        <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
        <span className="flex-1 truncate">
          {selectedLabel || placeholder}
        </span>
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                handleClear();
              }
            }}
            className="p-0.5 text-gray-400 hover:text-gray-600 rounded cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Error */}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-in fade-in duration-150">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent bg-gray-50"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 && !showCustomOption ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400">{emptyMessage}</p>
              </div>
            ) : (
              <>
                {/* Custom option (type to add) */}
                {showCustomOption && (
                  <button
                    type="button"
                    onClick={handleCustom}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-brand-light/50 transition-colors border-b border-gray-100"
                  >
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-brand/10 text-brand">
                      <span className="text-xs font-bold">+</span>
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Add &quot;{search.trim()}&quot;
                      </p>
                      <p className="text-xs text-gray-400">
                        Use this custom brand name
                      </p>
                    </div>
                  </button>
                )}

                {/* Filtered options */}
                {filtered.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value, option.label)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-left text-sm transition-colors hover:bg-brand-light/30 ${
                      value === option.value
                        ? "bg-brand-light/20 text-brand font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    <span>{option.label}</span>
                    {value === option.value && (
                      <Check className="h-4 w-4 text-brand" />
                    )}
                  </button>
                ))}
              </>
            )}
          </div>

          {/* Footer count */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
            <p className="text-[11px] text-gray-400">
              {options.length} option{options.length !== 1 ? "s" : ""}
              {search && ` (${filtered.length} matching)`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
