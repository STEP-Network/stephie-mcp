# Status and Dropdown Column Index Mappings

This document provides comprehensive index-to-label mappings for all status and dropdown columns used in Monday.com board tools.

## Why Index Mappings Matter

When using MCP tools, status and dropdown columns require numeric indices instead of text values. This document helps LLMs and developers understand which index corresponds to which label.

## Tasks - Tech & Intelligence

### Tool: `getTasksTechIntelligence`, `createTasksTechIntelligence`, `updateTasksTechIntelligence`

**status_19__1** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

**type_1__1** (Type):
- 1 = Support
- 3 = Maintenance
- 4 = Development
- 5 = Not Labelled
- 6 = Bugfix
- 7 = Documentation
- 12 = Meeting

**priority_1__1** (Priority):
- 0 = Medium
- 1 = Minimal
- 2 = Low
- 3 = Critical
- 4 = High
- 5 = Not Prioritized
- 6 = Unknown

## Tasks - AdOps

### Tool: `getTasksAdOps`

**status** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

**priority** (Priority):
- 0 = Medium
- 1 = Minimal
- 2 = Low
- 3 = Critical
- 4 = High
- 5 = Not Prioritized
- 6 = Unknown

**type** (Type):
- 0 = Hackathon
- 1 = Publisher
- 2 = Product
- 3 = Template
- 5 = Task

## Tasks - Marketing

### Tool: `getTasksMarketing`

**status** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

**priority** (Priority):
- 0 = Medium
- 1 = Minimal
- 2 = Low
- 3 = Critical
- 4 = High
- 5 = Not Prioritized
- 6 = Unknown

**type** (Type):
- 0 = Andet
- 1 = Kommunikationsplan Media Summit 2025
- 3 = Case
- 4 = Aktivitet
- 19 = Content

**channel** (Channel - dropdown):
- 0 = LinkedIn
- 1 = Newsletter
- 2 = PR
- 3 = Annoncering
- 4 = Blogindlæg

## Tasks - AdTech

### Tool: `getTasksAdTech`

**status** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

**priority** (Priority):
- 0 = P2 - Medium
- 1 = P4 - Minimal
- 2 = P3 - Low
- 3 = P0 - Critical ⚠️️
- 4 = P1 - High
- 5 = Missing
- 6 = P5 - Unknown

**releaseStatus** (Release status):
- 0 = Alpha (pre-testing)
- 1 = Production (live)
- 2 = Beta (pre-release)
- 3 = Drift or bugs
- 4 = Reminder
- 107 = Research (bubbles)

## Tasks - Video

### Tool: `getTasksVideo`

**status** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

**type** (Type):
- 0 = Question
- 1 = Idea
- 2 = Opportunity
- 3 = Bug
- 4 = Development
- 5 = Not Labelled
- 6 = Stuck

## Teams

### Tool: `getTeams`

**status** (Status):
- 0 = Under-Ressourced
- 1 = Active
- 2 = Inactive

## OKR

### Tool: `getOKR`

**status** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

**health** (Health):
- 0 = At Risk
- 1 = On Track
- 2 = Off Track

## Bugs

### Tool: `getBugs`

**color_mkqhya7m** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

**color_mkqnwy18** (Priority):
- 0 = Medium
- 1 = Minimal
- 2 = Low
- 3 = Critical
- 4 = High
- 5 = Not Prioritized
- 6 = Unknown

## Features

### Tool: `getFeatures`

**status** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

**priority** (Priority):
- 0 = Medium
- 1 = Minimal
- 2 = Low
- 3 = Critical
- 4 = High
- 5 = Not Prioritized
- 6 = Unknown

## Deals

### Tool: `getDeals`

**status** (Status):
- 0 = Working on it
- 1 = Done
- 2 = Stuck
- 3 = Deal godkendt
- 4 = Archived
- 6 = Contacted
- 19 = Sendt til godkendelse
- 107 = On hold

## Opportunities

### Tool: `getOpportunities`

**stage** (Stage):
- 0 = Contacted
- 1 = Won (don't use)
- 2 = Lost
- 3 = Offer sent
- 4 = New
- 6 = Won PG/PD
- 7 = Won IO
- 8 = Won Publisher
- 9 = In pitch

**bookingStatus** (Booking Status):
- 1 = Delivering completed + report sent
- 2 = Deal not ready
- 4 = Ready for midway report
- 6 = Ready for final report
- 19 = New IO's
- 107 = Booked / Delivering

**product** (Product):
- 3 = Programmatic Guaranteed
- 4 = Insertion Order
- 6 = Brand Bridge
- 19 = Preferred Deal

## Sales Activities

### Tool: `getSalesActivities`

**status** (Status):
- 0 = To do
- 1 = Done
- 2 = Open
- 3 = Planned
- 4 = Add Expense
- 5 = Waiting for progress

**type** (Activity Type):
- 0 = Call summary
- 1 = Email
- 4 = Event
- 9 = Anniversary (mærkedag)
- 11 = Follow-up
- 12 = Send offer
- 13 = Social activity
- 14 = Meeting
- 17 = Contact (call/email/sms)
- 18 = Agency presentation
- 19 = Media meeting

## Contacts

### Tool: `getContacts`

**status** (Status):
- 0 = Working on it
- 1 = Good relation
- 2 = Stuck
- 3 = Rejected
- 4 = Stopped
- 19 = No contact
- 107 = Waiting

**tier** (Tier):
- 0 = D-level
- 1 = C-level
- 2 = A-level
- 19 = P-level
- 107 = Ambassador

## Accounts

### Tool: `getAccounts`

**status** (Account Status):
- 0 = On hold
- 4 = Client
- 13 = Past Client
- 17 = New Biz

**status5** (Type):
- 0 = Agency
- 1 = Agency Group
- 2 = Partner
- 3 = Publisher
- 4 = Publisher Lead
- 107 = Advertiser

## Leads

### Tool: `getLeads`

**status** (Status):
- 0 = New
- 1 = Qualified
- 2 = New Lead
- 5 = Ikke interesseret
- 11 = Unqualified
- 14 = Contacted

**type** (Type):
- 1 = Publisher
- 2 = Advertiser

## Bookings

### Tool: `getBookings`

**status0__1** (Status):
- 0 = Not ready
- 1 = Delivering completed + report sent
- 2 = Under Booking
- 3 = Booked
- 4 = Delivering
- 6 = Ready for final reporting
- 19 = New

## Tickets

### Tool: `getTickets`

**status** (Status):
- 0 = New response
- 1 = Customer responded
- 2 = On hold
- 3 = Email Sent
- 5 = New
- 7 = Awaiting response
- 11 = Resolved

**priority** (Priority):
- 7 = Low
- 10 = Critical
- 109 = Medium
- 110 = High

## Tasks - Yield & Growth

### Tool: `getTasksYieldGrowth`

**status** (Status):
- 0 = In Review
- 1 = Done
- 2 = Rejected
- 3 = Planned
- 4 = In Progress
- 5 = Missing Status
- 6 = Waiting On Others
- 7 = New
- 8 = On Hold

## Common Status Patterns

Many boards use similar status patterns. Here are common ones:

### Standard Task Status
- New/Open
- In Progress
- Done/Completed
- On Hold
- Rejected/Cancelled

### Priority Levels
- Critical/Urgent
- High
- Medium
- Low
- Minimal/None

### Sales Status
- Lead
- Qualified
- Proposal
- Negotiation
- Closed Won
- Closed Lost

## Usage Examples

### Creating a new Tech & Intelligence task with "In Progress" status:
```javascript
createTasksTechIntelligence({
  name: "Implement new feature",
  status_19__1: 4,  // In Progress
  type_1__1: 4,     // Development
  priority_1__1: 4  // High
})
```

### Filtering tasks by status:
```javascript
getTasksTechIntelligence({
  status_19__1: 1  // Get all "Done" tasks
})
```

## Notes for LLMs

1. **Always use numeric indices** when calling tools, not the text labels
2. **Reference this document** when unsure about which index to use
3. **Default values** vary by board - when in doubt, use index 0 or omit the parameter
4. **Case-sensitive** - The column IDs (like `status_19__1`) must match exactly

## Updating This Document

When adding new tools or boards:
1. Run `scripts/get-status-dropdown-mappings.ts` to fetch current mappings
2. Add the mappings to this document
3. Update tool definitions in `lib/mcp/toolDefinitions.ts`
4. Update Vercel deployment in `api/server.ts`