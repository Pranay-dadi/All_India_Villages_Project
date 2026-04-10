// src/pages/b2b/B2BDocs.tsx
import { useState } from 'react'
import { Copy, Check, BookOpen } from 'lucide-react'

function CodeBlock({ code, lang = 'bash' }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="relative group">
      <pre className="bg-surface-100 border border-brand-500/10 rounded-xl p-4 overflow-x-auto text-xs font-mono text-slate-300 scrollbar-thin">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => {
          navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-surface-200 text-slate-500 hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-all"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  )
}

const BASE_URL = 'https://your-project-name.vercel.app/api/v1'

const endpoints = [
  {
    method: 'GET',
    path: '/states',
    desc: 'List all Indian states',
    params: [],
    example: `curl -H "X-API-Key: YOUR_KEY" \\
  ${BASE_URL}/states`,
  },
  {
    method: 'GET',
    path: '/states/{id}/districts',
    desc: 'Get all districts in a state',
    params: [{ name: 'id', desc: 'State ID' }],
    example: `curl -H "X-API-Key: YOUR_KEY" \\
  ${BASE_URL}/states/STATE_ID/districts`,
  },
  {
    method: 'GET',
    path: '/districts/{id}/subdistricts',
    desc: 'Get sub-districts in a district',
    params: [{ name: 'id', desc: 'District ID' }],
    example: `curl -H "X-API-Key: YOUR_KEY" \\
  ${BASE_URL}/districts/DISTRICT_ID/subdistricts`,
  },
  {
    method: 'GET',
    path: '/subdistricts/{id}/villages',
    desc: 'Get villages in a sub-district',
    params: [
      { name: 'id', desc: 'Sub-district ID' },
      { name: 'page', desc: 'Page number (default: 1)' },
      { name: 'limit', desc: 'Results per page (max 500, default 100)' },
    ],
    example: `curl -H "X-API-Key: YOUR_KEY" \\
  "${BASE_URL}/subdistricts/SUB_ID/villages?page=1&limit=100"`,
  },
  {
    method: 'GET',
    path: '/search',
    desc: 'Search villages by name with full hierarchy',
    params: [
      { name: 'q', desc: 'Search query (min 2 chars) *required*' },
      { name: 'state', desc: 'Filter by state ID' },
      { name: 'district', desc: 'Filter by district ID' },
      { name: 'limit', desc: 'Max results (max 100, default 20)' },
    ],
    example: `curl -H "X-API-Key: YOUR_KEY" \\
  "${BASE_URL}/search?q=manibeli&limit=10"`,
  },
  {
    method: 'GET',
    path: '/autocomplete',
    desc: 'Typeahead suggestions for village names',
    params: [
      { name: 'q', desc: 'Partial village name (min 2 chars)' },
    ],
    example: `curl -H "X-API-Key: YOUR_KEY" \\
  "${BASE_URL}/autocomplete?q=akkalk"`,
  },
]

const codeExamples = {
  javascript: `const API_KEY = 'YOUR_API_KEY';
const BASE_URL = '${BASE_URL}';

async function searchVillage(query) {
  const res = await fetch(
    \`\${BASE_URL}/search?q=\${query}\`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  const data = await res.json();
  return data.data;
}

// Autocomplete example
async function autocomplete(input) {
  if (input.length < 2) return [];
  const res = await fetch(
    \`\${BASE_URL}/autocomplete?q=\${input}\`,
    { headers: { 'X-API-Key': API_KEY } }
  );
  const { data } = await res.json();
  return data;
}`,

  python: `import requests

API_KEY = 'YOUR_API_KEY'
BASE_URL = '${BASE_URL}'
HEADERS = {'X-API-Key': API_KEY}

def search_village(query, limit=20):
    resp = requests.get(
        f'{BASE_URL}/search',
        params={'q': query, 'limit': limit},
        headers=HEADERS
    )
    return resp.json()['data']

def get_states():
    return requests.get(f'{BASE_URL}/states', headers=HEADERS).json()['data']

# Usage
villages = search_village('manibeli')
for v in villages:
    print(v['fullAddress'])`,

  php: `<?php
$apiKey = 'YOUR_API_KEY';
$baseUrl = '${BASE_URL}';

function villageSearch($query, $limit = 20) {
    global $apiKey, $baseUrl;
    $url = "$baseUrl/search?" . http_build_query([
        'q' => $query, 
        'limit' => $limit
    ]);
    
    $context = stream_context_create([
        'http' => [
            'header' => "X-API-Key: $apiKey"
        ]
    ]);
    
    $res = file_get_contents($url, false, $context);
    return json_decode($res, true)['data'];
}

$results = villageSearch('manibeli');
foreach ($results as $v) {
    echo $v['fullAddress'] . "\\n";
}`,
}

export default function B2BDocs() {
  const [activeTab, setActiveTab] = useState<keyof typeof codeExamples>('javascript')

  return (
    <div className="p-6 animate-fadeIn max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-brand-400" />
          API Documentation
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Complete reference for the VillageAPI REST API
        </p>
      </div>

      {/* Auth */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-slate-200 mb-3 border-b border-brand-500/10 pb-2">
          Authentication
        </h2>
        <p className="text-sm text-slate-400 mb-3">
          All API requests require an API key passed in the request header:
        </p>
        <CodeBlock code={`X-API-Key: ak_your_api_key_here`} />
        <p className="text-xs text-slate-600 mt-2">Generate your API key in the API Keys section.</p>
      </section>

      {/* Response format */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-slate-200 mb-3 border-b border-brand-500/10 pb-2">
          Response Format
        </h2>
        <CodeBlock
          lang="json"
          code={`{
  "success": true,
  "count": 25,
  "data": [...],
  "meta": {
    "requestId": "req_abc123",
    "responseTime": 47,
    "rateLimit": {
      "remaining": 4850,
      "limit": 5000,
      "reset": "2024-01-15T00:00:00Z"
    }
  }
}`}
        />
      </section>

      {/* Village Object */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-slate-200 mb-3 border-b border-brand-500/10 pb-2">
          Village Object
        </h2>
        <CodeBlock
          lang="json"
          code={`{
  "value": "village_id_525002",
  "label": "Manibeli",
  "fullAddress": "Manibeli, Akkalkuwa, Nandurbar, Maharashtra, India",
  "hierarchy": {
    "village": "Manibeli",
    "villageCode": "525002",
    "subDistrict": "Akkalkuwa",
    "subDistrictId": "sub_id",
    "district": "Nandurbar",
    "districtId": "dist_id",
    "state": "Maharashtra",
    "stateId": "state_id",
    "country": "India"
  }
}`}
        />
      </section>

      {/* Endpoints */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-slate-200 mb-4 border-b border-brand-500/10 pb-2">
          Endpoints
        </h2>
        <div className="space-y-4">
          {endpoints.map((ep, i) => (
            <div key={i} className="card">
              <div className="flex items-start gap-3 mb-3">
                <span className="badge-teal font-mono">{ep.method}</span>
                <code className="font-mono text-sm text-slate-200">{ep.path}</code>
              </div>
              <p className="text-sm text-slate-400 mb-3">{ep.desc}</p>

              {ep.params.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Parameters
                  </p>
                  <div className="space-y-1">
                    {ep.params.map((p) => (
                      <div key={p.name} className="flex gap-3 text-xs">
                        <code className="font-mono text-brand-400 w-24 flex-shrink-0">{p.name}</code>
                        <span className="text-slate-500">{p.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <CodeBlock code={ep.example} />
            </div>
          ))}
        </div>
      </section>

      {/* Code Examples */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-slate-200 mb-4 border-b border-brand-500/10 pb-2">
          Code Examples
        </h2>
        <div className="flex gap-2 mb-4">
          {(Object.keys(codeExamples) as Array<keyof typeof codeExamples>).map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveTab(lang)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                activeTab === lang
                  ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
        <CodeBlock code={codeExamples[activeTab]} lang={activeTab} />
      </section>

      {/* Error codes */}
      <section>
        <h2 className="text-base font-bold text-slate-200 mb-4 border-b border-brand-500/10 pb-2">
          Error Codes
        </h2>
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-500/10">
                <th className="table-header text-left px-4 py-3">HTTP</th>
                <th className="table-header text-left px-4 py-3">Code</th>
                <th className="table-header text-left px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {[
                [400, 'INVALID_QUERY', 'Search query too short or invalid'],
                [401, 'INVALID_API_KEY', 'API key missing or invalid'],
                [403, 'ACCESS_DENIED', 'User not authorized for requested state'],
                [404, 'NOT_FOUND', 'Requested resource does not exist'],
                [429, 'RATE_LIMITED', 'Daily quota exceeded'],
                [500, 'INTERNAL_ERROR', 'Server-side error'],
              ].map(([code, name, desc]) => (
                <tr key={code as string} className="table-row">
                  <td className="table-cell px-4 font-mono text-xs">
                    <span className={parseInt(code as string) < 500 ? 'badge-yellow' : 'badge-red'}>
                      {code}
                    </span>
                  </td>
                  <td className="table-cell px-4 font-mono text-xs text-brand-400">{name}</td>
                  <td className="table-cell px-4 text-xs text-slate-400">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}