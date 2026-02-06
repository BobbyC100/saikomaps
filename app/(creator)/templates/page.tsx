'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, X } from 'lucide-react';
import styles from './templates.module.css';

interface Template {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  example: string;
  organization: string[];
  image: string;
}

export default function TemplatesPage() {
  const router = useRouter();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [guideTitle, setGuideTitle] = useState('');
  const [guideDescription, setGuideDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const templates: Template[] = [
    {
      id: 'postcard',
      title: 'Postcard',
      subtitle: 'Vintage Postcard Vibes',
      description: 'Perfect for travel guides and nostalgic collections. Locations are presented with a vintage postcard aesthetic.',
      example: '"Biarritz Beach Spots"',
      organization: ['Classic postcard layout', 'Nostalgic design', 'Travel-focused'],
      image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800&q=80',
    },
    {
      id: 'field-notes',
      title: 'Field Notes',
      subtitle: 'Clean Notebook Aesthetic',
      description: 'Ideal for curated lists and personal collections. Simple, clean design that emphasizes content.',
      example: '"Tokyo Coffee Shops"',
      organization: ['Clean layout', 'Notebook style', 'Content-focused'],
      image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80',
    },
    {
      id: 'monocle',
      title: 'Monocle',
      subtitle: 'Sophisticated Editorial',
      description: 'Premium magazine-style layout. Perfect for sophisticated guides and editorial content.',
      example: '"Paris Restaurants"',
      organization: ['Editorial design', 'Premium feel', 'Magazine style'],
      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
    },
    {
      id: 'street',
      title: 'Street',
      subtitle: 'Bold Urban Energy',
      description: 'Dynamic, urban-inspired design. Great for city guides and vibrant location collections.',
      example: '"NYC Street Art"',
      organization: ['Bold design', 'Urban aesthetic', 'Dynamic layout'],
      image: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&q=80',
    },
  ];

  const handleSelectTemplate = (template: Template) => {
    // Check if locations exist
    const storedLocations = localStorage.getItem('importedLocations');
    if (!storedLocations) {
      alert('No locations found. Please import locations first.');
      router.push('/import');
      return;
    }

    // Show modal for user to name the guide
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleCreateGuide = async () => {
    if (!guideTitle.trim()) {
      alert('Please enter a title for your guide.');
      return;
    }

    if (!selectedTemplate) return;

    const storedLocations = localStorage.getItem('importedLocations');
    if (!storedLocations) {
      alert('No locations found. Please import locations first.');
      router.push('/import');
      return;
    }

    setIsCreating(true);

    try {
      const locations = JSON.parse(storedLocations);
      
      // Transform locations to API format
      const apiLocations = locations.map((loc: any) => ({
        name: loc.Title || loc.Name || loc.name || 'Untitled Location',
        address: loc.Address || loc.address,
        url: loc.URL || loc.url,
        comment: loc.Comment || loc.Note || loc.comment,
      })).filter((loc: any) => loc.name && loc.name.trim() !== '');

      // Call API to create guide
      const response = await fetch('/api/import/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listTitle: guideTitle.trim(),
          templateType: selectedTemplate.id,
          locations: apiLocations,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create guide');
      }

      // Clear imported locations
      localStorage.removeItem('importedLocations');
      
      // Navigate to dashboard (or the created guide)
      router.push('/dashboard');
    } catch (error) {
      console.error('Error creating guide:', error);
      alert(`Failed to create guide: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsCreating(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTemplate(null);
    setGuideTitle('');
    setGuideDescription('');
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <Link href="/review" className={styles.navLeft}>
          <ArrowLeft size={20} />
          Return
        </Link>
      </nav>

      {/* Hero Section */}
      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>Choose Your Template</h1>
        <p className={styles.heroSubtitle}>
          Select how you'd like to present your guide. Each template offers a unique aesthetic for your locations.
        </p>
      </section>

      {/* Template Cards */}
      <div className={styles.container}>
        <div className={styles.templateGrid}>
          {templates.map((template) => (
            <div
              key={template.id}
              onClick={() => handleSelectTemplate(template)}
              className={styles.templateCard}
            >
              {/* Image Header with Text Overlay */}
              <div 
                className={styles.templateHeader}
                style={{ backgroundImage: `url(${template.image})` }}
              >
                <div className={styles.templateHeaderContent}>
                  <h2 className={styles.templateTitle}>{template.title}</h2>
                  <p className={styles.templateSubtitle}>{template.subtitle}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className={styles.cardBody}>
                <p className={styles.templateDescription}>
                  {template.description}
                </p>

                {/* Example Section */}
                <div className={styles.exampleSection}>
                  <p className={styles.exampleLabel}>Example</p>
                  <p className={styles.exampleTitle}>{template.example}</p>

                  <p className={styles.organizationLabel}>Features</p>
                  <ul className={styles.organizationList}>
                    {template.organization.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Select Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectTemplate(template);
                  }}
                  className={styles.selectButton}
                >
                  Select {template.title}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className={styles.bottomNote}>
          <p>
            <strong>Don't worry!</strong> You can change the template later or customize how your guide is presented.
          </p>
          <p className={styles.bottomNoteSubtitle}>
            Templates help structure your locations, but you'll have full control over ordering and presentation.
          </p>
        </div>
      </div>

      {/* Modal for naming guide */}
      {showModal && selectedTemplate && (
        <div className={styles.modalOverlay} onClick={handleCloseModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            {/* Close button */}
            <button className={styles.modalClose} onClick={handleCloseModal}>
              <X size={24} />
            </button>

            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Name Your Guide</h2>
              <p className={styles.modalSubtitle}>
                Using <strong>{selectedTemplate.title}</strong> template
              </p>
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  Guide Title <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  value={guideTitle}
                  onChange={(e) => setGuideTitle(e.target.value)}
                  placeholder="e.g., Biarritz Beach Spots"
                  className={styles.formInput}
                  autoFocus
                  disabled={isCreating}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Description (Optional)</label>
                <textarea
                  value={guideDescription}
                  onChange={(e) => setGuideDescription(e.target.value)}
                  placeholder="A brief description of your guide..."
                  className={styles.formTextarea}
                  rows={3}
                  disabled={isCreating}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button 
                onClick={handleCloseModal} 
                className={styles.btnCancel}
                disabled={isCreating}
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateGuide} 
                className={styles.btnCreate}
                disabled={!guideTitle.trim() || isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Guide →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
