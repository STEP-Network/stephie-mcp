#!/usr/bin/env npx tsx
/**
 * Output all mapping updates for tool definitions
 */

const mappings = {
  // Opportunities
  getOpportunities: {
    stage: "Stage: 0=Contacted, 1=Won (don't use), 2=Lost, 3=Offer sent, 4=New, 6=Won PG/PD, 7=Won IO, 8=Won Publisher, 9=In pitch",
    status4__1: "GetAccept template: 0=High Impact, 1=Interstitial, 2=Boligsiden, 107=Pris box",
    status8__1: "Visible in Booking: 1=Visible, 2=Invisible",
    status3__1: "Booking Status: 1=Delivering completed + report sent, 2=Deal not ready, 4=Ready for midway report, 6=Ready for final report, 19=New IO's, 107=Booked / Delivering",
    status9__1: "Product: 3=Programmatic Guaranteed, 4=Insertion Order, 6=Brand Bridge, 19=Preferred Deal",
    formats: "Formats (dropdown): 1=Double Midscroll, 2=Midscroll, 3=Midscroll Desktop, 4=Midscroll Mobile, 5=Native, 6=Premium Interstitial, 7=Standard formats, 8=Topscroll, 9=Topscroll Desktop, 10=Topscroll Mobile, 11=Topscroll Expand, 12=Wallpaper, 13=Video - Outstream, 14=Video - Preroll SNVS, 15=Re-Ad"
  },
  // Sales Activities
  getSalesActivities: {
    activity_status: "Status: 0=To do, 1=Done, 2=Open, 3=Planned, 4=Add Expense, 5=Waiting for progress",
    activity_type: "Activity Type: 0=Call summary, 1=Email, 4=Event, 9=Anniversary (mærkedag), 11=Follow-up, 12=Send offer, 13=Social activity, 14=Meeting, 17=Contact (call/email/sms), 18=Agency presentation, 19=Media meeting"
  },
  // Contacts
  getContacts: {
    area: "Area (dropdown): 4=C-level, 9=Client, 10=Programmatic, 11=Publisher, 12=SoMe, 13=Campaign Manager, 14=Data, 15=Video, 18=Native, 19=Display IO, 21=Head of Marketing, 22=Content Manager, 23=Project Manager, 24=Adtech, 25=Head of Digital, 26=København",
    status5: "Tier: 0=D-level, 1=C-level, 2=A-level, 19=P-level, 107=Ambassador",
    status__1: "Status: 0=Working on it, 1=Good relation, 2=Stuck, 3=Rejected, 4=Stopped, 19=No contact, 107=Waiting"
  },
  // Accounts
  getAccounts: {
    status: "Account Status: 0=On hold, 4=Client, 13=Past Client, 17=New Biz",
    industry: "Industry (dropdown): 1=Tech, 9=Mediebureau, 10=Hus & Hjem, 11=Erhverv, 12=Real Estate, 13=Mode & Skønhed, 14=Mad, 15=Shopping, 16=Uddannelse, 17=Automotive, 18=Sport, 19=Elektronik, 20=Mobil og Internet, 21=Rejse, 22=Finans, 23=Underholdning, 24=Spil & Gambling, 25=Politik, 26=Forsikring, 27=Sundhed, 28=Offentlig Virksomhed, 29=Publisher, 30=NGO, 31=FMCG",
    status5: "Type: 0=Agency, 1=Agency Group, 2=Partner, 3=Publisher, 4=Publisher Lead, 107=Advertiser"
  },
  // Leads
  getLeads: {
    lead_status: "Status: 0=New, 1=Qualified, 2=New Lead, 5=Ikke interesseret, 11=Unqualified, 14=Contacted",
    status_1__1: "Type: 1=Publisher, 2=Advertiser"
  }
};

// Output tool definition updates
console.log('\n=== TOOL DEFINITION UPDATES ===\n');

for (const [tool, columns] of Object.entries(mappings)) {
  console.log(`\n// ${tool}`);
  for (const [colId, mapping] of Object.entries(columns)) {
    console.log(`${colId}: { type: 'number', description: '${mapping}' },`);
  }
}

// Output for documentation
console.log('\n\n=== DOCUMENTATION UPDATES ===\n');

for (const [tool, columns] of Object.entries(mappings)) {
  console.log(`\n## ${tool.replace('get', '')}\n`);
  console.log(`### Tool: \`${tool}\`\n`);
  
  for (const [colId, mapping] of Object.entries(columns)) {
    const [title, ...values] = mapping.split(': ');
    console.log(`**${colId}** (${title}):`);
    const valueList = values.join(': ').split(', ');
    for (const value of valueList) {
      console.log(`- ${value}`);
    }
    console.log('');
  }
}