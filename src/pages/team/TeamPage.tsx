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
      setError(err.message || t('team.err_load_failed'));
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
      setInviteError(t('team.err_email_required'));
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
      setInviteError(err.message || t('team.err_invite_failed'));
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    try {
      setError(null);
      await api.revokeInvitation(id);
      await loadData();
    } catch (err: any) {
      setError(err.message || t('msg.error'));
    }
  };

  const handleAcceptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptToken.trim()) return;
    try {
      setAcceptSubmitting(true);
      setAcceptMessage(null);
      const res = await api.acceptInvitation(acceptToken.trim());
      setAcceptMessage(`${t('msg.saved_successfully')} — ${res.user.businessName}`);
      setAcceptToken('');
      setTimeout(() => {
        setIsAcceptModalOpen(false);
        setAcceptMessage(null);
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setAcceptMessage(`${t('msg.error')}: ${err.message}`);
    } finally {
      setAcceptSubmitting(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      setError(null);
      await api.updateMemberRole(userId, newRole);
      await loadData();
    } catch (err: any) {
      setError(err.message || t('msg.error'));
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      setError(null);
      await api.removeMember(userId);
      await loadData();
    } catch (err: any) {
      setError(err.message || t('msg.error'));
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
        return 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700/60';
      case 'BUSINESS_OWNER':
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-900/40 dark:text-indigo-300 dark:border-indigo-700/60';
      case 'SENDER':
        return 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-700/60';
      case 'RECEIVER':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700/60';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  const getLocalizedRole = (role: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return t('role.super_admin');
      case 'BUSINESS_OWNER':
        return t('role.business_owner');
      case 'SENDER':
        return t('role.sender');
      case 'RECEIVER':
        return t('role.receiver');
      default:
        return role;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl backdrop-blur-md shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 border border-indigo-200 text-indigo-600 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-400 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                {t('nav.team', 'Team & Members')}
              </h1>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {t(user?.businessName || '')} • {t('team.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setIsAcceptModalOpen(true)}
            className="px-3.5 py-2 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-2 transition cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            {t('action.accept_token', 'Accept Token')}
          </button>
          {canManage && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-4 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              {t('action.invite_member', 'Invite Member')}
            </button>
          )}
          <button
            onClick={loadData}
            title={t('action.refresh')}
            aria-label={t('action.refresh', 'Refresh')}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 dark:border-slate-700 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 tabular-nums">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('metric.total_members', 'Total Members')}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{members.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('role.sender', 'Senders / Dispatchers')}</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {members.filter((m) => m.membershipRole === 'SENDER').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('role.receiver', 'Receiving Leads')}</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {members.filter((m) => m.membershipRole === 'RECEIVER').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">{t('metric.pending_invitations', 'Pending Invitations')}</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {invitations.filter((i) => i.status === 'PENDING').length}
          </p>
        </div>
      </div>

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold cursor-pointer transition ${
              activeTab === 'members'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800'
            }`}
          >
            {t('team.active_members_tab', { count: members.length })}
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-2 min-h-[44px] rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 ${
              activeTab === 'invitations'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:hover:text-slate-200 dark:border-slate-800'
            }`}
          >
            {t('team.pending_invites_tab', { count: invitations.length })}
            {invitations.filter((i) => i.status === 'PENDING').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={t('team.search_placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner text={t('msg.loading')} />
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 dark:bg-red-900/20 border border-rose-200 dark:border-red-800/40 text-rose-800 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-red-400" />
          <span>{error}</span>
        </div>
      ) : activeTab === 'members' ? (
        /* Members Table */
        filteredMembers.length === 0 ? (
          <div className="py-12 text-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <Users className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300">{t('empty.no_dispatches_match')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {t('empty.no_dispatches_desc')}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs min-w-full sm:min-w-[620px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-3 sm:px-4 font-semibold">{t('table.member', 'Member')}</th>
                    <th className="py-3 px-3 sm:px-4 font-semibold">{t('auth.assigned_role', 'Assigned Role')}</th>
                    <th className="py-3 px-3 sm:px-4 font-semibold">{t('table.contact', 'Contact Details')}</th>
                    <th className="py-3 px-3 sm:px-4 font-semibold">{t('table.status', 'Status')}</th>
                    <th className="py-3 px-3 sm:px-4 font-semibold text-right">{t('table.actions', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-3 sm:px-4">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 dark:bg-indigo-500/10 dark:border-indigo-500/20 dark:text-indigo-300 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <span>{t(member.name)}</span>
                            {member.id === user?.id && (
                              <span className="ml-2 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-slate-800 dark:text-indigo-300 dark:border-slate-700 text-[10px] rounded border">
                                {t('team.you_badge')}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium border ${getRoleBadge(member.membershipRole)}`}>
                          {getLocalizedRole(member.membershipRole)}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-slate-600 dark:text-slate-400">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-300">
                            <Mail className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                            <span>{member.email}</span>
                          </div>
                          {member.phoneNumber && (
                            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 text-[11px]">
                              <Phone className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                              <span>{member.phoneNumber}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/40 border">
                          <CheckCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {t('status.active')}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 sm:px-4 text-right">
                        {canManage && member.id !== user?.id && member.membershipRole !== 'SUPER_ADMIN' ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={member.membershipRole}
                              onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                              className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-300 text-xs rounded-lg px-2 py-1.5 min-h-[40px] focus:outline-none focus:border-indigo-500 cursor-pointer"
                            >
                              <option value="BUSINESS_OWNER">{t('role.business_owner')}</option>
                              <option value="SENDER">{t('role.sender')}</option>
                              <option value="RECEIVER">{t('role.receiver')}</option>
                            </select>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              title={t('team.confirm_remove')}
                              aria-label={t('team.confirm_remove', 'Remove member')}
                              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:text-slate-400 dark:hover:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
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
          <div className="py-12 text-center bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <Mail className="w-10 h-10 text-slate-400 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-300">{t('metric.pending_invitations')}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {t('empty.no_logs')}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4 font-semibold">{t('team.invite_col_email')}</th>
                    <th className="py-3 px-4 font-semibold">{t('team.invite_col_role')}</th>
                    <th className="py-3 px-4 font-semibold">{t('team.invite_col_by')}</th>
                    <th className="py-3 px-4 font-semibold">{t('team.invite_col_expires')}</th>
                    <th className="py-3 px-4 font-semibold">{t('team.invite_col_link')}</th>
                    <th className="py-3 px-4 font-semibold text-right">{t('table.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {filteredInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inv.inviteeEmail}</span>
                        </div>
                        {inv.inviteePhone && (
                          <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 ml-5">
                            {inv.inviteePhone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium border ${getRoleBadge(inv.proposedRole)}`}>
                          {getLocalizedRole(inv.proposedRole)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-400">
                        {t(inv.invitedByName)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${
                              inv.status === 'PENDING'
                                ? 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/40'
                                : inv.status === 'ACCEPTED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/40'
                                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                          >
                            {inv.status === 'PENDING' ? t('status.pending') : inv.status}
                          </span>
                          <div className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {t('team.expires_prefix')} {new Date(inv.expiresAt).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {inv.status === 'PENDING' ? (
                          <button
                            onClick={() => handleCopyLink(inv.token, inv.id)}
                            className="px-2.5 py-1.5 min-h-[36px] bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-indigo-300 dark:border-slate-700 rounded-lg text-[11px] font-mono flex items-center gap-1.5 transition cursor-pointer"
                          >
                            {copiedId === inv.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span className="text-emerald-700 dark:text-emerald-400">{t('action.copied')}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>{inv.token.substring(0, 12)}...</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {canManage && inv.status === 'PENDING' ? (
                          <button
                            onClick={() => handleRevokeInvitation(inv.id)}
                            title={t('team.revoke_btn')}
                            className="px-3 py-1.5 min-h-[36px] text-rose-700 hover:bg-rose-50 border border-rose-200 dark:text-red-400 dark:hover:bg-red-500/10 dark:border-red-500/20 rounded-lg text-xs font-medium transition cursor-pointer"
                          >
                            {t('team.revoke_btn')}
                          </button>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 text-[11px]">—</span>
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
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('team.invite_modal_title')}</h3>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">{t('team.invite_modal_desc')}</p>
                </div>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {inviteError && (
              <div className="p-3 bg-rose-50 dark:bg-red-900/30 border border-rose-200 dark:border-red-800/40 text-rose-800 dark:text-red-300 rounded-xl text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-red-400" />
                <span>{inviteError}</span>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">{t('team.work_email_label')}</label>
                <input
                  type="email"
                  required
                  placeholder={t('team.placeholder_email', 'colleague@yourcompany.com')}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">{t('auth.mobile_phone')}</label>
                <input
                  type="tel"
                  placeholder="+1-555-019-0000"
                  value={invitePhone}
                  onChange={(e) => setInvitePhone(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">{t('team.assign_role_label')}</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as UserRole)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="SENDER">{t('role.sender')} — {t('auth.sender_role_desc')}</option>
                  <option value="RECEIVER">{t('role.receiver')} — {t('auth.receiver_role_desc')}</option>
                  <option value="BUSINESS_OWNER">{t('role.business_owner')} — {t('auth.owner_role_desc')}</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  {t('action.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="px-5 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {inviteSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  {inviteSubmitting ? t('team.sending_btn') : t('team.send_invite_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Accept Invitation Token Modal */}
      {isAcceptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('team.accept_modal_title')}</h3>
              </div>
              <button
                onClick={() => setIsAcceptModalOpen(false)}
                className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {acceptMessage && (
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800/40 text-indigo-900 dark:text-indigo-200 rounded-xl text-xs">
                {acceptMessage}
              </div>
            )}

            <form onSubmit={handleAcceptSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">{t('team.token_label')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('team.placeholder_token', 'inv_tok_...')}
                  value={acceptToken}
                  onChange={(e) => setAcceptToken(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 font-mono placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-600 dark:text-slate-500 mt-1">
                  {t('team.accept_modal_desc')}
                </p>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(false)}
                  className="px-4 py-2 min-h-[44px] bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 rounded-xl font-medium cursor-pointer"
                >
                  {t('action.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={acceptSubmitting}
                  className="px-5 py-2 min-h-[44px] bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold disabled:opacity-50 cursor-pointer"
                >
                  {acceptSubmitting ? t('team.joining_btn') : t('team.join_btn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
