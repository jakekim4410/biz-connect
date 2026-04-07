# Prompt for Meeting Workflow Optimization & Premium Chat UX

This prompt is designed for an AI coding assistant to implement the buyer-seller meeting workflow enhancements and premium chat interface.

---

## 🎯 Objective
Finalize the buyer-seller matching workflow by implementing localized rejection logic, ensuring PIC (Person In Charge) data synchronization, and upgrading the meeting chat to a premium, Slack-like UX.

## 🛠 Required Tasks

### 1. Multi-language Rejection Processing
- **i18n Update**: Add rejection-related translation keys (rejection reasons like 'Schedule Mismatch', 'Industry Mismatch', etc.) to `lib/i18n.tsx`.
- **Locale-Aware Actions**: Update server actions in `app/buyer/actions.ts` (`handleStatusAction`, `acceptDirectMeetingAction`, and a new `rejectDirectMeetingAction`) to accept a `locale` parameter.
- **Dynamic Messages**: When a buyer rejects a meeting, the system should automatically generate a rejection message in the buyer's current language (KO/EN) and save it to the database.

### 2. Direct Proposal Rejection Logic
- **New Server Action**: Implement `rejectDirectMeetingAction` in `app/buyer/actions.ts` to handle rejections of direct meeting proposals (where no specific timeslot was pre-selected).
- **Client Integration**: Update `BuyerClient.tsx` to call this new action with the current `locale`.

### 3. PIC Info Synchronization & Visibility
- **Data Sync**: Ensure that when a meeting is accepted, the assigned PIC (if any) is correctly linked to the `Meeting` record.
- **UI Exposure**:
    - **Buyer View**: Show the 'Assigned PIC' in the confirmed/pending meeting cards and tables.
    - **Seller View**: Show the Buyer's PIC information so they know who they are meeting with.
    - **Chat Header**: Display PIC information in the chat modal header for clarity.

### 4. Premium Chat UI/UX Upgrade (`MeetingChat.tsx`)
- **Message Grouping**: Group consecutive messages from the same sender within a 5-minute window (hide avatars/names for grouped messages).
- **Real-time Indicators**: Add a "New Message" indicator that appears when the user is scrolled up and a new message arrives.
- **Scrolling**: Implement smooth, automatic scrolling to the bottom on new messages.
- **Polling Optimization**: Shorten the polling interval to ~5 seconds for a more "real-time" feel.
- **Aesthetics**: Use a Slack/Toss-style design with clean typography, subtle shadows, and refined message bubbles.

## 📐 Implementation Guidelines
- **Framework**: Next.js (App Router).
- **Styling**: Vanilla CSS / Tailwind CSS (follow existing patterns).
- **Icons**: Lucide-React.
- **Aesthetics**: Prioritize "Premium" and "Professional" vibes. Use `bg-slate-50`, `bg-indigo-600`, and `text-slate-800` as primary color schemes.

---

**Note to AI**: Please research the existing `Meeting` and `MeetingRequest` schemas before implementation to ensure data integrity.
