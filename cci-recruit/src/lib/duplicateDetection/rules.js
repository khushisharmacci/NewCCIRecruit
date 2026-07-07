export const DUPLICATE_RULES = {
  candidates: {
    exact: [
      "email",
      "phone",
      "linkedin"
    ],
    possible: [
      ["full_name", "current_company"]
    ]
  },

  clients: {
    exact: [
      "company_name"
    ],
    possible: [
      ["company_name", "contact_email"]
    ]
  },

  positions: {
    exact: [
      ["client_id", "job_title", "location"]
    ],
    possible: []
  },

  leads: {
    exact: [
      ["company_name", "contact_person"]
    ],
    possible: []
  },

  teams: {
    exact: [
      "team_name"
    ],
    possible: []
  },

  revenue: {
    exact: [
      "invoice_number"
    ],
    possible: []
  }
};