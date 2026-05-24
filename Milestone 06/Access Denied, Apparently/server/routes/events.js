import express from 'express';
import { events } from '../data/store.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Middleware to protect all routes
router.use(authMiddleware);

// FIX 1 — Vulnerability 1: Unauthorized Event Discovery
// Previously returned ALL events to any authenticated user.
// Now filters to only events where the user is the creator OR their email is in the invitedEmails list.
router.get('/', (req, res) => {
    const accessibleEvents = events.filter(event =>
        event.creatorId === req.user.id ||
        event.invitedEmails.includes(req.user.email)
    );
    res.json(accessibleEvents);
});

router.post('/', (req, res) => {
    const { title, description, date, invitedEmails } = req.body;
    const newEvent = {
        id: Date.now().toString(),
        title,
        description,
        date,
        creatorId: req.user.id,
        invitedEmails: invitedEmails || [],
        rsvps: []
    };
    events.push(newEvent);
    console.log(`Invitations sent for event "${title}" to: ${newEvent.invitedEmails.join(', ')}`);
    res.status(201).json(newEvent);
});

// FIX 2 — Vulnerability 2: Private Detail Disclosure
// Previously returned full event data to ANY authenticated user who knew the event ID.
// Now checks that the requesting user is either the creator or is on the invitedEmails list.
// If neither condition is met, returns 403 Forbidden — no data leaked.
router.get('/:id', (req, res) => {
    const event = events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    const isCreator = event.creatorId === req.user.id;
    const isInvited = event.invitedEmails.includes(req.user.email);

    // ACCESS CONTROL CHECK — block anyone who is neither creator nor invitee
    if (!isCreator && !isInvited) {
        return res.status(403).json({ message: 'Forbidden: You do not have access to this event.' });
    }

    res.json({
        ...event,
        isCreator,
        isInvited
    });
});

// FIX 3 — Vulnerability 3: RSVP Gatekeeping Bypass
// Previously accepted RSVPs from ANY authenticated user with no invitation check.
// Now verifies the user's email is in invitedEmails before recording the RSVP.
// Also prevents duplicate RSVPs (same user RSVPing multiple times).
router.post('/:id/rsvp', (req, res) => {
    const event = events.find(e => e.id === req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // INVITATION CHECK — only invited users can RSVP
    if (!event.invitedEmails.includes(req.user.email)) {
        return res.status(403).json({ message: 'Forbidden: You are not invited to this event.' });
    }

    // DUPLICATE CHECK — prevent the same user from RSVPing more than once
    if (event.rsvps.includes(req.user.id)) {
        return res.status(400).json({ message: 'You have already RSVPed to this event.' });
    }

    event.rsvps.push(req.user.id);
    res.json({ message: 'RSVP successful', event });
});

// FIX 4 — Vulnerability 4: Unauthorized Data Deletion
// Previously deleted any event for any authenticated user with no ownership check.
// Now verifies that the requesting user is the event creator before allowing deletion.
// Any other user receives a 403 Forbidden — the event is untouched.
router.delete('/:id', (req, res) => {
    const index = events.findIndex(e => e.id === req.params.id);
    if (index === -1) return res.status(404).json({ message: 'Event not found' });

    const event = events[index];

    // OWNERSHIP CHECK — only the creator can delete their event
    if (event.creatorId !== req.user.id) {
        return res.status(403).json({ message: 'Forbidden: Only the event creator can delete this event.' });
    }

    events.splice(index, 1);
    res.json({ message: 'Event deleted' });
});

export default router;
