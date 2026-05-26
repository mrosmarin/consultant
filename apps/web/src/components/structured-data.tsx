import { site, siteUrl } from "@/lib/site";

// JSON-LD for the public site: the consultancy (Organization/ProfessionalService),
// the founder (Person), and the website. Rendered once in the marketing layout.
export function StructuredData() {
  const orgId = `${siteUrl}/#organization`;
  const personId = `${siteUrl}/#founder`;

  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": orgId,
        name: site.name,
        legalName: site.legalName,
        url: siteUrl,
        email: site.email,
        description: site.description,
        founder: { "@id": personId },
        areaServed: ["Finance", "Media", "Technology"],
        knowsAbout: [
          "Fractional engineering leadership",
          "AI-native architecture",
          "Cloud architecture",
          "Kubernetes",
          "Legacy modernization",
        ],
        ...(site.sameAs.length ? { sameAs: site.sameAs } : {}),
      },
      {
        "@type": "Person",
        "@id": personId,
        name: site.founder,
        jobTitle: "Engineering Leader & Architect",
        worksFor: { "@id": orgId },
        alumniOf: "SUNY Plattsburgh",
      },
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        url: siteUrl,
        name: site.name,
        publisher: { "@id": orgId },
        inLanguage: "en-US",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
