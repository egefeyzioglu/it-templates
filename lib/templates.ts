export type TicketFields = {
  caller?: string;
  onBehalfOf?: string;
  location?: string;
  shortDescription?: string;
  description?: string;
  additionalComments?: string;
  workNotes?: string;
  channel?: string;
  state?: string;
  category?: string;
  subcategory?: string;
  subcategory2?: string;
  subcategory3?: string;
  assignmentGroup?: string;
  assignedTo?: string;
  impact?: string;
  urgency?: string;
  resolutionCode?: string;
  resolutionNotes?: string;
};

export type TicketTemplate = {
  id: string;
  title: string;
  summary: string;
  keywords: string[];
  parentId?: string;
  fields: TicketFields;
};

export type ResolvedTemplate = TicketTemplate & {
  depth: number;
  fields: TicketFields;
  parent?: TicketTemplate;
};

// Seed data: replace or extend these records when the production wording is available.
export const defaultTemplates: TicketTemplate[] = [
  {
    id: "account-access",
    title: "Account access",
    summary: "Unable to sign in to an institutional account.",
    keywords: ["login", "password", "mfa", "locked"],
    fields: {
      shortDescription: "Unable to access account",
      description:
        "User is unable to sign in.\n\nAccount/service: \nError message: \nLast known successful login: \nTroubleshooting completed: ",
      category: "Access",
      assignmentGroup: "Service Desk",
      impact: "3 - Low",
      urgency: "3 - Low",
    },
  },
  {
    id: "account-password",
    parentId: "account-access",
    title: "Password reset",
    summary: "Password is forgotten, expired, or rejected.",
    keywords: ["forgot", "expired", "reset"],
    fields: {
      shortDescription: "Password reset required",
      subcategory: "Password reset",
      workNotes:
        "Identity verification required before resetting the password.",
    },
  },
  {
    id: "account-mfa",
    parentId: "account-access",
    title: "MFA issue",
    summary: "Authenticator, prompt, or verification-code failure.",
    keywords: ["duo", "authenticator", "phone", "code"],
    fields: {
      shortDescription: "MFA authentication issue",
      subcategory: "Multi-factor authentication",
      description:
        "User is unable to complete MFA.\n\nAccount/service: \nMFA method: \nDevice available: \nExact error: \nTroubleshooting completed: ",
    },
  },
  {
    id: "network",
    title: "Network connectivity",
    summary: "Device cannot reach the campus network or internet.",
    keywords: ["wifi", "wireless", "ethernet", "internet", "vpn"],
    fields: {
      shortDescription: "Network connectivity issue",
      description:
        "User cannot connect to the network.\n\nLocation: \nDevice: \nConnection type: \nNetwork name: \nError message: \nTroubleshooting completed: ",
      category: "Network",
      assignmentGroup: "Network Services",
      impact: "3 - Low",
      urgency: "3 - Low",
    },
  },
  {
    id: "network-wifi",
    parentId: "network",
    title: "Wi-Fi",
    summary: "Wireless network connection is unavailable or unstable.",
    keywords: ["eduroam", "signal", "wireless"],
    fields: {
      shortDescription: "Wi-Fi connection issue",
      subcategory: "Wireless",
      description:
        "User cannot connect reliably to Wi-Fi.\n\nLocation: \nDevice/OS: \nNetwork name: \nSignal visible: \nExact error: \nOther networks affected: \nTroubleshooting completed: ",
    },
  },
  {
    id: "network-vpn",
    parentId: "network",
    title: "VPN",
    summary: "Remote-access VPN will not connect.",
    keywords: ["remote", "globalprotect", "tunnel"],
    fields: {
      shortDescription: "VPN connection issue",
      subcategory: "VPN",
      description:
        "User cannot establish a VPN connection.\n\nLocation: \nDevice/OS: \nVPN client/version: \nExact error: \nHome internet working: \nTroubleshooting completed: ",
    },
  },
  {
    id: "email",
    title: "Email",
    summary: "Mail delivery, mailbox, or client problem.",
    keywords: ["outlook", "mailbox", "message", "calendar"],
    fields: {
      shortDescription: "Email issue",
      description:
        "User reports an email issue.\n\nMail client/browser: \nDevice/OS: \nAffected mailbox: \nExact error: \nScope/other users: \nTroubleshooting completed: ",
      category: "Email",
      assignmentGroup: "Messaging Services",
      impact: "3 - Low",
      urgency: "3 - Low",
    },
  },
  {
    id: "email-delivery",
    parentId: "email",
    title: "Delivery failure",
    summary: "Message is delayed, rejected, or never arrives.",
    keywords: ["bounce", "ndr", "spam", "missing"],
    fields: {
      shortDescription: "Email delivery failure",
      subcategory: "Mail flow",
      description:
        "Email was not delivered as expected.\n\nSender: \nRecipient: \nDate/time sent: \nSubject: \nNDR/error text: \nExternal or internal: \nTroubleshooting completed: ",
    },
  },
  {
    id: "software",
    title: "Software support",
    summary: "Application installation, launch, or behavior issue.",
    keywords: ["application", "install", "crash", "license"],
    fields: {
      shortDescription: "Software support request",
      description:
        "User reports a software issue.\n\nApplication/version: \nDevice/OS: \nExpected behavior: \nActual behavior/error: \nBusiness impact: \nTroubleshooting completed: ",
      category: "Software",
      assignmentGroup: "Endpoint Support",
      impact: "3 - Low",
      urgency: "3 - Low",
    },
  },
  {
    id: "software-install",
    parentId: "software",
    title: "Install request",
    summary: "Request to install approved software.",
    keywords: ["deployment", "download", "package"],
    fields: {
      shortDescription: "Software installation request",
      subcategory: "Installation",
      description:
        "Software installation requested.\n\nApplication/version: \nDevice/asset tag: \nLicense available: \nBusiness justification: \nRequired by date: ",
    },
  },
  {
    id: "hardware",
    title: "Hardware issue",
    summary: "Computer, display, dock, or peripheral failure.",
    keywords: ["laptop", "monitor", "keyboard", "dock", "printer"],
    fields: {
      shortDescription: "Hardware issue",
      description:
        "User reports a hardware problem.\n\nDevice/asset tag: \nLocation: \nSymptoms: \nDamage observed: \nBusiness impact: \nTroubleshooting completed: ",
      category: "Hardware",
      assignmentGroup: "Endpoint Support",
      impact: "3 - Low",
      urgency: "3 - Low",
    },
  },
  {
    id: "hardware-display",
    parentId: "hardware",
    title: "Display or dock",
    summary: "External monitor or docking station problem.",
    keywords: ["screen", "monitor", "usb-c", "docking"],
    fields: {
      shortDescription: "Display or docking station issue",
      subcategory: "Display / dock",
      description:
        "External display or dock is not working.\n\nComputer/asset tag: \nDock model: \nMonitor model: \nConnection/cable: \nPower indicators: \nTroubleshooting completed: ",
    },
  },
  {
    id: "security",
    title: "Security concern",
    summary: "Suspicious message, device activity, or possible compromise.",
    keywords: ["phishing", "malware", "compromised", "spam"],
    fields: {
      shortDescription: "Potential information security incident",
      description:
        "Potential security concern reported.\n\nWhat happened: \nDate/time observed: \nDevice/account affected: \nLinks or attachments opened: \nCredentials entered: \nActions already taken: ",
      category: "Security",
      assignmentGroup: "Information Security",
      impact: "2 - Medium",
      urgency: "2 - Medium",
    },
  },
  {
    id: "security-phishing",
    parentId: "security",
    title: "Phishing email",
    summary: "Suspicious email or credential-harvesting attempt.",
    keywords: ["message", "link", "attachment", "sender"],
    fields: {
      shortDescription: "Suspected phishing email",
      subcategory: "Phishing",
      description:
        "Suspected phishing message reported.\n\nSender/address: \nSubject: \nDate/time received: \nLink clicked: No / Yes\nAttachment opened: No / Yes\nCredentials entered: No / Yes\nMessage attached to ticket: No / Yes",
    },
  },
  {
    id: "general-request",
    title: "General IT request",
    summary:
      "Fallback intake for a request that does not fit another template.",
    keywords: ["other", "question", "help"],
    fields: {
      shortDescription: "General IT support request",
      description:
        "Request details: \n\nUser/location: \nDevice or service: \nDesired outcome: \nBusiness impact: \nTroubleshooting completed: ",
      assignmentGroup: "Service Desk",
      impact: "3 - Low",
      urgency: "3 - Low",
    },
  },
];

export function resolveTemplate(
  template: TicketTemplate,
  templates: TicketTemplate[] = defaultTemplates,
): ResolvedTemplate {
  const byId = new Map(templates.map((item) => [item.id, item]));
  const parent = template.parentId ? byId.get(template.parentId) : undefined;
  const inheritedFields = (
    current: TicketTemplate | undefined,
    visited: Set<string>,
  ): TicketFields => {
    if (!current || visited.has(current.id)) return {};
    visited.add(current.id);
    const ancestor = current.parentId ? byId.get(current.parentId) : undefined;
    return { ...inheritedFields(ancestor, visited), ...current.fields };
  };
  let depth = 0;
  let ancestor = parent;
  const visited = new Set([template.id]);
  while (ancestor && !visited.has(ancestor.id)) {
    visited.add(ancestor.id);
    depth += 1;
    ancestor = ancestor.parentId ? byId.get(ancestor.parentId) : undefined;
  }
  return {
    ...template,
    parent,
    depth,
    fields: {
      ...inheritedFields(parent, new Set([template.id])),
      ...template.fields,
    },
  };
}

export function resolveTemplates(
  templates: TicketTemplate[],
): ResolvedTemplate[] {
  return templates.map((template) => resolveTemplate(template, templates));
}

export function searchTemplates(
  query: string,
  templates: TicketTemplate[] = defaultTemplates,
): ResolvedTemplate[] {
  const resolvedTemplates = resolveTemplates(templates);
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return resolvedTemplates;

  return resolvedTemplates
    .map((template, index) => {
      const title = template.title.toLocaleLowerCase();
      const searchable = [
        template.title,
        template.parent?.title,
        template.summary,
        ...template.keywords,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      if (!terms.every((term) => searchable.includes(term))) return null;
      const score = terms.reduce(
        (total, term) =>
          total + (title.startsWith(term) ? 4 : title.includes(term) ? 2 : 1),
        0,
      );
      return { template, score, index };
    })
    .filter((match): match is NonNullable<typeof match> => Boolean(match))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ template }) => template);
}
