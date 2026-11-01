import { Router } from 'express';
import { sandboxStore } from '../adapters/sandboxStore.js';
import { authenticate, AuthenticatedRequest, requireRole } from '../middleware/auth.js';

const router = Router();

// Get team members & pending invitations for active business
router.get('/', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const businessId = user.businessId;

    const [members, invitations] = await Promise.all([
      sandboxStore.getBusinessMembers(businessId),
      sandboxStore.getBusinessInvitations(businessId),
    ]);

    res.json({
      businessId,
      members,
      invitations,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create new team invitation (Business Owner or Super Admin)
router.post(
  '/invite',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { inviteeEmail, inviteePhone, proposedRole } = req.body;

      if (!inviteeEmail || !proposedRole) {
        res.status(400).json({ error: 'Invitee email and proposed role are required.' });
        return;
      }

      const validRoles = ['BUSINESS_OWNER', 'SENDER', 'RECEIVER'];
      if (!validRoles.includes(proposedRole)) {
        res.status(400).json({ error: 'Proposed role must be BUSINESS_OWNER, SENDER, or RECEIVER.' });
        return;
      }

      const invitation = await sandboxStore.createInvitation(
        {
          businessId: user.businessId,
          inviteeEmail,
          inviteePhone,
          proposedRole,
        },
        user
      );

      res.status(201).json(invitation);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to issue invitation.' });
    }
  }
);

// Revoke an invitation (Business Owner or Super Admin)
router.delete(
  '/invitations/:id',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { id } = req.params;
      const result = await sandboxStore.revokeInvitation(id, user);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to revoke invitation.' });
    }
  }
);

// Accept an invitation (Authenticated user)
router.post('/accept', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = req.user!;
    const { token } = req.body;

    if (!token) {
      res.status(400).json({ error: 'Invitation token is required.' });
      return;
    }

    const result = await sandboxStore.acceptInvitation(token, user);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to accept invitation.' });
  }
});

// Update member role (Business Owner or Super Admin)
router.put(
  '/:userId/role',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { userId } = req.params;
      const { role } = req.body;

      if (!role) {
        res.status(400).json({ error: 'New role is required.' });
        return;
      }

      const updatedUser = await sandboxStore.updateMemberRole(user.businessId, userId, role, user);
      res.json(updatedUser);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to update member role.' });
    }
  }
);

// Remove member from business (Business Owner or Super Admin)
router.delete(
  '/:userId',
  authenticate,
  requireRole('BUSINESS_OWNER', 'SUPER_ADMIN'),
  async (req: AuthenticatedRequest, res) => {
    try {
      const user = req.user!;
      const { userId } = req.params;
      const result = await sandboxStore.removeMember(user.businessId, userId, user);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to remove member.' });
    }
  }
);

export default router;
