import React, { useEffect, useState } from 'react';
import { categoryService } from '../../services/api';
import { Category } from '../../types';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Plus, Edit2, Trash2, Award } from 'lucide-react';

export const ManageCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Create/Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      setLoading(true);
      const res = await categoryService.getAll();
      if (res.success) {
        setCategories(res.categories || []);
      }
    } catch (err) {
      console.error('Failed to load categories', err);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setName('');
    setDescription('');
    setAlertInfo(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setDescription(cat.description || '');
    setAlertInfo(null);
    setModalOpen(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setModalLoading(true);
      if (editingCategory) {
        const res = await categoryService.update(editingCategory.id, {
          name: name.trim(),
          description: description.trim(),
        });
        if (res.success) {
          setAlertInfo({ type: 'success', message: 'Category updated successfully.' });
          setCategories((prev) =>
            prev.map((c) => (c.id === editingCategory.id ? res.category : c))
          );
          setModalOpen(false);
        }
      } else {
        const res = await categoryService.create({
          name: name.trim(),
          description: description.trim(),
        });
        if (res.success) {
          setAlertInfo({ type: 'success', message: 'New category created.' });
          setCategories((prev) => [...prev, { ...res.category, event_count: 0 }]);
          setModalOpen(false);
        }
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to save category.' });
    } finally {
      setModalLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await categoryService.delete(deleteTarget.id);
      if (res.success) {
        setAlertInfo({ type: 'success', message: 'Category removed successfully.' });
        setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to delete category.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1F2D4A]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
            Event Categories Management
          </h1>
          <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
            Organize college activities by discipline (Technical, Cultural, Sports, Hackathons, Workshops).
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="btn-primary text-xs self-start"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          <span>Add New Category</span>
        </button>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Categories Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 skeleton-shimmer rounded-[14px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="academic-card p-5 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-[8px] bg-[#3B82F6]/15 text-[#60A5FA] flex items-center justify-center">
                      <Award className="w-3.5 h-3.5" />
                    </div>
                    <h3 className="text-sm font-semibold text-[#F8FAFC]">{cat.name}</h3>
                  </div>
                  <span className="text-xs text-[#8B9BB4] tabular-nums font-medium">
                    {cat.event_count || 0} events
                  </span>
                </div>
                <p className="text-xs text-[#8B9BB4] mt-2.5 line-clamp-2 leading-relaxed">
                  {cat.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-3 border-t border-[#1F2D4A] flex items-center justify-end gap-2 text-xs">
                <button
                  onClick={() => handleOpenEdit(cat)}
                  className="px-2.5 py-1 text-xs text-[#CBD5E1] hover:text-[#F8FAFC] bg-[#16223B] hover:bg-[#1E2E4E] border border-[#1F2D4A] rounded-[8px] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#8B9BB4]" />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => setDeleteTarget(cat)}
                  className="p-1 text-[#8B9BB4] hover:text-[#EF4444] rounded-[8px] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                  title="Delete category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingCategory ? 'Edit Category' : 'Create New Category'}
          maxWidth="md"
        >
          <form onSubmit={handleSaveCategory} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Category Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Technical Workshop"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-base w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#CBD5E1] mb-1.5">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Briefly describe what kinds of activities fall under this category..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-[10px] border border-[#1F2D4A] bg-[#0F1829] p-3 text-xs text-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-[#3B82F6]"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="btn-secondary text-xs h-9"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={modalLoading}
                className="btn-primary text-xs h-9"
              >
                {modalLoading ? 'Saving...' : editingCategory ? 'Save Changes' : 'Create Category'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Category Confirmation"
          maxWidth="sm"
          footer={
            <>
              <button
                onClick={() => setDeleteTarget(null)}
                className="btn-secondary text-xs h-9"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="btn-danger text-xs h-9"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Category'}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-[#CBD5E1]">
            <p>
              Are you sure you want to remove the category <strong className="text-[#F8FAFC]">{deleteTarget.name}</strong>?
            </p>
            <p className="text-[#8B9BB4]">
              Events under this category will no longer have a category tag associated with them.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
