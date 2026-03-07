# REVIV — Real-Time Environmental Visualization & Impact Volunteering

> DonsHack '26 — A community-driven platform for discovering, organizing, and completing environmental cleanup efforts through an interactive 3D global map.

---

## Overview

REVIV connects people who care about their environment with the specific places that need their help. Users can explore a real-time, interactive 3D globe to find areas affected by trash and litter, then coordinate with others in their community to organize cleanup events — all from one platform.

The core belief behind REVIV: **environmental action starts local, but scales global.**

---

## Problem Statement

Litter and illegal dumping are widespread but fragmented problems. Individuals who want to help often don't know:
- Where the worst affected areas are near them
- Whether others in their community share their concern
- How to coordinate a cleanup effort without significant overhead

REVIV solves all three.

---

## POC Feature Scope

This document outlines the Proof of Concept (POC) feature set. The POC is intentionally scoped to validate the core loop:

**Discover a problem area → Create or join a cleanup event → Clean it up → Mark it resolved.**

---

## Core Features

### 1. User Accounts

Users can register and maintain a personal profile on REVIV.

**Registration & Authentication**
- Sign up with email and password
- Email verification
- Login / logout
- Password reset

**User Profile**
- Display name and avatar
- City / general location (used to center their default globe view)
- Events created (history)
- Events joined (history)
- Cleanup impact stats: number of events attended, estimated area cleaned

> The profile is intentionally lightweight for the POC. It exists to create identity, accountability, and personal motivation through visible impact history.

---

### 2. Interactive 3D Globe

The centerpiece of REVIV is a navigable 3D globe that users land on immediately after logging in.

**Globe Interaction**
- Rotate and spin the globe freely in all directions
- Zoom in smoothly from a global view down to a city, neighborhood, or street level
- Pan across regions when zoomed in
- Tap or click any point to see what is there

**Zoom Levels**

| Level | View |
|---|---|
| Global | Full Earth, continents visible |
| Regional | Country / state / province |
| City | Metro area, major districts visible |
| Neighborhood | Streets, blocks, parks |
| Fine-grain | Specific lots, sidewalks, waterways |

The experience should feel seamless with no hard jumps between zoom levels.

**Reported Problem Areas**

Overlaid on the globe are visual markers representing areas with reported litter and trash accumulation. These markers are the primary data layer for the POC.

- At higher zoom levels, markers aggregate into cluster indicators (e.g., "14 reports in this district")
- At fine-grain zoom levels, individual markers are visible
- Markers are color-coded by severity:
  - **Low** — isolated litter, small area affected
  - **Medium** — notable accumulation, public nuisance
  - **High** — significant dumping, health or safety concern
- Tapping a marker opens a location detail panel (see Section 4)

---

### 3. Location Detail Panel

When a user taps a marker or area on the globe, a detail panel opens with:

- Location name, address, or approximate area label
- Severity indicator
- Number of reports submitted for this area
- Photos from reports (if any)
- List of upcoming cleanup events tied to this location
- "Create a Cleanup Event here" action
- "Join an existing event" action

---

### 4. Cleanup Events

Events are the action layer of REVIV. They transform map data into real-world coordination.

**Creating an Event**

Any registered user can create a cleanup event. Required fields:
- Event name
- Location (linked to a specific map point or area; can also be created independent of an existing report)
- Date and time
- Estimated duration
- Max number of volunteers (optional cap)
- Short description and notes on what to bring
- Organizer contact info (optional)

**Discovering Events**
- Events appear on the globe as distinct markers, visually differentiated from problem reports
- Users can browse a list view of events filtered by:
  - Distance from their location
  - Date range
  - Severity of the area being addressed
- Recommended events are surfaced based on the user's home location

**Joining an Event**
- Any registered user can join an open event with one tap
- Joined events appear in the user's profile under "My Upcoming Events"
- Users receive a reminder notification day-of and 1 hour before the event
- If an event hits its volunteer cap, it shows as "Full" with a waitlist option

**Event Status Lifecycle**

```
Open → Full (optional) → In Progress → Completed → Resolved
```

- **Open**: Accepting volunteers
- **Full**: Cap reached, waitlist available
- **In Progress**: Event date/time has arrived
- **Completed**: Organizer marks the event done
- **Resolved**: Attendees confirm the area is clean; linked reports are marked resolved

**Post-Event**

After an event is marked complete:
- Attendees can confirm resolution ("Yes, the area is clean")
- Attendees can add post-cleanup photos
- The organizer and all attendees receive impact credit on their profiles
- The linked map marker updates to "Resolved"

---

### 5. Notifications

A simple notification system to keep users engaged and informed.

**Notification Types**
- Event reminder (day-of and 1 hour before)
- New event created near the user's location
- An event the user joined has been updated (time change, cancellation)
- A report the user submitted has been linked to an event
- Post-event confirmation prompt ("Did you attend? Is the area clean?")

> For the POC, notifications are delivered in-app only. Push notifications are a post-POC enhancement.

---

### 6. Impact Dashboard

A lightweight personal and community stats view.

**Personal Stats (on Profile)**
- Events attended
- Events organized
- Total volunteer hours logged
- Reports submitted
- Reports resolved

**Community Stats (optional for POC)**
- Total events completed globally
- Total reports resolved
- Most active cities
- Most improved areas (based on report resolution rate)

> Even a small amount of visible impact data significantly increases user motivation and retention. This layer provides proof that collective action is working.

---

## Bonus feature
### 1. Litter Report Submissions

Any registered user can submit a litter report to add a problem area to the map.

**Report Fields**
- Location (auto-detected via GPS or manually placed on the map)
- Severity level (Low / Medium / High)
- Brief description (optional, free text)
- Photo upload (optional, up to 3 images)
- Category tags: Roadside, Park, Waterway, Construction Debris, Illegal Dump

**Report Behavior**
- Submitted reports appear on the globe immediately
- Other users can upvote reports to surface the most critical areas
- Reports are marked as "Resolved" when a linked cleanup event is completed and confirmed by attendees
- Resolved reports are visually distinguished on the map and cycle off the active problem layer after a cooldown period

> For the POC, reports are user-submitted and community-moderated. There is no automated data ingestion. This keeps the system simple while validating whether users will engage with the reporting mechanism.

---

## User Flows

### Flow A: New User Discovers and Joins an Event
1. User registers and sets their city
2. Globe loads centered on their location
3. User sees markers indicating reported litter areas nearby
4. User taps a marker and sees an upcoming cleanup event
5. User reads the event details and taps "Join"
6. Event appears in their profile under "My Events"
7. User receives a reminder on event day
8. After attending, user confirms and marks the area clean
9. Profile impact stats update

### Flow B: User Spots a Problem and Creates an Event
1. User notices litter in their neighborhood
2. User opens REVIV and navigates to the location on the globe
3. User submits a litter report with a photo and severity level
4. A marker appears on the map at that location
5. User creates a cleanup event linked to the report, sets a date and description
6. Nearby users discover the event via the globe or notifications
7. Volunteers join, attend, and confirm resolution
8. Report is marked resolved on the map

### Flow C: Browsing Without an Account
- Non-registered users can view the globe, reported problem areas, and public events
- They cannot submit reports, create events, or join events
- A prompt encourages them to register to take action

> This open browsing mode is intentional. The globe itself is a powerful hook — seeing the visible scope of the problem near you is a strong motivator to sign up and do something about it.

---

## Out of Scope for POC

The following are acknowledged as valuable but explicitly excluded from the POC to maintain focus:

- Automated litter detection via satellite imagery or AI image analysis
- Integration with municipal waste management or government databases
- Corporate or organizational sponsor/partner profiles
- Gamification beyond basic stats (leaderboards, badges, streaks)
- In-app messaging or chat between users
- Multi-language and localization support
- Offline mode
- Native mobile app (POC targets mobile-friendly web)
- Push notifications (in-app only for POC)
- Moderation and reporting tools for abuse
- Payment or donation features

These are natural Phase 2 additions once the core loop is validated with real users.

---

## Scalability Considerations

The POC is designed so each component can scale independently:

- **Reports** can grow from user-submitted to ingesting external data sources (government APIs, partner NGOs, satellite data pipelines)
- **Events** can expand to support organizational accounts, recurring events, and sponsored corporate cleanups
- **The globe** can support additional environmental data layers beyond litter (air quality, water quality, urban heat islands, flood risk)
- **Impact stats** can evolve into verified, exportable impact reports for corporate ESG programs and nonprofits
- **Community** features can expand to city-level chapters, neighborhood groups, team-based cleanup challenges, and school programs

The POC validates the foundational loop. Everything else is additive.

---

## POC Success Criteria

The POC is considered successful if:

1. Users can register and navigate the globe without friction
2. At least one full core loop is completable end-to-end: report submitted → event created → event attended → report resolved
3. The globe visualization is performant and intuitive across all zoom levels
4. Event discovery feels natural and geographically relevant
5. New users understand the purpose of the app within 30 seconds of opening it

---

## Summary

REVIV turns environmental concern into environmental action. By making the problem visible on a 3D globe and lowering the barrier to organizing, the app transforms passive awareness into active community cleanup. The POC focuses on proving this loop is compelling, intuitive, and worth scaling.
