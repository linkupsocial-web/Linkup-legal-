export type AdLandingPageSlug = "register-your-company" | "gst-registration" | "compliance";

export type AdLandingService = {
  id: string;
  slug: string;
  title: string;
  category: string;
  value: string;
};

export type AdLandingServiceField =
  | {
      type: "fixed";
      service: AdLandingService;
    }
  | {
      type: "select";
      placeholder: string;
      options: AdLandingService[];
    };

type ContentSection = {
  eyebrow?: string;
  title: string;
  description?: string;
  items: Array<{
    title: string;
    description?: string;
  }>;
};

export type AdLandingPageConfig = {
  id: string;
  slug: AdLandingPageSlug;
  serviceId: string;
  serviceName: string;
  formService: AdLandingService;
  serviceField: AdLandingServiceField;
  seo: {
    title: string;
    description: string;
    canonical: string;
    noindex: boolean;
  };
  tracking: {
    landingPageId: string;
    source: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    badges: string[];
    highlights: string[];
    processingTime: string;
    registrationOptions?: Array<{
      title: string;
      description: string;
      featured?: boolean;
    }>;
  };
  form: {
    heading: string;
    subheading: string;
    serviceLabel: string;
    requirementLabel: string;
    requirementPlaceholder: string;
    submitLabel: string;
    submittingLabel: string;
    privacyText: string;
  };
  trustPoints: string[];
  process: ContentSection;
  benefits: ContentSection;
  eligibility: ContentSection;
  included: ContentSection;
  documents: ContentSection;
  deliverables: ContentSection;
  whyLinkupLegal: ContentSection;
  testimonials: Array<{
    name: string;
    text: string;
    context: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  cta: {
    title: string;
    description: string;
    primaryLabel: string;
    secondaryLabel: string;
    stickyLabel: string;
  };
  footer: {
    disclaimer: string;
  };
  success: {
    title: string;
    description: string;
    nextSteps: string[];
    primaryLabel: string;
  };
};

const privateFacilitationDisclaimer =
  "Linkup Legal is a private service platform providing documentation and process assistance. Government registrations and approvals are issued solely by the relevant authorities. Timelines and outcomes may vary based on eligibility, documentation, queries, and government processing.";

export const adLandingPages: Record<AdLandingPageSlug, AdLandingPageConfig> = {
  "register-your-company": {
    id: "company-registration-landing",
    slug: "register-your-company",
    serviceId: "company-registration",
    serviceName: "Company Registration",
    formService: {
      id: "private-limited-company",
      slug: "private-limited-company",
      title: "Private Limited Company",
      category: "Business Registration",
      value: "Company Registration",
    },
    serviceField: {
      type: "select",
      placeholder: "Select a business registration service",
      options: [
        { id: "llp-registration", slug: "llp-registration", title: "LLP Registration", category: "Business Registration", value: "LLP Registration" },
        { id: "opc-registration", slug: "opc-registration", title: "OPC Registration", category: "Business Registration", value: "OPC Registration" },
        { id: "partnership-firm", slug: "partnership-firm", title: "Partnership Firm", category: "Business Registration", value: "Partnership Firm" },
        { id: "private-limited-company", slug: "private-limited-company", title: "Private Limited Company", category: "Business Registration", value: "Private Limited Company" },
        { id: "sole-proprietorship", slug: "sole-proprietorship", title: "Sole Proprietorship", category: "Business Registration", value: "Sole Proprietorship" },
        { id: "startup-india-registration", slug: "startup-india-registration", title: "Startup India Registration", category: "Business Registration", value: "Startup India Registration" },
      ],
    },
    seo: {
      title: "Company Registration in India | LinkUp Legal",
      description:
        "Get expert assistance with company registration, documentation, incorporation filing, and next-step compliance guidance in India.",
      canonical: "/register-your-company",
      noindex: true,
    },
    tracking: {
      landingPageId: "register-your-company",
      source: "landing_page:register-your-company",
    },
    hero: {
      eyebrow: "Business registration support",
      title: "Register Your Company with Expert Assistance",
      description:
        "Move from business idea to a registration-ready application with clear documentation, filing support, and an expert-guided process.",
      badges: ["Online-first process", "Expert document review", "India-wide support"],
      highlights: [
        "Private Limited Company registration support",
        "Name availability, DSC and DIN coordination guidance",
        "MOA, AOA and incorporation filing assistance",
      ],
      processingTime: "Typical Private Limited Company registration assistance: approximately 7â€“15 days, subject to documentation and government processing.",
      registrationOptions: [
        {
          title: "Private Limited Company",
          description: "A structured option for businesses planning to build, hire, or raise capital.",
          featured: true,
        },
        {
          title: "LLP Registration",
          description: "A flexible structure for partner-led businesses seeking limited liability.",
        },
        {
          title: "OPC Registration",
          description: "A company structure intended for an eligible single promoter.",
        },
        {
          title: "Partnership or Proprietorship",
          description: "Practical options based on your ownership, business activity, and goals.",
        },
        {
          title: "Startup India Registration",
          description: "DPIIT recognition application support for eligible entities.",
        },
      ],
    },
    form: {
      heading: "Get a company registration quote",
      subheading: "Share your details and an expert will help you evaluate the right registration path.",
      serviceLabel: "Service",
      requirementLabel: "Tell us about your business requirement",
      requirementPlaceholder: "For example: two founders, software services, registered office in Noida",
      submitLabel: "GET QUOTE NOW",
      submittingLabel: "Submitting your requestâ€¦",
      privacyText: "Your details are used only to respond to this service request.",
    },
    trustPoints: ["Clear document checklist", "No invented package pricing", "Dedicated next-step guidance"],
    process: {
      eyebrow: "A clear path forward",
      title: "How company registration assistance works",
      description: "A focused process designed to remove avoidable filing and documentation delays.",
      items: [
        { title: "Share your requirement", description: "Tell us about the founders, business activity, and preferred structure." },
        { title: "Get an expert review", description: "An expert helps confirm the appropriate path and document checklist." },
        { title: "Prepare and file", description: "We coordinate the required documents and assist with the incorporation filing process." },
        { title: "Receive next-step guidance", description: "Get support on the registration outcome and basic post-registration actions." },
      ],
    },
    benefits: {
      eyebrow: "Choose with clarity",
      title: "Why a Private Limited Company is often considered",
      description: "The right structure depends on your business, owners, funding plans, and compliance readiness.",
      items: [
        { title: "Separate legal entity", description: "A company operates as an entity distinct from its shareholders, subject to applicable law." },
        { title: "Structured ownership", description: "Shareholding and director roles can be documented in a formal company framework." },
        { title: "Growth readiness", description: "A familiar structure for businesses planning formal operations, teams, or external funding conversations." },
        { title: "Compliance roadmap", description: "Registration can be paired with guidance on the filings and records that follow." },
      ],
    },
    eligibility: {
      eyebrow: "Before you begin",
      title: "Key incorporation requirements to assess",
      items: [
        { title: "Promoters and directors", description: "A Private Limited Company generally requires at least two directors and shareholders; eligibility must be reviewed for your case." },
        { title: "Registered office", description: "A valid Indian registered-office address and supporting documents are required." },
        { title: "Business name", description: "The proposed name is subject to availability and applicable naming rules." },
        { title: "Business activity", description: "Your activity and intended structure help determine the appropriate registration path." },
      ],
    },
    included: {
      eyebrow: "What expert assistance covers",
      title: "Support for the incorporation workflow",
      items: [
        { title: "Name availability guidance" },
        { title: "DSC and DIN coordination guidance" },
        { title: "MOA and AOA preparation support" },
        { title: "SPICe+ incorporation filing assistance" },
        { title: "PAN and TAN application support" },
        { title: "One-year basic compliance guidance" },
      ],
    },
    documents: {
      eyebrow: "Keep these ready",
      title: "Documents commonly required for company registration",
      description: "The final list depends on the selected structure and your individual circumstances.",
      items: [
        { title: "PAN Card of all proposed directors" },
        { title: "Aadhaar Card or valid identity proof of all directors" },
        { title: "Passport-size photographs" },
        { title: "Residential address proof" },
        { title: "Registered office address proof and recent utility bill" },
        { title: "NOC from the property owner, where the office is rented" },
      ],
    },
    deliverables: {
      eyebrow: "After a successful process",
      title: "Expected registration outputs",
      description: "Outputs depend on the chosen service and approval by the relevant authority.",
      items: [
        { title: "Incorporation filing acknowledgement and status guidance" },
        { title: "Certificate of Incorporation guidance, when issued" },
        { title: "Company PAN and TAN application guidance" },
        { title: "MOA and AOA documentation support" },
        { title: "Basic post-registration compliance checklist" },
      ],
    },
    whyLinkupLegal: {
      eyebrow: "Built for a smoother start",
      title: "Why businesses choose LinkUp Legal",
      items: [
        { title: "Documentation-first approach", description: "Get a practical checklist before filing begins." },
        { title: "Expert-assisted process", description: "Receive clear help at each decision and filing stage." },
        { title: "Transparent next steps", description: "Understand what is needed now and what follows after registration." },
      ],
    },
    testimonials: [
      {
        name: "Dinesh Panhale",
        context: "Verified Google review",
        text: "Very professional service. I had multiple doubts regarding registration, and their team guided me patiently at every step. Highly recommended for anyone starting a business.",
      },
    ],
    faqs: [
      {
        question: "Which business structure should I choose?",
        answer: "The right choice depends on ownership, business activity, liability preferences, fundraising plans, and ongoing compliance. Share your requirement to get an initial assessment.",
      },
      {
        question: "How long does Private Limited Company registration take?",
        answer: "LinkUp Legal currently indicates an approximate 7â€“15 day assistance timeline. Actual timing can vary due to document readiness, name availability, government queries, and portal processing.",
      },
      {
        question: "Can a home address be used as the registered office?",
        answer: "A registered office must meet applicable documentation requirements. An expert can review the available address proof and owner NOC, where applicable.",
      },
      {
        question: "Are government fees included in the quote?",
        answer: "Fees and applicability vary by structure, state, authorised capital, and circumstances. Request a quote for a clear breakdown before proceeding.",
      },
    ],
    cta: {
      title: "Ready to set up your business on the right footing?",
      description: "Get a tailored company registration quote and document checklist from LinkUp Legal.",
      primaryLabel: "GET QUOTE NOW",
      secondaryLabel: "Talk to an expert",
      stickyLabel: "Get Quote",
    },
    footer: { disclaimer: privateFacilitationDisclaimer },
    success: {
      title: "Your company registration request is received",
      description: "A LinkUp Legal expert will review your requirement and contact you with the appropriate next steps.",
      nextSteps: ["We review the registration requirement you shared.", "An expert contacts you to confirm the suitable business structure and document checklist.", "You receive a clear quote and process guidance before any filing begins."],
      primaryLabel: "Back to LinkUp Legal",
    },
  },
  "gst-registration": {
    id: "gst-registration-landing",
    slug: "gst-registration",
    serviceId: "gst-registration",
    serviceName: "GST Registration",
    formService: {
      id: "gst-registration",
      slug: "gst-registration",
      title: "GST Registration",
      category: "Tax Services",
      value: "GST Registration",
    },
    serviceField: {
      type: "fixed",
      service: {
        id: "gst-registration",
        slug: "gst-registration",
        title: "GST Registration",
        category: "Tax Services",
        value: "GST Registration",
      },
    },
    seo: {
      title: "GST Registration in India | LinkUp Legal",
      description:
        "Get expert GST registration assistance for eligibility, document review, application preparation, filing, and ARN or GSTIN follow-up guidance.",
      canonical: "/gst-registration",
      noindex: true,
    },
    tracking: {
      landingPageId: "gst-registration",
      source: "landing_page:gst-registration",
    },
    hero: {
      eyebrow: "GST registration assistance",
      title: "Get Your GST Registration Done with Expert Assistance",
      description:
        "Understand your registration requirement, prepare the right documents, and receive expert support through the GST application process.",
      badges: ["Eligibility-led guidance", "Document review", "Application follow-up support"],
      highlights: [
        "Business activity and HSN/SAC guidance",
        "GST registration application preparation",
        "ARN and GSTIN follow-up guidance",
      ],
      processingTime: "Typical GST registration assistance: approximately 3â€“7 days, subject to eligibility, document readiness, and government processing.",
    },
    form: {
      heading: "Get a GST registration quote",
      subheading: "Tell us about your business and an expert will help you understand the next step.",
      serviceLabel: "Service",
      requirementLabel: "Tell us about your business requirement",
      requirementPlaceholder: "For example: online seller, services business, new proprietorship, or existing company",
      submitLabel: "GET QUOTE NOW",
      submittingLabel: "Submitting your requestâ€¦",
      privacyText: "Your details are used only to respond to this service request.",
    },
    trustPoints: ["Application-ready document check", "Business activity guidance", "No approval guarantees"],
    process: {
      eyebrow: "A guided filing journey",
      title: "How GST registration assistance works",
      description: "Start with the information needed to make an informed and complete application.",
      items: [
        { title: "Share your business details", description: "Tell us about your business activity, entity type, location, and registration requirement." },
        { title: "Eligibility and document review", description: "An expert reviews the information and helps identify the applicable document checklist." },
        { title: "Application preparation", description: "We assist with application preparation, business activity details, and HSN/SAC guidance." },
        { title: "Filing and follow-up guidance", description: "Receive assistance with filing and next steps for ARN or GSTIN status, where applicable." },
      ],
    },
    benefits: {
      eyebrow: "Compliance starts with clarity",
      title: "Why timely GST registration can matter",
      description: "Registration applicability depends on your business model, turnover, location, and other statutory conditions.",
      items: [
        { title: "Prepared application", description: "A complete document review can help reduce avoidable back-and-forth during preparation." },
        { title: "Business activity alignment", description: "Clear activity descriptions and HSN/SAC guidance help prepare the application correctly." },
        { title: "Structured compliance start", description: "Registration support can help you begin with a clearer view of future filing responsibilities." },
        { title: "Status follow-up guidance", description: "Understand the next steps after the application is filed and an ARN is generated." },
      ],
    },
    eligibility: {
      eyebrow: "Before you apply",
      title: "GST eligibility is assessed for your business",
      items: [
        { title: "Business activity", description: "The goods or services you provide affect registration and classification considerations." },
        { title: "Entity and location", description: "Your business constitution and operating locations are relevant to the application." },
        { title: "Turnover and other triggers", description: "Registration may arise from thresholds or other conditions; an expert can review the facts you provide." },
        { title: "Authorised signatory", description: "Where applicable, the required authority and supporting documents must be available." },
      ],
    },
    included: {
      eyebrow: "What expert assistance covers",
      title: "Support for the GST registration process",
      items: [
        { title: "GST eligibility assessment" },
        { title: "GST registration application preparation" },
        { title: "Business activity and HSN or SAC guidance" },
        { title: "Document review" },
        { title: "Application filing assistance" },
        { title: "ARN and GSTIN follow-up guidance" },
      ],
    },
    documents: {
      eyebrow: "Keep these ready",
      title: "Documents commonly required for GST registration",
      description: "The final checklist varies by entity type, business address, and authorised signatory details.",
      items: [
        { title: "PAN Card" },
        { title: "Aadhaar Card" },
        { title: "Passport-size photograph" },
        { title: "Business registration proof, where applicable" },
        { title: "Business address proof and a recent electricity or utility bill" },
        { title: "Bank account proof or cancelled cheque" },
        { title: "Authorisation letter, where applicable" },
      ],
    },
    deliverables: {
      eyebrow: "What you receive",
      title: "GST registration process outputs",
      description: "Final registration is subject to approval by the relevant government authority.",
      items: [
        { title: "Application preparation and filing assistance" },
        { title: "ARN acknowledgement guidance after filing" },
        { title: "GSTIN status follow-up guidance, when issued" },
        { title: "Document and next-step compliance checklist" },
      ],
    },
    whyLinkupLegal: {
      eyebrow: "A less uncertain start",
      title: "Why choose LinkUp Legal for GST registration support",
      items: [
        { title: "Practical eligibility discussion", description: "Begin with your business facts instead of assumptions." },
        { title: "Document review before filing", description: "Identify missing or inconsistent information before submission." },
        { title: "Clear post-filing guidance", description: "Know what ARN, GSTIN status, and next-step compliance may involve." },
      ],
    },
    testimonials: [
      {
        name: "Vikas Ahire",
        context: "Verified Google review",
        text: "I used Linkup Legal for GST filing and the experience was very smooth. The team explained everything clearly and completed the work on time without any hassle.",
      },
    ],
    faqs: [
      {
        question: "Do I need GST registration for my business?",
        answer: "Applicability depends on your business activity, turnover, locations, and other statutory conditions. Share your details for an initial assessment; no approval or eligibility outcome is guaranteed.",
      },
      {
        question: "How long does GST registration take?",
        answer: "LinkUp Legal currently indicates an approximate 3â€“7 day assistance timeline. Actual time may vary due to documents, verification, queries, and government portal processing.",
      },
      {
        question: "What is an ARN?",
        answer: "An Application Reference Number is generated for a GST application. It can be used to check application status during the government processing workflow.",
      },
      {
        question: "Can I apply without all the documents?",
        answer: "The required documents depend on your entity and business address. An expert can first review what is available and confirm the practical checklist for your application.",
      },
    ],
    cta: {
      title: "Get clarity before you begin your GST application",
      description: "Request an expert-led eligibility and document review for your business.",
      primaryLabel: "GET QUOTE NOW",
      secondaryLabel: "Talk to an expert",
      stickyLabel: "Get Quote",
    },
    footer: { disclaimer: privateFacilitationDisclaimer },
    success: {
      title: "Your GST registration request is received",
      description: "A LinkUp Legal expert will review your business details and contact you about the next steps.",
      nextSteps: ["We review the business requirement you shared.", "An expert contacts you to discuss eligibility and the document checklist.", "You receive a clear quote and application guidance before filing begins."],
      primaryLabel: "Back to LinkUp Legal",
    },
  },
  compliance: {
    id: "compliance-landing",
    slug: "compliance",
    serviceId: "annual-roc-filing",
    serviceName: "Compliance Services",
    formService: {
      id: "annual-roc-filing",
      slug: "annual-roc-filing",
      title: "Annual ROC Filing",
      category: "Compliance Services",
      value: "Annual ROC Filing",
    },
    serviceField: {
      type: "select",
      placeholder: "Select a compliance service",
      options: [
        { id: "annual-roc-filing", slug: "annual-roc-filing", title: "Annual ROC Filing", category: "Compliance Services", value: "Annual ROC Filing" },
        { id: "company-compliance", slug: "company-compliance", title: "Company Compliance", category: "Compliance Services", value: "Company Compliance" },
        { id: "din-registration", slug: "din-registration", title: "DIN Registration", category: "Compliance Services", value: "DIN Registration" },
        { id: "din-and-dsc", slug: "din-and-dsc", title: "DIN & DSC", category: "Compliance Services", value: "DIN & DSC" },
        { id: "fssai-registration", slug: "fssai-registration", title: "FSSAI Registration", category: "Compliance Services", value: "FSSAI Registration" },
        { id: "iec-registration", slug: "iec-registration", title: "IEC Registration", category: "Compliance Services", value: "IEC Registration" },
        { id: "msme-registration", slug: "msme-registration", title: "MSME Registration", category: "Compliance Services", value: "MSME Registration" },
        { id: "pf-and-esi-registration", slug: "pf-and-esi-registration", title: "PF & ESI Registration", category: "Compliance Services", value: "PF & ESI Registration" },
        { id: "shop-and-establishment", slug: "shop-and-establishment", title: "Shop & Establishment", category: "Compliance Services", value: "Shop & Establishment" },
      ],
    },
    seo: {
      title: "Business Compliance Services in India | LinkUp Legal",
      description: "Get expert assistance for annual ROC filings, registrations, and practical business compliance support in India.",
      canonical: "/compliance",
      noindex: true,
    },
    tracking: {
      landingPageId: "compliance",
      source: "landing_page:compliance",
    },
    hero: {
      eyebrow: "Business compliance support",
      title: "Manage Business Compliance with Expert Assistance",
      description: "Select the compliance service you need and get a clear document checklist, filing support, and practical next-step guidance.",
      badges: ["Document-first review", "Filing and registration support", "India-wide assistance"],
      highlights: [
        "Annual ROC filing and company compliance support",
        "Business registrations and licence application guidance",
        "DIN, DSC, PF, ESI, IEC, MSME, FSSAI and Shop Establishment assistance",
      ],
      processingTime: "Typical compliance service assistance: approximately 3–7 days, subject to the selected service, document readiness, authority queries, and government processing.",
    },
    form: {
      heading: "Get a compliance service quote",
      subheading: "Share your details and select the service you need. An expert will guide you on the next step.",
      serviceLabel: "Select Service",
      requirementLabel: "Tell us about your compliance requirement",
      requirementPlaceholder: "For example: annual ROC filing, new food business licence, or employee registration support",
      submitLabel: "GET QUOTE NOW",
      submittingLabel: "Submitting your requestâ€¦",
      privacyText: "Your details are used only to respond to this service request.",
    },
    trustPoints: ["Service-specific checklist", "Clear filing workflow", "No approval guarantees"],
    process: {
      eyebrow: "A practical compliance workflow",
      title: "How compliance assistance works",
      description: "Start with the exact service you need, then move forward with a focused document and filing plan.",
      items: [
        { title: "Select your service", description: "Choose the filing, registration, or compliance support relevant to your business." },
        { title: "Review the requirement", description: "An expert reviews the details you share and identifies the applicable document checklist." },
        { title: "Prepare and file", description: "We assist with application or filing preparation and guide you through the relevant submission process." },
        { title: "Get status guidance", description: "Receive practical guidance on acknowledgement, authority queries, and the next compliance action." },
      ],
    },
    benefits: {
      eyebrow: "Stay organised",
      title: "Why a structured compliance process matters",
      description: "Requirements differ by business type, state, employee count, activity, and the selected service.",
      items: [
        { title: "Service-specific review", description: "Start with the filing or registration that applies to your business instead of a generic checklist." },
        { title: "Document readiness", description: "Identify missing or inconsistent information before a filing is prepared." },
        { title: "Clearer timelines", description: "Understand the next action and authority-driven dependencies before submission." },
        { title: "Compliance continuity", description: "Use the process to build a more reliable calendar for recurring obligations." },
      ],
    },
    eligibility: {
      eyebrow: "Before you begin",
      title: "Compliance applicability is assessed for your business",
      items: [
        { title: "Business constitution", description: "Your entity type and existing registrations affect the forms, records, and filings that may apply." },
        { title: "Business activity and location", description: "Industry, state, and operating location can affect licence, registration, and filing requirements." },
        { title: "Prior records", description: "Earlier filings, certificates, and financial or employee records may be needed for review." },
        { title: "Authorised signatory", description: "The correct authorised person and supporting documents must be available for the selected service." },
      ],
    },
    included: {
      eyebrow: "What expert assistance covers",
      title: "Support for your selected compliance service",
      items: [
        { title: "Service applicability and document checklist review" },
        { title: "Application or filing preparation support" },
        { title: "Business, registration, or statutory record review" },
        { title: "Portal submission and acknowledgement guidance" },
        { title: "Authority query and status follow-up guidance" },
        { title: "Practical next-step compliance checklist" },
      ],
    },
    documents: {
      eyebrow: "Keep these ready",
      title: "Documents commonly required for compliance services",
      description: "The final checklist depends on the service you select and your entity, activity, location, and existing records.",
      items: [
        { title: "Business incorporation or registration proof, where available" },
        { title: "PAN and authorised signatory identity documents" },
        { title: "Business address proof and recent utility bill, where relevant" },
        { title: "Relevant previous filings, certificates, or portal credentials" },
        { title: "Financial, employee, food-business, or import-export records for the selected service" },
        { title: "Authorisation or board documents, where applicable" },
      ],
    },
    deliverables: {
      eyebrow: "What you receive",
      title: "Compliance process outputs",
      description: "Final registrations, certificates, and approvals are issued only by the relevant authorities.",
      items: [
        { title: "Service-specific document and filing checklist" },
        { title: "Application or filing preparation assistance" },
        { title: "Submission acknowledgement and status guidance" },
        { title: "Practical next-step compliance roadmap" },
      ],
    },
    whyLinkupLegal: {
      eyebrow: "Built for ongoing business needs",
      title: "Why choose LinkUp Legal for compliance support",
      items: [
        { title: "Focused service selection", description: "Begin with the exact compliance requirement instead of a one-size-fits-all quote." },
        { title: "Documentation-led assistance", description: "Get a practical review before the filing or registration process progresses." },
        { title: "Clear status communication", description: "Understand the next step and relevant authority-driven dependencies throughout the process." },
      ],
    },
    testimonials: [
      {
        name: "LinkUp Legal client",
        context: "Verified Google review",
        text: "The team explained the required documents clearly and kept the process easy to follow from review through the next steps.",
      },
    ],
    faqs: [
      {
        question: "Which compliance service should I select?",
        answer: "Choose the filing, registration, or compliance requirement closest to your need. An expert can review the details you share and confirm the practical next step.",
      },
      {
        question: "How long does compliance assistance take?",
        answer: "LinkUp Legal currently indicates an approximate 3–7 day assistance timeline for these services. Actual timing varies by the selected service, document readiness, authority queries, and government processing.",
      },
      {
        question: "Can you help with annual ROC filings?",
        answer: "Yes. Select Annual ROC Filing and share the relevant company details. The filing requirements and final timeline depend on the companyâ€™s records, filing history, and statutory due dates.",
      },
      {
        question: "Are registration or approval outcomes guaranteed?",
        answer: "No. LinkUp Legal provides documentation and process assistance. Registrations, certificates, and approvals are subject to applicable requirements and the relevant authorityâ€™s decision.",
      },
    ],
    cta: {
      title: "Get clarity on your next compliance action",
      description: "Choose the service you need and receive an expert-led document and process review.",
      primaryLabel: "GET QUOTE NOW",
      secondaryLabel: "Talk to an expert",
      stickyLabel: "Get Quote",
    },
    footer: { disclaimer: privateFacilitationDisclaimer },
    success: {
      title: "Your compliance request is received",
      description: "A LinkUp Legal expert will review the selected service and contact you about the next steps.",
      nextSteps: ["We review the compliance service and requirement you shared.", "An expert contacts you to confirm the relevant document checklist.", "You receive a clear quote and process guidance before filing or registration begins."],
      primaryLabel: "Back to LinkUp Legal",
    },
  },
};

export function getAdLandingPage(slug: string): AdLandingPageConfig | null {
  return Object.values(adLandingPages).find((page) => page.slug === slug) ?? null;
}

export function getAdLandingServices(page: AdLandingPageConfig): AdLandingService[] {
  return page.serviceField.type === "select" ? page.serviceField.options : [page.serviceField.service];
}

export function getAdLandingService(page: AdLandingPageConfig, slug: string): AdLandingService | null {
  return getAdLandingServices(page).find((service) => service.slug === slug) ?? null;
}

