export interface SEOMetadata {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}

export function generateSEOMeta(metadata: SEOMetadata) {
  return {
    title: metadata.title,
    description: metadata.description,
  };
}

export function organizationSchema(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Nordleaf',
    url: siteUrl,
    description: 'Premium organic products',
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'info@nordleaf.de',
      telephone: '+49-123-456789',
    },
  };
}

export function productSchema(product: {
  name: string;
  description: string;
  price: number;
  image: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description,
    image: product.image,
    offers: {
      '@type': 'Offer',
      price: product.price,
      priceCurrency: 'EUR',
    },
  };
}

export function breadcrumbSchema(
  breadcrumbs: { name: string; url: string }[]
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url,
    })),
  };
}
