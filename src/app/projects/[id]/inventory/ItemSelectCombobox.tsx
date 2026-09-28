"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ItemOption = {
  id: string;
  name: string;
  unit?: string;
  unitCost?: number;
};

interface ItemSelectComboboxProps {
  items: ItemOption[];
  value: string;
  onChange: (name: string, cost?: number) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ItemSelectCombobox({
  items,
  value,
  onChange,
  placeholder = "Select or search item...",
  disabled = false,
}: ItemSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setIsAddingNew(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        setIsAddingNew(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const uniqueItems = useMemo(() => {
    const map = new Map<string, ItemOption>();
    for (const item of items) {
      const key = item.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, item);
      }
    }
    return Array.from(map.values());
  }, [items]);

  const filteredItems = uniqueItems.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSelectItem = (item: ItemOption) => {
    onChange(item.name, item.unitCost);
    setOpen(false);
    setSearch("");
    setIsAddingNew(false);
  };

  const handleCreateNewItem = () => {
    const finalName = newItemName.trim() || search.trim();
    if (finalName) {
      onChange(finalName);
      setOpen(false);
      setSearch("");
      setNewItemName("");
      setIsAddingNew(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground",
        )}
      >
        <span className="truncate font-normal">{value || placeholder}</span>
        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-70" />
      </button>

      {/* Hidden input to hold state in form if needed */}
      <input type="hidden" name="itemName" value={value} required />

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[240px] rounded-md border border-slate-200 bg-white text-slate-900 shadow-lg animate-in fade-in-0 zoom-in-95">
          {!isAddingNew ? (
            <>
              {/* Search Box */}
              <div className="p-2 border-b border-slate-100 relative">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-4 top-3.5 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  placeholder="Search existing items..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 pl-7 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>

              {/* Items List */}
              <div className="max-h-48 overflow-y-auto p-1 space-y-0.5">
                {filteredItems.length === 0 ? (
                  <div className="p-3 text-center text-xs text-slate-500">
                    No items match &quot;{search}&quot;
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const isSelected =
                      value.toLowerCase() === item.name.toLowerCase();
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectItem(item)}
                        className={cn(
                          "flex items-center justify-between w-full px-2.5 py-1.5 text-xs text-left rounded transition-colors",
                          isSelected
                            ? "bg-slate-100 font-semibold text-slate-900"
                            : "hover:bg-slate-50 text-slate-700",
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Check
                            className={cn(
                              "h-3.5 w-3.5 text-blue-600 shrink-0",
                              isSelected ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="truncate">{item.name}</span>
                        </div>
                        {item.unitCost !== undefined && item.unitCost > 0 && (
                          <span className="text-[10px] font-mono text-slate-400 shrink-0 ml-2">
                            ₹{item.unitCost} / {item.unit}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Add New Item Button inside Dropdown */}
              <div className="p-1 border-t border-slate-100 bg-slate-50/50 rounded-b-md">
                <button
                  type="button"
                  onClick={() => {
                    setNewItemName(search);
                    setIsAddingNew(true);
                  }}
                  className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add New Item</span>
                </button>
              </div>
            </>
          ) : (
            /* Inline Create Item Mode */
            <div className="p-3 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                  <Plus className="h-3.5 w-3.5 text-blue-600" />
                  Add New Item
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-2">
                <Input
                  type="text"
                  autoFocus
                  placeholder="Enter new item name..."
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateNewItem();
                    }
                  }}
                  className="h-8 text-xs bg-white"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateNewItem}
                    disabled={!newItemName.trim() && !search.trim()}
                    className="h-7 text-xs w-full bg-blue-600 hover:bg-blue-700 text-white font-medium"
                  >
                    Confirm & Add
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAddingNew(false)}
                    className="h-7 text-xs"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
