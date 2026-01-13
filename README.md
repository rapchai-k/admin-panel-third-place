# MyThirdPlace Admin Panel

## Project Overview

**URL**: https://mythirdplace-admin.vercel.app

**MyThirdPlace Admin Panel** is a comprehensive administrative dashboard for managing communities, events, users, and analytics. Built with modern web technologies, it provides a powerful interface for community platform administration.

## Technology Stack

This project is built with:

- **React 18** - Modern React with hooks and concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool with HMR
- **Tailwind CSS** - Utility-first CSS framework
- **Shadcn/ui** - Modern component library
- **Supabase** - Backend-as-a-Service (Database, Auth, Storage)
- **React Query** - Server state management
- **React Router** - Client-side routing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git

### Installation

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd mythirdplace-admin

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Start the development server
npm run dev
```

### Environment Setup

Create a `.env.local` file with your Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Development

### Available Scripts

```sh
# Start development server
npm run dev

# Build for production
npm run build

# Build for development
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Local Development with Supabase

For local development, you can use Supabase CLI:

```sh
# Start local Supabase instance
supabase start

# Apply database migrations
supabase db reset

# Generate TypeScript types
supabase gen types typescript --local > src/types/database.types.ts
```

See `SUPABASE_LOCAL_DEV.md` for detailed local development instructions.

## Features

### Core Functionality
- **User Management** - Complete CRUD operations with role-based access
- **Community Management** - Create and manage communities with member tracking
- **Event Management** - Full event lifecycle with registration tracking
- **Discussion Management** - Monitor and moderate community discussions
- **Analytics Dashboard** - Comprehensive data visualization and reporting
- **File Management** - Upload and manage images for users, communities, and events

### Advanced Features
- **Role-Based Access Control** - Granular permissions system
- **Bulk Operations** - Efficient mass user management
- **Real-time Analytics** - Live dashboard metrics
- **Audit Logging** - Complete activity tracking
- **Content Moderation** - Flagging and moderation tools

### Security
- **Row Level Security (RLS)** - Database-level security policies
- **Admin Authentication** - Secure admin-only access
- **Session Management** - Automatic token refresh
- **Audit Trails** - Complete action logging

## Project Structure

```
src/
├── components/
│   ├── admin/              # Admin-specific components
│   └── ui/                 # Reusable UI components
├── pages/
│   ├── admin/              # Admin dashboard pages
│   └── Index.tsx           # Landing page
├── integrations/
│   └── supabase/           # Supabase integration
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
└── styles/                 # Global styles
```

## Deployment

### Production Deployment

1. **Build the application**
   ```sh
   npm run build
   ```

2. **Deploy to your hosting platform**
   - Vercel (recommended)
   - Netlify
   - Any static hosting service

3. **Configure environment variables**
   - Set production Supabase URL and keys
   - Configure any additional environment variables

### Database Deployment

1. **Apply migrations to production**
   ```sh
   supabase db push
   ```

2. **Verify RLS policies are active**
3. **Test admin authentication**

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Use existing component patterns
- Write meaningful commit messages
- Test admin functionality thoroughly
- Update documentation for new features

## Documentation

- `PROJECT_UPDATE_TRACKER.md` - Detailed project development history
- `SUPABASE_LOCAL_DEV.md` - Local development setup guide
- Inline code comments for complex logic

## Support

For questions or issues:

1. Check existing documentation
2. Review the project tracker for known issues
3. Create an issue with detailed description
4. Include steps to reproduce any bugs

## License

This project is proprietary software for MyThirdPlace platform administration.

---

**MyThirdPlace Admin Panel** - Empowering community management through modern web technology.
