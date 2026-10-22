import assert from "node:assert/strict";
import { adLandingPages, getAdLandingService, getAdLandingServices } from "./ad-landing-pages";

const companyServices = getAdLandingServices(adLandingPages["register-your-company"]).map((service) => service.title);
assert.deepEqual(companyServices, [
  "LLP Registration",
  "OPC Registration",
  "Partnership Firm",
  "Private Limited Company",
  "Sole Proprietorship",
  "Startup India Registration",
]);

const complianceServices = getAdLandingServices(adLandingPages.compliance).map((service) => service.title);
assert.deepEqual(complianceServices, [
  "Annual ROC Filing",
  "Company Compliance",
  "DIN Registration",
  "DIN & DSC",
  "FSSAI Registration",
  "IEC Registration",
  "MSME Registration",
  "PF & ESI Registration",
  "Shop & Establishment",
]);
assert.equal(getAdLandingService(adLandingPages["gst-registration"], "gst-registration")?.title, "GST Registration");
assert.equal(getAdLandingService(adLandingPages.compliance, "income-tax-return-basic"), null);

console.log("ad landing service configuration: OK");
