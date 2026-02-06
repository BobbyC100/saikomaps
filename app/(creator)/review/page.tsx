'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import styles from './review.module.css';

interface Location {
  id: string;
  name: string;
  address?: string;
  url?: string;
  comment?: string;
}

export default function ReviewLocationsPage() {
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load locations from localStorage
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('importedLocations');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const withIds = parsed.map((loc: any, index: number) => ({
          ...loc,
          id: loc.id || `loc-${index}-${Date.now()}`,
          name: loc.Title || loc.Name || loc.name || 'Untitled Location',
          address: loc.Address || loc.address,
          url: loc.URL || loc.url,
          comment: loc.Comment || loc.Note || loc.comment || null,
        }));
        setLocations(withIds);
      } catch (error) {
        console.error('Error loading locations:', error);
      }
    } else {
      // If no locations in localStorage, redirect to import
      router.push('/import');
    }
  }, [router]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === locations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(locations.map(loc => loc.id)));
    }
  };

  const handleRemoveSelected = () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Remove ${selectedIds.size} selected location(s)? This cannot be undone.`)) return;

    const remaining = locations.filter(loc => !selectedIds.has(loc.id));
    setLocations(remaining);
    setSelectedIds(new Set());
    localStorage.setItem('importedLocations', JSON.stringify(remaining));
  };

  const handleUpdateName = (id: string, newName: string) => {
    const updated = locations.map(loc =>
      loc.id === id ? { ...loc, name: newName } : loc
    );
    setLocations(updated);
    localStorage.setItem('importedLocations', JSON.stringify(updated));
    setEditingNameId(null);
  };

  const handleUpdateNote = (id: string, newNote: string) => {
    const updated = locations.map(loc =>
      loc.id === id ? { ...loc, comment: newNote || undefined } : loc
    );
    setLocations(updated);
    localStorage.setItem('importedLocations', JSON.stringify(updated));
    setEditingNoteId(null);
  };

  const handleContinue = () => {
    if (locations.length === 0) {
      alert('No locations to continue');
      return;
    }
    router.push('/templates');
  };

  if (!mounted) {
    return (
      <div className={styles.pageWrapper}>
        <nav className={styles.nav}>
          <Link href="/import" className={styles.navLeft}>
            <ArrowLeft size={20} />
            Return
          </Link>
        </nav>
        <div className={styles.main}>
          <p style={{ textAlign: 'center', color: '#6B6B6B' }}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageWrapper}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <Link href="/import" className={styles.navLeft}>
          <ArrowLeft size={20} />
          Return
        </Link>
      </nav>

      {/* Main Content */}
      <main className={styles.main}>
        <h1 className={styles.pageTitle}>Review Your Locations</h1>
        <p className={styles.pageSubtitle}>
          Edit names, add notes, or remove unwanted places before creating your guide
        </p>

        {/* Bulk Actions */}
        <div className={styles.bulkActions}>
          <div className={styles.bulkActionsLeft}>
            <div className={styles.selectionCount}>
              <span className={styles.selectedCount}>{selectedIds.size}</span> of {locations.length} selected
            </div>
            <div className={styles.bulkActionsButtons}>
              <button
                onClick={handleSelectAll}
                className={styles.bulkBtnSelect}
              >
                {selectedIds.size === locations.length ? 'DESELECT ALL' : 'SELECT ALL'}
              </button>
              <button
                onClick={handleRemoveSelected}
                disabled={selectedIds.size === 0}
                className={styles.bulkBtnRemove}
              >
                REMOVE SELECTED
              </button>
            </div>
          </div>
          
          <button
            onClick={handleContinue}
            disabled={locations.length === 0}
            className={styles.btnContinue}
          >
            CHOOSE TEMPLATE →
          </button>
        </div>

        {/* Locations Grid */}
        <div className={styles.locationsGrid}>
          {locations.map((location, index) => (
            <LocationCard
              key={location.id}
              location={location}
              index={index}
              isSelected={selectedIds.has(location.id)}
              onToggleSelect={() => toggleSelection(location.id)}
              editingNameId={editingNameId}
              editingNoteId={editingNoteId}
              onStartEditName={() => setEditingNameId(location.id)}
              onStartEditNote={() => setEditingNoteId(location.id)}
              onUpdateName={handleUpdateName}
              onUpdateNote={handleUpdateNote}
              onCancelEdit={() => {
                setEditingNameId(null);
                setEditingNoteId(null);
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

// Location Card Component
interface LocationCardProps {
  location: Location;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  editingNameId: string | null;
  editingNoteId: string | null;
  onStartEditName: () => void;
  onStartEditNote: () => void;
  onUpdateName: (id: string, name: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onCancelEdit: () => void;
}

function LocationCard({
  location,
  index,
  isSelected,
  onToggleSelect,
  editingNameId,
  editingNoteId,
  onStartEditName,
  onStartEditNote,
  onUpdateName,
  onUpdateNote,
  onCancelEdit
}: LocationCardProps) {
  const [tempName, setTempName] = useState(location.name);
  const [tempNote, setTempNote] = useState(location.comment || '');

  const isEditingName = editingNameId === location.id;
  const isEditingNote = editingNoteId === location.id;

  return (
    <div className={`${styles.locationCard} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.cardHeader}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className={styles.cardCheckbox}
        />
        
        <div className={styles.cardNumber}>{index + 1}</div>

        <div className={styles.cardContent}>
          {/* Location Name */}
          <div className={styles.locationNameSection}>
            {isEditingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onUpdateName(location.id, tempName);
                  } else if (e.key === 'Escape') {
                    setTempName(location.name);
                    onCancelEdit();
                  }
                }}
                onBlur={() => onUpdateName(location.id, tempName)}
                autoFocus
                className={styles.locationNameEditable}
                style={{ display: 'block' }}
              />
            ) : (
              <>
                <div
                  onClick={onStartEditName}
                  className={styles.locationName}
                >
                  {location.name}
                </div>
                <button
                  onClick={onStartEditName}
                  className={styles.editNameBtn}
                >
                  Edit name
                </button>
              </>
            )}
          </div>

          {/* Address */}
          {location.address && (
            <div className={styles.locationAddress}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
              <span>{location.address}</span>
            </div>
          )}

          {/* Note Section */}
          <div className={styles.noteSection}>
            <div className={styles.noteLabel}>Personal Note</div>

            {isEditingNote ? (
              <div className={styles.noteEditArea} style={{ display: 'block' }}>
                <textarea
                  value={tempNote}
                  onChange={(e) => setTempNote(e.target.value)}
                  placeholder="Add your personal note about this place..."
                  className={styles.noteTextarea}
                />
                <div className={styles.noteButtons}>
                  <button
                    onClick={() => {
                      setTempNote(location.comment || '');
                      onCancelEdit();
                    }}
                    className={`${styles.noteBtn} ${styles.noteBtnCancel}`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onUpdateNote(location.id, tempNote)}
                    className={`${styles.noteBtn} ${styles.noteBtnSave}`}
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={onStartEditNote}
                className={`${styles.noteText} ${!location.comment ? styles.empty : ''}`}
              >
                {location.comment ? `"${location.comment}"` : 'Click to add a note...'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
