'use client';

import { useState } from 'react';
import { Search, Shield, Crown, UserX, UserCheck, Trash2, Edit, Save, X, Key, RefreshCw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';

type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  createdAt: Date;
  role: string | null;
  isBanned: boolean;
  isVIP: boolean;
  isFounder: boolean;
  level: number;
  totalXP: number;
};

export default function UsersClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [editingRole, setEditingRole] = useState<{ id: string, role: string } | null>(null);
  const { addToast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const results = await res.json();
        setUsers(results);
      } else {
        throw new Error('Search failed');
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to search users' });
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleBan = async (user: AdminUser) => {
    const action = user.isBanned ? 'unban' : 'ban';
    if (!confirm(`Are you sure you want to ${action} ${user.username}?`)) return;

    try {
      const endpoint = user.isBanned ? '/api/admin/unban' : '/api/admin/ban';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to ${action}`);
      }
      
      setUsers(users.map(u => u.id === user.id ? { ...u, isBanned: !user.isBanned } : u));
      addToast({ type: 'success', title: 'Success', message: `User ${action}ned successfully` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || `Failed to ${action} user` });
    }
  };

  const handleSaveRole = async (userId: string) => {
    if (!editingRole || editingRole.id !== userId) return;
    
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editingRole.role }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update role');
      }

      setUsers(users.map(u => u.id === userId ? { ...u, role: editingRole.role } : u));
      setEditingRole(null);
      addToast({ type: 'success', title: 'Role Updated', message: 'User role has been updated.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update role' });
    }
  };

  const handleDeleteUser = async (user: AdminUser) => {
    if (!confirm(`⚠️ Are you sure you want to PERMANENTLY DELETE user "${user.username}"? This action cannot be undone.`)) return;
    if (!confirm(`This is your final warning. Delete "${user.username}" and all their data?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete user');
      }

      setUsers(users.filter(u => u.id !== user.id));
      addToast({ type: 'success', title: 'User Deleted', message: `User "${user.username}" has been permanently deleted.` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete user' });
    }
  };

  const handleForcePasswordReset = async (user: AdminUser) => {
    if (!confirm(`Send a password reset email to ${user.username} (${user.email})?`)) return;

    try {
      const res = await fetch(`/api/admin/users/${user.id}/password-reset`, {
        method: 'POST',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to send password reset');
      }

      const data = await res.json();
      addToast({ type: 'success', title: 'Password Reset Sent', message: data.message || `Password reset email sent to ${user.email}` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to send password reset email' });
    }
  };

  return (
    <div className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex flex-col">
      {/* Toolbar */}
      <div className="p-4 border-b-4 border-black bg-gray-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search by username..."
            className="flex-1 md:w-64 px-3 py-2 border-2 border-black font-mono text-sm outline-none focus:bg-blue-50 transition-colors"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-4 py-2 font-bold text-sm bg-blue-500 text-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] active:translate-x-[2px] active:translate-y-[2px] transition-all"
          >
            {isSearching ? <RefreshCw size={18} className="animate-spin" /> : <Search size={18} />}
          </button>
        </div>
        
        <div className="text-xs font-mono font-bold text-gray-500">
          Showing {users.length} users
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-sm whitespace-nowrap">
          <thead className="bg-black text-white">
            <tr>
              <th className="p-3 border-r-2 border-gray-800 uppercase tracking-widest font-black text-xs">User</th>
              <th className="p-3 border-r-2 border-gray-800 uppercase tracking-widest font-black text-xs">Role</th>
              <th className="p-3 border-r-2 border-gray-800 uppercase tracking-widest font-black text-xs">Stats</th>
              <th className="p-3 border-r-2 border-gray-800 uppercase tracking-widest font-black text-xs">Joined</th>
              <th className="p-3 uppercase tracking-widest font-black text-xs">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, i) => (
              <tr key={user.id} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} border-b-2 border-black hover:bg-purple-50 transition-colors`}>
                <td className="p-3 border-r-2 border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-500 text-white font-black flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold font-sans text-base">
                        {user.username}
                        {user.isVIP && <Crown size={14} className="inline ml-1 text-yellow-500" />}
                        {user.isFounder && <Shield size={14} className="inline ml-1 text-purple-500" />}
                      </div>
                      <div className="text-xs text-gray-500">{user.email || 'No email'}</div>
                    </div>
                  </div>
                </td>
                <td className="p-3 border-r-2 border-gray-200">
                  {editingRole?.id === user.id ? (
                    <div className="flex items-center gap-2">
                      <select 
                        value={editingRole.role}
                        onChange={(e) => setEditingRole({ id: user.id, role: e.target.value })}
                        className="border-2 border-black p-1 text-xs font-bold"
                      >
                        <option value="USER">USER</option>
                        <option value="VIP">VIP</option>
                        <option value="MODERATOR">MODERATOR</option>
                        <option value="PURR_ADMIN">PURR_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="FOUNDER">FOUNDER</option>
                      </select>
                      <button onClick={() => handleSaveRole(user.id)} className="text-green-600 hover:scale-110"><Save size={16} /></button>
                      <button onClick={() => setEditingRole(null)} className="text-red-500 hover:scale-110"><X size={16} /></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-black border-2 border-black ${user.role === 'FOUNDER' ? 'bg-purple-500 text-white' : user.role === 'ADMIN' ? 'bg-blue-500 text-white' : 'bg-white'}`}>
                        {user.role || 'USER'}
                      </span>
                      {!user.isFounder && (
                        <button onClick={() => setEditingRole({ id: user.id, role: user.role || 'USER' })} className="text-gray-400 hover:text-black hover:scale-110 transition-all">
                          <Edit size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </td>
                <td className="p-3 border-r-2 border-gray-200">
                  <div className="text-xs">Lvl <span className="font-bold">{user.level || 1}</span> ({user.totalXP || 0} XP)</div>
                </td>
                <td className="p-3 border-r-2 border-gray-200 text-gray-600">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3">
                  <div className="flex gap-2">
                    {user.isFounder ? (
                      <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-1 border border-purple-300">UNTOUCHABLE</span>
                    ) : (
                      <>
                        <button 
                          onClick={() => handleToggleBan(user)}
                          className={`p-1.5 border-2 border-black hover:translate-x-[1px] hover:translate-y-[1px] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none ${user.isBanned ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}
                          title={user.isBanned ? "Unban User" : "Ban User"}
                        >
                          {user.isBanned ? <UserCheck size={16} /> : <UserX size={16} />}
                        </button>
                        <button 
                          onClick={() => handleForcePasswordReset(user)}
                          className="p-1.5 bg-yellow-400 text-black border-2 border-black hover:translate-x-[1px] hover:translate-y-[1px] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                          title="Force Password Reset"
                        >
                          <Key size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 bg-red-500 text-white border-2 border-black hover:translate-x-[1px] hover:translate-y-[1px] transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 italic">No users found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
