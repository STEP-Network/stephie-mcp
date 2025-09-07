# Priority Board Relations Implementation Guide

Generated: 2025-09-07T09:54:39.765Z

## Priority Relations to Implement

These are the most valuable board relations that should be implemented first:

### getAccounts

- **contactsId**: Contacts (`account_contact`)
  - Filter by linked contacts (use getContacts to find IDs)
- **opportunitiesId**: Opportunities (`account_deal`)
  - Filter by linked opportunities (use getOpportunities to find IDs)
- **leadsId**: Leads (`connect_boards9`)
  - Filter by linked leads (use getLeads to find IDs)

### getContacts

- **accountId**: Account (`contact_account`)
  - Filter by linked account (use getAccounts to find IDs)
- **opportunitiesId**: Opportunities (`contact_deal`)
  - Filter by linked opportunities (use getOpportunities to find IDs)

### getOpportunities

- **accountId**: Advertiser/Publisher (`connect_boards31`)
  - Filter by linked account (use getAccounts to find IDs)
- **contactId**: Agency Contact (`deal_contact`)
  - Filter by linked contact (use getContacts to find IDs)
- **bookingId**: Booking (`connect_boards8__1`)
  - Filter by linked booking (use getBookings to find IDs)

### getDeals

- **agencyId**: Agency (`connect_boards_mkmjpjjc`)
  - Filter by agency account (use getAccounts to find IDs)
- **advertiserId**: Advertiser (`connect_boards_mkmjr3e3`)
  - Filter by advertiser account (use getAccounts to find IDs)
- **contactsId**: Contacts (`connect_boards3__1`)
  - Filter by linked contacts (use getContacts to find IDs)

### getTasksTechIntelligence

- **keyResultId**: Key Result (`board_relation_mkpjqgpv`)
  - Filter by linked key result (use OKR subitems to find IDs)
- **teamTaskId**: Team Task (`connect_boards_Mjj8XLFi`)
  - Filter by linked team tasks

### getTasksAdOps

- **keyResultId**: Key Result (`board_relation_mkpjy03a`)
  - Filter by linked key result (use OKR subitems to find IDs)
- **publisherId**: Publisher (`connect_boards_mkkxdfax`)
  - Filter by publisher (use getAllPublishers to find IDs)

### getTasksMarketing

- **keyResultId**: Key Result (`board_relation_mkpjg0ky`)
  - Filter by linked key result (use OKR subitems to find IDs)
- **budgetId**: Budget (`budgets_mkn2xpkt`)
  - Filter by linked budget (use getMarketingBudgets to find IDs)

### getOKR

- **strategiesId**: Strategies (`link_to_strategies__1`)
  - Filter by linked strategies (use getStrategies to find IDs)
- **peopleId**: People (`connect_boards35__1`)
  - Filter by linked people (use getPeople to find IDs)

### getTickets

- **contactId**: Contacts (`connect_boards8__1`)
  - Filter by linked contact (use getContacts to find IDs)
- **assignedId**: Assigned (`connect_boards__1`)
  - Filter by assigned person (use getPeople to find IDs)
- **publisherId**: Publisher (`connect_boards08__1`)
  - Filter by publisher (use getAllPublishers to find IDs)

## Implementation Pattern

For each relation parameter, add to the tool file:

```typescript
// In the params interface
getAccountsId?: string; // Filter by linked getAccounts (use getgetAccounts to find IDs)

// In the filtering logic (after fetching items)
if (getAccountsId) {
  items = items.filter((item: any) => {
    const relationCol = item.column_values.find((c: any) => c.id === 'column_id_here');
    if (relationCol?.value) {
      try {
        const linked = JSON.parse(relationCol.value);
        return linked?.linkedItemIds?.includes(getAccountsId);
      } catch {
        return false;
      }
    }
    return false;
  });
}

// In the output section
if (getAccountsId) {
  // Show the related item name if possible
  lines.push(`**Filter:** Related to ID ${getAccountsId}`);
}
```

## Testing Checklist

- [ ] Parameter accepts Monday.com item IDs
- [ ] Filtering correctly checks linkedItemIds array
- [ ] Tool description mentions using related tool first
- [ ] Output shows both name and ID when possible
- [ ] Error handling for invalid JSON
