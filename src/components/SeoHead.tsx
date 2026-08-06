import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SeoHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string;
}

export const SeoHead: React.FC<SeoHeadProps> = ({
  title = 'V79 Marketing Hub | All-In-One AI Marketing Suite for SMBs',
  description = 'Empower your business with AI copywriting, Canva image studio, Hootsuite social scheduling, Mailchimp newsletters, and Wix digital storefronts in one workspace.',
  image = 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80',
  url = typeof window !== 'undefined' ? window.location.href : 'https://v79marketing.com',
  type = 'website',
  keywords = 'AI marketing, small business suite, Caribbean business software, social media scheduler, digital storefront',
}) => {
  return (
    <Helmet>
      {/* Basic Metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />
      <meta property="og:url" content={url} />
      <meta property="og:site_name" content="V79 Marketing Hub" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={image} />
    </Helmet>
  );
};
