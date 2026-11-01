import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useLanguage } from '../../context/LanguageContext.js';
import { api } from '../../services/api.js';
import { Invitation, User, UserRole } from '../../types/dispatch.js';
import { LoadingSpinner } from '../../components/common/LoadingSpinner.js';
import {
  Users,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Trash2,
  Clock,
  CheckCircle,
  Copy,
  Check,
  AlertTriangle,
  KeyRound,
  RefreshCw,
  Search,
} from 'lucide-react';

type MemberWithDetails = User & {
  membershipRole: UserRole;
  membershipStatus: string;
  membershipCreatedAt: string;
};

export function TeamPage() {
  const { user } = useAuth();
  const { t } = useLanguage();

  const [members, setMembers] = useState<MemberWithDetails[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('SENDER');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [acceptToken, setAcceptToken] = useState('');
  const [acceptSubmitting, setAcceptSubmitting] = useState(false);
  const [acceptMessage, setAcceptMessage] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const canManage = user?.role === 'BUSINESS_OWNER' || user?.role === 'SUPER_ADMIN';

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getMembersAndInvitations();
      setMembers(res.members);
      setInvitations(res.invitations);
    } catch (err: any) {
      setError(err.message || 'Failed to load team data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!inviteEmail.trim()) {
      setInviteError('Please enter a valid email address.');
      return;
    }

    try {
      setInviteSubmitting(true);
      await api.inviteMember({
        inviteeEmail: inviteEmail.trim(),
        inviteePhone: invitePhone.trim() || undefined,
        proposedRole: inviteRole,
      });
      setIsInviteModalOpen(false);
      setInviteEmail('');
      setInvitePhone('');
      await loadData();
    } catch (err: any) {
      setInviteError(err.message || 'Failed to issue invitation.');
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      await api.revokeInvitation(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke invitation.');
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptToken.trim()) return;
    try {
      setAcceptSubmitting(true);
      setAcceptMessage(null);
      const res = await api.acceptInvitation(acceptToken.trim());
      setAcceptMessage(`Successfully joined ${res.user.businessName} as ${res.user.role}!`);
      setAcceptToken('');
      setTimeout(() => {
        setIsAcceptModalOpen(false);
        setAcceptMessage(null);
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setAcceptMessage(`Error: ${err.message}`);
    } finally {
      setAcceptSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await api.updateMemberRole(userId, newRole);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update member role.');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove "${memberName}" from ${user?.businessName}?`)) return;
    try {
      await api.removeMember(userId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove member.');
    }
  };

  const handleCopyLink = (token: string, id: string) => {
    const url = `${window.location.origin}/?invitation=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.phoneNumber && m.phoneNumber.includes(searchTerm))
  );

  const filteredInvitations = invitations.filter(
    (i) =>
      i.inviteeEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (i.inviteePhone && i.inviteePhone.includes(searchTerm))
  );

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-900/40 text-purple-300 border-purple-700/60';
      case 'BUSINESS_OWNER':
        return 'bg-indigo-900/40 text-indigo-300 border-indigo-700/60';
      case 'SENDER':
        return 'bg-blue-900/40 text-blue-300 border-blue-700/60';
      case 'RECEIVER':
        return 'bg-emerald-900/40 text-emerald-300 border-emerald-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-5 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">
                {t('nav.team', 'Team & Members')}
              </h1>
              <p className="text-xs text-slate-400">
                {user?.businessName} • Multi-role access control, members directory, and onboarding invitations
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAcceptModalOpen(true)}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
            {t('action.accept_token', 'Accept Token')}
          </button>
          {canManage && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {t('action.invite_member', 'Invite Member')}
            </button>
          )}
          <button
            onClick={loadData}
            title="Refresh list"
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">{t('metric.total_members', 'Total Members')}</p>
          <p className="text-2xl font-bold text-white mt-1">{members.length}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">{t('role.sender', 'Senders / Dispatchers')}</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">
            {members.filter((m) => m.membershipRole === 'SENDER').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">{t('role.receiver', 'Receiving Leads')}</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">
            {members.filter((m) => m.membershipRole === 'RECEIVER').length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
          <p className="text-xs text-slate-400 font-medium">{t('metric.pending_invitations', 'Pending Invitations')}</p>
          <p className="text-2xl font-bold text-amber-400 mt-1">
            {invitations.filter((i) => i.status === 'PENDING').length}
          </p>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {t('metric.active_members', 'Active Members')} ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'invitations'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            {t('metric.pending_invitations', 'Invitations')}
            {invitations.filter((i) => i.status === 'PENDING').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
            ({invitations.length})
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`${t('action.search')}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text="Loading team directory..." />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-900/20 border border-red-800/40 text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      ) : activeTab === 'members' ? (
        /* Members Table */
        filteredMembers.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No team members found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm ? 'No members match your search criteria.' : 'Invite your dispatchers and warehouse leads to collaborate.'}
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-[700px]">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold">{t('table.member', 'Member')}</th>
                    <th className="py-3 px-4 font-semibold">{t('auth.assigned_role', 'Assigned Role')}</th>
                    <th className="py-3 px-4 font-semibold">{t('table.contact', 'Contact Details')}</th>
                    <th className="py-3 px-4 font-semibold">{t('table.status', 'Status')}</th>
                    <th className="py-3 px-4 font-semibold text-right">{t('table.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-xs uppercase">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <span>{member.name}</span>
                            {member.id === user?.id && (
                              <span className="ml-2 px-1.5 py-0.5 bg-slate-800 text-indigo-300 text-[10px] rounded border border-slate-700">
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${getRoleBadge(member.membershipRole)}`}>
                          {member.membershipRole.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail className="w-3 h-3 text-slate-500" />
                            <span>{member.email}</span>
                          </div>
                          {member.phoneNumber && (
                            <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-500" />
                              <span>{member.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-900/30 text-emerald-300 border border-emerald-800/40">
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                          Active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canManage && member.id !== user?.id && member.membershipRole !== 'SUPER_ADMIN' ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={member.membershipRole}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                              className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="BUSINESS_OWNER">Owner</option>
                              <option value="SENDER">Sender</option>
                              <option value="RECEIVER">Receiver</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              title="Remove member"
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* Invitations Table */
        filteredInvitations.length === 0 ? (
          <div className="py-12 text-center bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <Mail className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-300">No invitations found</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Issued team invitations will appear here until accepted or expired.
            </p>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold">Invitee Email</th>
                    <th className="py-3 px-4 font-semibold">Proposed Role</th>
                    <th className="py-3 px-4 font-semibold">Invited By</th>
                    <th className="py-3 px-4 font-semibold">Status / Expires</th>
                    <th className="py-3 px-4 font-semibold">Invitation Link</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inv.inviteeEmail}</span>
                        </div>
                        {inv.inviteePhone && (
                          <div className="text-[11px] text-slate-400 mt-0.5 ml-5">
                            {inv.inviteePhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${getRoleBadge(inv.proposedRole)}`}>
                          {inv.proposedRole.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {inv.invitedByName}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                              inv.status === 'PENDING'
                                ? 'bg-amber-900/30 text-amber-300 border-amber-800/40'
                                : inv.status === 'ACCEPTED'
                                ? 'bg-emerald-900/30 text-emerald-300 border-emerald-800/40'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {inv.status}
                          </span>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            Exp: {new Date(inv.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {inv.status === 'PENDING' ? (
                          <button
                            onClick={() => handleCopyLink(inv.token, inv.id)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {copiedId === inv.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{inv.token.substring(0, 12)}...</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canManage && inv.status === 'PENDING' ? (
                          <button
                            onClick={() => handleRevokeInvitation(inv.id)}
                            title="Revoke invitation"
                            className="px-2.5 py-1 text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg text-xs transition cursor-pointer"
                          >
                            Revoke
                          </button>
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Invite Team Member</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-red-900/30 border border-red-800/40 text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Invitee Email *</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@yourcompany.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number (optional, E.164)</label>
                <input
                  type="tel"
                  placeholder="+1-555-019-0000"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="SENDER">Sender / Dispatcher (Creates & submits dispatches)</option>
                  <option value="RECEIVER">Receiver / Partner (Verifies dock counts & reports receipts)</option>
                  <option value="BUSINESS_OWNER">Business Owner (Full management & member admin)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {inviteSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept Invitation Token Modal */}
      {isAcceptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Redeem Invitation Token</h3>
              </div>
              <button
                onClick={() => setIsAcceptModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {acceptMessage && (
              <div className="p-3 bg-indigo-900/30 border border-indigo-800/40 text-indigo-200 rounded-xl text-xs">
                {acceptMessage}
              </div>
            )}

            <form onSubmit={handleAcceptSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Invitation Token</label>
                <input
                  type="text"
                  required
                  placeholder="inv_tok_..."
                  value={acceptToken}
                  onChange={(e) => setAcceptToken(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Enter the secure token received via email/SMS invitation to join the team.
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={acceptSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {acceptSubmitting ? 'Redeeming...' : 'Accept & Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
