# Admin UI Documentation

## Table of Contents
1. [Overview](#overview)
2. [Technology Stack](#technology-stack)
3. [Installation & Setup](#installation--setup)
4. [Features](#features)
5. [Pages & Components](#pages--components)
6. [API Integration](#api-integration)
7. [Development](#development)
8. [Configuration](#configuration)
9. [Deployment](#deployment)

---

## Overview

The Admin UI is a modern, responsive web application built with Next.js 15 and React 19 that provides a comprehensive interface for managing the Runtime API Platform. It features a visual API builder, real-time data management, security configuration, and extensive monitoring capabilities.

### Key Features

- 🎨 **Modern UI/UX** - Clean, intuitive interface with shadcn/ui components
- 🔧 **Visual API Builder** - JSON Schema-based API creation
- 📊 **Real-time Dashboard** - Live metrics and analytics
- 🔐 **Security Center** - Runtime security configuration
- 📱 **Responsive Design** - Mobile-first approach
- ⚡ **Fast Performance** - Next.js 15 with Turbopack
- 🔑 **JWT Authentication** - Secure auth with refresh tokens
- 📝 **API Explorer** - Interactive API testing interface

---

## Technology Stack

| Category | Technology | Purpose |
|----------|------------|---------|
| **Framework** | Next.js 15.1 | React framework with App Router |
| **UI Library** | React 19 | User interface components |
| **Styling** | Tailwind CSS 3.4 | Utility-first CSS framework |
| **UI Components** | shadcn/ui | Modern React component library |
| **Icons** | Lucide React | Modern icon library |
| **Forms** | React Hook Form | Form state management |
| **Validation** | Zod | Schema validation |
| **Data Fetching** | TanStack Query v5 | Server state management |
| **HTTP Client** | Axios | API communication |
| **Charts** | Recharts | Data visualization |
| **Notifications** | Sonner | Toast notifications |
| **Development** | Turbopack | Fast bundler (beta) |
| **TypeScript** | 5.x | Type-safe development |

---

## Installation & Setup

### Prerequisites

```bash
# Required
Node.js >= 18.0.0
npm >= 9.0.0

# Backend API must be running
# Infrastructure (PostgreSQL, Valkey) must be available
```

### Quick Start

1. **Install Dependencies**
```bash
cd admin-ui
npm install
```

2. **Configure Environment**
```bash
# Create .env.local file
cp .env.local.example .env.local

# Edit configuration
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

3. **Start Development Server**
```bash
npm run dev
# UI available at http://localhost:3000
```

4. **Default Credentials**
```
Email: admin@example.com
Password: password123
```

---

## Features

### Dashboard
- **System Metrics** - Users, entities, records, API calls
- **Activity Timeline** - Recent system events
- **Quick Actions** - Common administrative tasks
- **Performance Charts** - API response times and usage

### APIs Management
- **API Builder** - Create APIs from JSON Schema definitions
- **Entity Management** - CRUD operations for dynamic entities
- **Data Records** - Manage data for each entity type
- **Schema Validation** - Real-time JSON Schema validation
- **Import/Export** - Backup and restore entity definitions

### Functions
- **Function Editor** - Create and edit serverless functions
- **Test Console** - Execute functions with test data
- **Execution Logs** - View function run history
- **Performance Metrics** - Monitor function performance

### User Management
- **User List** - Comprehensive user directory
- **Role Management** - Admin, API user, regular user roles
- **Account Actions** - Activate, deactivate, reset password
- **Session Management** - View and manage active sessions
- **Activity History** - Track user actions

### API Management
- **Rate Limits** - Configure rate limiting rules
- **API Keys** - Generate and manage API keys
- **API Explorer** - Interactive API testing interface
- **Audit & Monitoring** - System logs and retention policies

### Security Settings
- **Authentication** - Configure JWT, session settings
- **Password Policy** - Set password requirements
- **Session Security** - Timeout and concurrent session limits
- **IP Security** - Whitelist/blacklist management
- **Advanced Security** - CORS, headers, encryption settings

### OpenAPI Documentation
- **Endpoints** - Browse all API endpoints
- **Schemas** - View data models and structures
- **Interactive Testing** - Try API calls directly

---

## Pages & Components

### Current Page Structure

```
admin-ui/src/app/
├── (auth)/
│   └── login/                 # Login page
├── dashboard/
│   └── page.tsx              # Main dashboard
├── apis/                     # API Management (formerly entities)
│   ├── page.tsx             # API list
│   ├── builder/             # API Builder
│   └── [id]/               # API details
├── functions/               # Function management
│   └── page.tsx
├── users/                   # User management
│   └── page.tsx
├── api-management/         # API tools
│   ├── rate-limits/       # Rate limiting
│   ├── api-keys/          # API key management
│   ├── explorer/          # Interactive API Explorer
│   └── audit-monitoring/  # Audit logs
├── security/               # Security settings
│   └── page.tsx
├── api-docs/              # OpenAPI documentation
│   └── page.tsx
└── settings/              # User settings
    └── page.tsx
```

### Key Components

#### API Builder
```tsx
// Visual API schema builder
<APIBuilder
  onSave={(schema) => createEntity(schema)}
  initialSchema={existingSchema}
/>
```

#### Security Settings Manager
```tsx
// Runtime security configuration
<SecuritySettings
  categories={['auth', 'password', 'session', 'ip', 'advanced']}
  onUpdate={(key, value) => updateSetting(key, value)}
/>
```

#### API Explorer
```tsx
// Interactive API testing
<APIExplorer
  endpoints={endpoints}
  onExecute={(request) => executeRequest(request)}
/>
```

#### Rate Limit Configuration
```tsx
// Visual rate limit editor
<RateLimitEditor
  rules={rateLimits}
  onSave={(rules) => updateRateLimits(rules)}
/>
```

---

## API Integration

### API Client Setup

The admin UI uses a custom API client that communicates with the backend:

```typescript
// lib/api-client.ts
class ApiClient {
  private axios: AxiosInstance;

  constructor() {
    this.axios = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL,
      withCredentials: true,
    });
  }

  // Authentication endpoints
  auth = {
    login: (credentials) => this.axios.post('/auth/login', credentials),
    logout: () => this.axios.post('/auth/logout'),
    refresh: () => this.axios.post('/auth/refresh'),
    getProfile: () => this.axios.get('/auth/profile'),
  };

  // Admin endpoints (under /admin/)
  users = {
    list: () => this.axios.get('/admin/users'),
    get: (id) => this.axios.get(`/admin/users/${id}`),
    create: (data) => this.axios.post('/admin/users', data),
    update: (id, data) => this.axios.put(`/admin/users/${id}`, data),
    delete: (id) => this.axios.delete(`/admin/users/${id}`),
  };

  // Rate limits (under /admin/)
  rateLimits = {
    list: () => this.axios.get('/admin/rate-limits'),
    get: (name) => this.axios.get(`/admin/rate-limits/${name}`),
    create: (data) => this.axios.post('/admin/rate-limits', data),
    update: (name, data) => this.axios.put(`/admin/rate-limits/${name}`, data),
    delete: (name) => this.axios.delete(`/admin/rate-limits/${name}`),
  };

  // Security settings (under /admin/)
  securitySettings = {
    getAll: () => this.axios.get('/admin/security-settings/all'),
    getByKey: (key) => this.axios.get(`/admin/security-settings/${key}`),
    update: (key, value) => this.axios.put(`/admin/security-settings/${key}`, { value }),
  };
}
```

### Data Fetching with TanStack Query

```typescript
// hooks/use-users.ts
export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.users.list(),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }) => apiClient.users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User updated successfully');
    },
  });
}
```

### Authentication Context

```typescript
// contexts/auth-context.tsx
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const login = async (credentials) => {
    const response = await apiClient.auth.login(credentials);
    setUser(response.data.user);
    router.push('/dashboard');
  };

  const logout = async () => {
    await apiClient.auth.logout();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

---

## Development

### Project Structure

```
admin-ui/
├── src/
│   ├── app/                # Next.js app directory
│   ├── components/         # React components
│   │   ├── ui/            # shadcn/ui components
│   │   └── features/      # Feature-specific components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utilities and API client
│   ├── contexts/          # React contexts
│   └── types/             # TypeScript definitions
├── public/                # Static assets
└── package.json          # Dependencies
```

### Available Scripts

```bash
npm run dev        # Start development server with Turbopack
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
npm run type-check # Run TypeScript check
```

### Adding New Features

1. **Create Page Route**
```tsx
// app/new-feature/page.tsx
export default function NewFeaturePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">New Feature</h1>
      {/* Page content */}
    </div>
  );
}
```

2. **Add to Sidebar Navigation**
```tsx
// components/layout/sidebar.tsx
const navItems = [
  // ...existing items
  {
    title: "New Feature",
    href: "/new-feature",
    icon: <IconComponent />,
  },
];
```

3. **Create API Integration**
```typescript
// lib/api-client.ts
newFeature = {
  list: () => this.axios.get('/new-feature'),
  create: (data) => this.axios.post('/new-feature', data),
};
```

---

## Configuration

### Environment Variables

```env
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_APP_NAME="Base Platform Admin"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

### Tailwind Configuration

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
```

### Next.js Configuration

```javascript
// next.config.js
module.exports = {
  experimental: {
    turbo: {},
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL}/:path*`,
      },
    ];
  },
};
```

---

## Deployment

### Production Build

```bash
# Install dependencies
npm ci --production

# Build application
npm run build

# Start production server
npm run start
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Deployment Checklist

- [ ] Set production API URL in environment
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up monitoring and error tracking
- [ ] Configure CDN for static assets
- [ ] Enable rate limiting on API
- [ ] Set secure authentication secrets
- [ ] Configure backup strategy
- [ ] Set up CI/CD pipeline

---

## Troubleshooting

### Common Issues

**Authentication Issues**
- Clear browser cookies and localStorage
- Verify API URL is correct
- Check JWT token expiration
- Ensure refresh token is working

**API Connection Errors**
```bash
# Check API is running
curl http://localhost:3001/api/v1/health

# Verify CORS settings
# Check browser console for CORS errors
```

**Build Errors**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

**Type Errors**
```bash
# Regenerate types
npm run type-check

# Update dependencies
npm update
```

---

## Component Library

### Available UI Components (shadcn/ui)

- **Accordion** - Collapsible content sections
- **Alert** - Alert messages and notifications
- **Badge** - Status indicators
- **Button** - Interactive buttons
- **Card** - Content containers
- **Checkbox** - Selection inputs
- **Dialog** - Modal dialogs
- **Dropdown Menu** - Context menus
- **Form** - Form controls with validation
- **Input** - Text input fields
- **Label** - Form labels
- **Radio Group** - Radio button groups
- **Select** - Dropdown selections
- **Sheet** - Side panels
- **Switch** - Toggle switches
- **Table** - Data tables
- **Tabs** - Tab navigation
- **Textarea** - Multi-line text input
- **Toast** - Notification toasts
- **Tooltip** - Hover tooltips

### Custom Components

- **APIBuilder** - Visual API schema designer
- **SecuritySettingsPanel** - Security configuration interface
- **RateLimitEditor** - Rate limit rule editor
- **APIExplorer** - Interactive API testing tool
- **UserTable** - User management table
- **MetricCard** - Dashboard metric display
- **ActivityFeed** - Real-time event stream
- **SchemaEditor** - JSON Schema editor

---

## Best Practices

### Performance
- Use dynamic imports for code splitting
- Implement pagination for large data sets
- Cache API responses with TanStack Query
- Use React.memo for expensive components
- Optimize images with Next.js Image component

### Security
- Always validate user input
- Use HTTPS in production
- Implement proper CORS policies
- Store sensitive data securely
- Regular dependency updates
- Use environment variables for secrets

### Code Quality
- Follow TypeScript strict mode
- Write meaningful component names
- Use ESLint and Prettier
- Document complex logic
- Write unit tests for utilities

### Accessibility
- Use semantic HTML elements
- Provide ARIA labels
- Ensure keyboard navigation
- Maintain color contrast ratios
- Test with screen readers

---

## Support

For additional help:
- Review the codebase examples
- Check Next.js documentation
- Consult shadcn/ui documentation
- Review TanStack Query guides