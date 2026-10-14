import React, { useEffect, useState } from 'react';
import { adminService } from '../../services/api';
import { User, UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Alert } from '../../components/common/Alert';
import { Search, Trash2, User as UserIcon } from 'lucide-react';

export const ManageUsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await adminService.getUsers({
        role: roleFilter || undefined,
        q: searchQuery || undefined,
      });
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: 'Failed to load user list.' });
    } finally {
      setLoading(false);
    }
  }

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      setAlertInfo(null);
      const res = await adminService.updateUserRole(userId, newRole);
      if (res.success) {
        setAlertInfo({ type: 'success', message: `User role successfully updated to ${newRole}.` });
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserRole } : u))
        );
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to update user role.' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const res = await adminService.deleteUser(deleteTarget.id);
      if (res.success) {
        setAlertInfo({ type: 'success', message: 'User account deleted.' });
        setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        setDeleteTarget(null);
      }
    } catch (err: any) {
      setAlertInfo({ type: 'error', message: err.response?.data?.message || 'Failed to delete user.' });
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-page-enter">
      
      {/* Header */}
      <div className="pb-4 border-b border-[#1F2D4A]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F8FAFC]">
          User & Role Governance
        </h1>
        <p className="text-xs sm:text-sm text-[#8B9BB4] mt-1">
          Supervise student accounts, promote faculty club coordinators to organizers, or manage administrative rights.
        </p>
      </div>

      {alertInfo && <Alert type={alertInfo.type} message={alertInfo.message} />}

      {/* Filter and Search Bar */}
      <div className="academic-card p-3 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B9BB4] pointer-events-none" />
          <input
            type="text"
            placeholder="Search by student name or college email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-base w-full pl-10 text-xs"
          />
        </div>

        <div className="w-full sm:w-44">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input-base w-full text-xs"
          >
            <option value="">All Roles</option>
            <option value="student">Students</option>
            <option value="organizer">Organizers</option>
            <option value="admin">Administrators</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 skeleton-shimmer rounded-[14px]" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="p-12 text-center academic-card space-y-2">
          <UserIcon className="w-8 h-8 text-[#8B9BB4] mx-auto opacity-60" />
          <h3 className="text-sm font-semibold text-[#F8FAFC]">No users found</h3>
          <p className="text-xs text-[#8B9BB4]">No account matched your role or query criteria.</p>
        </div>
      ) : (
        <div className="academic-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Role</th>
                  <th>Activity</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => {
                  const isCurrent = Number(u.id) === Number(currentUser?.id);
                  return (
                    <tr key={u.id}>
                      {/* Name */}
                      <td>
                        <div className="font-semibold text-[#F8FAFC] flex items-center gap-1.5">
                          <span>{u.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] text-[#60A5FA] bg-[#3B82F6]/15 border border-[#3B82F6]/30 px-1.5 py-0.5 rounded-full font-medium">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#8B9BB4]">ID #{u.id}</div>
                      </td>

                      {/* Email */}
                      <td className="text-[#CBD5E1]">
                        {u.email}
                      </td>

                      {/* Phone */}
                      <td className="text-[#8B9BB4]">
                        {u.phone || '—'}
                      </td>

                      {/* Role Selector */}
                      <td>
                        <select
                          value={u.role}
                          disabled={isCurrent}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-2.5 py-1 text-xs bg-[#0F1829] border border-[#1F2D4A] rounded-[8px] focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#F8FAFC] capitalize disabled:opacity-60"
                        >
                          <option value="student">Student</option>
                          <option value="organizer">Organizer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>

                      {/* Activity */}
                      <td className="tabular-nums text-[#CBD5E1]">
                        {u.role === 'student' && `${u.activity_count || 0} registrations`}
                        {u.role === 'organizer' && `${u.activity_count || 0} events created`}
                        {u.role === 'admin' && 'Full privileges'}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => setDeleteTarget(u)}
                            className="p-1.5 text-[#8B9BB4] hover:text-[#EF4444] rounded-[8px] hover:bg-[#EF4444]/10 transition-colors cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          title="Delete Account Confirmation"
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
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </>
          }
        >
          <div className="space-y-3 text-xs text-[#CBD5E1]">
            <p>
              Are you sure you want to remove user account <strong className="text-[#F8FAFC]">{deleteTarget.name}</strong> ({deleteTarget.email})?
            </p>
            <p className="text-[#8B9BB4]">
              This will revoke all active access tokens and erase their role assignment.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
