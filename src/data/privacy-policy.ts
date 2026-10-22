export type PrivacyPolicySection = {
  number: number;
  heading: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export const PRIVACY_POLICY_EFFECTIVE_DATE = "29 August 2026";
export const PRIVACY_POLICY_LAST_UPDATED_DATE = "29 August 2026";
export const LINKUP_LEGAL_ADDRESS = "H-150, H Block, Sector 63, Noida, Uttar Pradesh 201301";

export const privacyPolicySections: readonly PrivacyPolicySection[] = [
  {
    number: 1,
    heading: "Information We May Collect",
    paragraphs: [
      "Linkup Legal may collect personal information that you provide when you contact us, request information, submit a service enquiry, request a consultation, begin a service request, make a payment, or otherwise communicate with us.",
      "This may include your name, phone number, email address, business or company name, city or location, selected service, business and service requirements, enquiry details, payment or request reference details, and other information you choose to provide.",
      "We may also receive limited technical and usage information, such as your IP address, browser and device information, operating system, referring source, pages visited, date and time information, campaign attribution information, cookies or similar identifiers, and website interaction information.",
      "Where you submit information through a third-party lead form, social platform, advertising platform, or referral source, we may receive the information that the relevant platform makes available to us under its own privacy terms.",
    ],
  },
  {
    number: 2,
    heading: "Purpose of Collecting Personal Information",
    paragraphs: ["We may use personal information to:"],
    bullets: [
      "respond to enquiries and understand your service requirements;",
      "provide service information, quotations, consultations, documentation support, or customer support;",
      "create, manage, and follow up on service requests and related payments;",
      "communicate with you about an enquiry, service, payment, or support request;",
      "maintain necessary business records, prevent fraud or misuse, secure our systems, and resolve disputes; and",
      "meet legal obligations and improve our website and service operations.",
    ],
  },
  {
    number: 3,
    heading: "Sales and Lead Data",
    paragraphs: [
      "Lead information is primarily used to respond to the enquiry or service requirement you submit. Authorized Linkup Legal personnel may contact you by telephone, email, WhatsApp, or another appropriate channel in connection with that enquiry or service requirement.",
      "You may ask us to stop promotional communications at any time using the contact details below. Service-related or transaction-related communications may still be sent where reasonably necessary to respond to your request or meet our obligations.",
    ],
  },
  {
    number: 4,
    heading: "Google, Meta, and Other Advertising or Analytics Platforms",
    paragraphs: [
      "We may use Google Analytics, Meta Pixel, conversion tracking, tags, campaign attribution, and similar measurement technologies to understand website traffic, advertising performance, and visitor interactions. These providers may process information under their own privacy terms and controls.",
      "When Meta conversion measurement is enabled, limited lead and technical information may be transmitted to Meta for conversion reporting. Contact identifiers used for that purpose may be hashed before transmission, as supported by the relevant platform.",
      "If you provide information through a Google, Meta, Facebook, Instagram, or other third-party lead form, the relevant platform may initially process that information under its own privacy terms before it is provided to us. Once Linkup Legal receives it, our processing is governed by this Privacy Policy.",
    ],
  },
  {
    number: 5,
    heading: "Cookies and Similar Technologies",
    paragraphs: [
      "Our website may use cookies, pixels, tags, local storage, and similar technologies for website functionality, security, performance analytics, advertising measurement, campaign attribution, and visitor interaction analysis. The technologies in use can vary by page, campaign, or service.",
      "You can manage or delete cookies through your browser controls. Restricting cookies may affect certain website features or your experience.",
    ],
  },
  {
    number: 6,
    heading: "Sharing and Disclosure of Personal Information",
    paragraphs: [
      "Linkup Legal does not sell, rent, or trade personal information or lead data.",
      "Limited information may be processed by authorized service providers where reasonably necessary for web hosting, cloud infrastructure, customer relationship management, data storage, communications, customer support, payment processing, security verification, analytics, advertising measurement, or other business operations. These providers should process information only for authorized purposes and subject to appropriate confidentiality and security controls.",
      "We may also disclose information where required or permitted by applicable law, court order, regulatory requirement, valid government request, or lawful law-enforcement request.",
    ],
  },
  {
    number: 7,
    heading: "No Sale of Lead Data",
    paragraphs: [
      "Information received through website forms, third-party lead forms, advertising platforms, or other lead-generation channels will not be sold to data brokers, advertisers, or unrelated organizations. Authorized technology and operational providers may process information only for the legitimate business purposes described in this Privacy Policy.",
    ],
  },
  {
    number: 8,
    heading: "Data Security",
    paragraphs: [
      "We take reasonable administrative, organizational, and technical measures designed to protect personal information from unauthorized access, misuse, alteration, loss, destruction, and unlawful disclosure. Depending on the system and service involved, safeguards may include secure transmission, access controls, authentication, restricted administrative access, system monitoring, backup procedures, and other information-security measures.",
      "No internet-based system can provide an absolute guarantee against every security incident. Please use care when sharing information online and avoid sending sensitive information that is not necessary for your enquiry.",
    ],
  },
  {
    number: 9,
    heading: "Data Retention",
    paragraphs: [
      "We retain personal information only for as long as reasonably necessary to respond to enquiries, maintain business relationships, provide services, keep records, process payments, resolve disputes, prevent abuse, and meet legal, accounting, or regulatory obligations. When information is no longer necessary, it may be deleted, anonymized, or securely disposed of, subject to applicable legal requirements.",
    ],
  },
  {
    number: 10,
    heading: "User Choices and Rights",
    paragraphs: [
      "Subject to applicable law, you may request access to, correction of, updating of, or deletion of your personal information. You may also withdraw consent where applicable, ask us to stop promotional communications, or submit a privacy or grievance request. We may require reasonable identity verification before acting on a privacy-sensitive request.",
    ],
  },
  {
    number: 11,
    heading: "Consent and Withdrawal",
    paragraphs: [
      "Where our processing relies on consent, consent should be clear and connected to a specified purpose. You may withdraw consent by contacting us using the details below. Withdrawal applies prospectively and does not automatically invalidate processing that was lawful before withdrawal. We may continue processing where required or permitted by law.",
    ],
  },
  {
    number: 12,
    heading: "Children and Minors",
    paragraphs: [
      "Our general business enquiry and service-request channels are intended for adults and are not designed to intentionally collect children's personal data. If you believe that a child has provided personal information to us, please contact us so we can review the request.",
    ],
  },
  {
    number: 13,
    heading: "Third-Party Websites and Services",
    paragraphs: [
      "Our website may link to external websites, social platforms, payment services, or other third-party services. Linkup Legal is not responsible for the independent privacy practices of services we do not control. Please review the relevant third party's privacy notice before providing information to it.",
    ],
  },
  {
    number: 14,
    heading: "Cross-Border Processing",
    paragraphs: [
      "Some cloud, infrastructure, analytics, advertising, or technology providers may operate outside India. Where applicable, personal information may be processed outside India subject to applicable Indian legal requirements and restrictions.",
    ],
  },
  {
    number: 15,
    heading: "Data Accuracy",
    paragraphs: [
      "Please provide accurate and current information. If information you previously provided needs to be corrected or updated, you may contact us using the details below.",
    ],
  },
  {
    number: 16,
    heading: "Legal Compliance",
    paragraphs: [
      "We process personal information with regard to applicable Indian privacy, data-protection, information-security, and electronic-communication requirements. This includes relevant concepts reflected in the Information Technology Act, 2000, applicable Information Technology privacy and security rules, the Digital Personal Data Protection Act, 2023, and applicable rules to the extent they are in force and applicable.",
    ],
  },
];
