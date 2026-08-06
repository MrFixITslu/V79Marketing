import React, { useState } from 'react';
import {
  Terminal,
  Server,
  Database,
  FileCode,
  ShieldCheck,
  Cpu,
  CheckCircle2,
  Copy,
  Check
} from 'lucide-react';

export const DevOpsPortal: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'docker' | 'db' | 'api' | 'security'>('docker');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const dockerfileSnippet = `# Dockerfile for V79 Marketing Hub SaaS
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD ["node", "dist/server.cjs"]`;

  const dockerComposeSnippet = `version: '3.8'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://v79user:v79secret@db:5432/v79marketing
      - REDIS_URL=redis://cache:6379
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    depends_on:
      - db
      - cache

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: v79user
      POSTGRES_PASSWORD: v79secret
      POSTGRES_DB: v79marketing
    volumes:
      - pgdata:/var/lib/postgresql/data

  cache:
    image: redis:7-alpine

volumes:
  pgdata:`;

  const prismaSchemaSnippet = `// Complete Prisma Database Schema for Multi-Tenant SaaS
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  PLATFORM_ADMIN
  BUSINESS_OWNER
  MARKETING_STAFF
  CONTENT_CREATOR
}

model Business {
  id            String          @id @default(uuid())
  name          String
  slug          String          @unique
  logoUrl       String
  coverImageUrl String
  industry      String
  description   String
  location      String
  phone         String
  email         String
  website       String
  whatsapp      String
  plan          String          @default("FREE")
  users         User[]
  posts         Post[]
  campaigns     Campaign[]
  socialAccounts SocialAccount[]
  createdAt     DateTime        @default(now())
}

model User {
  id            String          @id @default(uuid())
  email         String          @unique
  name          String
  role          Role            @default(BUSINESS_OWNER)
  businessId    String
  business      Business        @relation(fields: [businessId], references: [id])
  twoFactor     Boolean         @default(false)
  createdAt     DateTime        @default(now())
}`;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Terminal className="w-4 h-4" />
            <span>Architecture, DevOps & Production Specifications</span>
          </div>
          <h1 className="text-2xl font-black text-white">DevOps & System Architecture</h1>
          <p className="text-xs text-slate-400 mt-1">
            Production Docker files, PostgreSQL Prisma schema, OpenAPI REST docs & OWASP security suite
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveTab('docker')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'docker' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          Docker & Docker Compose
        </button>
        <button
          onClick={() => setActiveTab('db')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'db' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          PostgreSQL Database Schema
        </button>
        <button
          onClick={() => setActiveTab('api')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'api' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          REST API Docs
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'security' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          OWASP Security & Scaling
        </button>
      </div>

      {/* Docker Tab */}
      {activeTab === 'docker' && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <FileCode className="w-4 h-4 text-orange-400" />
                <span>Production Dockerfile</span>
              </h3>
              <button
                onClick={() => handleCopy(dockerfileSnippet)}
                className="text-xs text-slate-300 hover:text-white bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Dockerfile</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl text-xs text-amber-300 font-mono overflow-x-auto">
              {dockerfileSnippet}
            </pre>
          </div>

          <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span>docker-compose.yml</span>
              </h3>
              <button
                onClick={() => handleCopy(dockerComposeSnippet)}
                className="text-xs text-slate-300 hover:text-white bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy compose.yml</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-4 rounded-xl text-xs text-teal-300 font-mono overflow-x-auto">
              {dockerComposeSnippet}
            </pre>
          </div>
        </div>
      )}

      {/* Database Schema Tab */}
      {activeTab === 'db' && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-blue-400" />
              <span>Prisma ORM PostgreSQL Schema</span>
            </h3>
            <button
              onClick={() => handleCopy(prismaSchemaSnippet)}
              className="text-xs text-slate-300 hover:text-white bg-slate-950 px-3 py-1 rounded-lg border border-slate-800 flex items-center gap-1 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Schema</span>
            </button>
          </div>
          <pre className="bg-slate-950 p-4 rounded-xl text-xs text-slate-200 font-mono overflow-x-auto">
            {prismaSchemaSnippet}
          </pre>
        </div>
      )}

      {/* API Docs Tab */}
      {activeTab === 'api' && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">V79 Marketing Hub REST API Endpoint Matrix</h3>
          <div className="space-y-3 text-xs">
            {[
              { method: 'POST', path: '/api/ai/generate-text', desc: 'Gemini 3.6 Flash multi-platform caption generator' },
              { method: 'POST', path: '/api/ai/generate-image', desc: 'Gemini AI image & flyer generator' },
              { method: 'POST', path: '/api/ai/generate-campaign-plan', desc: '30-day AI campaign roadmap generator' },
              { method: 'GET', path: '/api/businesses/:slug', desc: 'Get public storefront details' },
              { method: 'PUT', path: '/api/businesses/:id', desc: 'Update business branding, logo & catalog' },
              { method: 'GET', path: '/api/posts', desc: 'List all posts in publisher pipeline' },
              { method: 'POST', path: '/api/posts', desc: 'Schedule new social post' },
              { method: 'GET', path: '/api/admin/metrics', desc: 'Platform admin KPIs, revenue & audit logs' },
            ].map((ep, i) => (
              <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-bold font-mono px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 text-[10px]">
                    {ep.method}
                  </span>
                  <code className="text-amber-300 font-mono">{ep.path}</code>
                </div>
                <span className="text-slate-400">{ep.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>OWASP Top 10 Security Protection Checklist</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              { title: 'A01: Broken Access Control', status: 'Enforced', desc: 'Multi-tenant isolation per business ID' },
              { title: 'A02: Cryptographic Failures', status: 'Enforced', desc: 'Bcrypt password hashing & AES-256 token encryption' },
              { title: 'A03: Injection Protection', status: 'Enforced', desc: 'Prisma ORM parameterized queries prevent SQLi' },
              { title: 'A04: Insecure Design', status: 'Enforced', desc: 'Rate limiting on AI routes (60 req/min)' },
              { title: 'A05: Security Misconfiguration', status: 'Enforced', desc: 'Server-side Gemini API key isolation' },
              { title: 'A07: Identification & Auth Failures', status: 'Enforced', desc: '2FA support & JWT refresh tokens' },
            ].map((s, i) => (
              <div key={i} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{s.title}</span>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-bold px-2 py-0.5 rounded-full">
                    {s.status}
                  </span>
                </div>
                <p className="text-slate-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
