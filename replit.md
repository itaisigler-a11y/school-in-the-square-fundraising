# Fundraising Management Platform for School in the Square

## Overview

This is a comprehensive fundraising management platform built specifically for School in the Square (S²), a NYC public charter school. The platform provides donor management, campaign tracking, data analytics, and communication tools to streamline the school's fundraising operations. The application features a modern React frontend with TypeScript for type safety, a Node.js/Express backend, and PostgreSQL database integration using Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18 with TypeScript**: Component-based architecture with strict type checking for enhanced development experience and code reliability
- **Vite Build Tool**: Fast development server and optimized production builds with hot module replacement
- **Tailwind CSS + Shadcn/ui**: Utility-first CSS framework combined with accessible, pre-built component library for consistent design system
- **Wouter Router**: Lightweight client-side routing solution for single-page application navigation
- **TanStack Query**: Server state management with caching, background updates, and error handling for API interactions
- **React Hook Form + Zod**: Form state management with schema validation for robust user input handling

### Backend Architecture
- **Node.js + Express**: RESTful API server with middleware-based request processing
- **Drizzle ORM**: Type-safe database operations with PostgreSQL dialect for schema management and migrations
- **Replit Authentication**: OAuth-based authentication system with session management using PostgreSQL session store
- **Role-Based Access Control**: User permissions system with roles (administrator, development_officer, finance, volunteer)
- **File Upload Processing**: Multer middleware for handling CSV/Excel file imports with validation

### Database Design
- **PostgreSQL**: Primary database with the following core entities:
  - Users table with role-based permissions and authentication data
  - Donors table with comprehensive profile information, engagement scoring, and relationship tracking
  - Campaigns table for fundraising campaign management with status tracking
  - Donations table linking donors to campaigns with amount and metadata
  - Communications table for tracking donor interactions and email campaigns
  - Data imports table for audit trail of CSV/Excel import operations
- **Drizzle Schema**: Type-safe schema definitions with enum types for donor categories, engagement levels, and campaign statuses
- **Session Storage**: PostgreSQL-based session management for secure user authentication

### State Management
- **Client-side**: TanStack Query for server state with optimistic updates and background synchronization
- **Authentication**: Session-based authentication with user context and role checking
- **Form State**: React Hook Form for complex form management with validation

### Data Processing
- **CSV/Excel Import**: Custom parsing utilities using Papa Parse (CSV) and XLSX (Excel) libraries
- **Field Mapping**: Dynamic field mapping interface for flexible data import
- **Duplicate Detection**: Smart duplicate identification during import process
- **Validation Pipeline**: Multi-stage validation with Zod schemas for data integrity

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL connection adapter optimized for serverless environments
- **drizzle-orm**: Type-safe database ORM with migration support
- **express**: Web application framework for API endpoints
- **react**: Frontend UI library with component-based architecture
- **typescript**: Static type checking for enhanced code quality

### UI/UX Libraries
- **@radix-ui/react-***: Accessible, unstyled component primitives for building design system
- **tailwindcss**: Utility-first CSS framework for rapid UI development
- **class-variance-authority**: Utility for creating variant-based component APIs
- **lucide-react**: Icon library with consistent design language

### Data Processing
- **papaparse**: CSV parsing library with robust error handling
- **xlsx**: Excel file processing for .xls and .xlsx formats
- **zod**: Schema validation library for runtime type checking
- **date-fns**: Date manipulation and formatting utilities

### Development Tools
- **vite**: Build tool with fast development server and optimized production builds
- **tsx**: TypeScript execution environment for development
- **esbuild**: Fast JavaScript bundler for production builds

### Authentication & Security
- **openid-client**: OpenID Connect client for Replit authentication
- **passport**: Authentication middleware with strategy-based approach
- **express-session**: Session management middleware
- **connect-pg-simple**: PostgreSQL session store adapter

### File Upload & Processing
- **multer**: Multipart form data handling for file uploads
- **@types/multer**: TypeScript definitions for Multer

The architecture prioritizes type safety, scalability, and maintainability while providing a comprehensive solution for nonprofit fundraising management. The system is designed to handle the specific needs of educational institutions with features for parent/alumni tracking, grade-level associations, and school-specific donor categorization.

## AI-Powered Fundraising Assistant

### Overview
The platform now includes comprehensive AI integration using **OpenAI GPT-5** (latest available model as of August 2025) to transform the fundraising platform into an intelligent assistant that generates personalized donation appeals, optimizes email subject lines, and creates professional grant proposal outlines.

### AI Service Architecture
- **OpenAI Integration**: GPT-5 model with secure API key management through Replit integrations
- **AI Service Wrapper**: Comprehensive service layer (`server/ai-service.ts`) with error handling, rate limiting, and usage monitoring
- **Context Awareness**: Leverages donor data, campaign information, and School in the Square mission for personalized content generation
- **Audit Logging**: Complete tracking of all AI usage with user attribution and content details

### Core AI Features

#### 1. Personalized Donation Appeals
- **Donor Analysis**: Analyzes giving history, school connection (parent/alumni/community), and engagement level
- **Appeal Generation**: Creates compelling donation requests tailored to individual donor relationships
- **Tone Variations**: Professional, warm, urgent, and gratitude-focused options
- **A/B Testing**: Generates 3-5 variations for campaign optimization
- **School Integration**: References School in the Square mission, values, and specific programs

#### 2. Email Subject Line Optimization
- **Campaign Awareness**: Generates subject lines based on campaign type and goals
- **Personalization**: Incorporates donor names, history, and school connections
- **Performance Prediction**: AI-powered predictions for open rates and engagement
- **Style Variations**: Direct, personal, curiosity-driven, and benefit-focused approaches
- **Length Optimization**: Character count warnings and mobile-friendly suggestions

#### 3. Grant Proposal Assistance
- **Structured Outlines**: Comprehensive proposal frameworks with professional formatting
- **Content Sections**: Executive summaries, problem statements, methodology, budget narratives
- **Evaluation Plans**: Assessment strategies and success metrics
- **Sustainability**: Long-term impact and funding continuation strategies
- **Export Functionality**: Professional text export for proposal development

### AI API Endpoints
The platform includes three new authenticated API endpoints:

- **POST /api/ai/donation-appeal**: Generate personalized donation appeals with donor context
- **POST /api/ai/subject-lines**: Create email subject line variations with performance predictions  
- **POST /api/ai/grant-outline**: Develop comprehensive grant proposal outlines

All endpoints include:
- Authentication and role-based permissions (`communications:send`, `grants:edit`)
- Request validation using Zod schemas
- Comprehensive error handling and rate limiting
- Audit logging for compliance and usage tracking

### Frontend AI Integration

#### Campaign Creation Workflow
- **AI Assistant Panel**: Integrated AI content generation within campaign forms
- **Real-time Generation**: Live appeal creation based on selected donor segments
- **Content Management**: Copy, edit, and apply AI-generated content seamlessly
- **Performance Insights**: Display AI recommendations and donor insights

#### Email Template Builder
- **Subject Line Generation**: AI-powered subject line creation based on email content
- **Performance Predictions**: High/medium/low performance indicators with reasoning
- **Style Analytics**: Breakdown of subject line approaches and effectiveness
- **Content Integration**: Seamless application of generated subject lines to templates

#### Grant Proposal Assistant
- **Dedicated Component**: Standalone grant proposal generator (`client/src/components/grants/grant-proposal-assistant.tsx`)
- **Tabbed Interface**: Separate sections for grant details and AI-generated outlines
- **Professional Export**: Download complete proposals in formatted text
- **Section Management**: Individual copy/edit capabilities for each proposal section

### Security & Compliance

#### Data Protection
- **Minimal Data Exposure**: Only necessary context sent to OpenAI APIs
- **No Sensitive Information**: Personal financial details and confidential donor information excluded
- **Audit Trails**: Complete logging of AI interactions for compliance and review
- **Permission Controls**: Role-based access to AI features with proper authentication

#### Usage Monitoring
- **Rate Limiting**: Per-user request limits to prevent abuse and control costs
- **Error Handling**: Graceful degradation when AI services are unavailable
- **Cost Tracking**: Usage analytics for budget management and optimization
- **Quality Assurance**: Human review workflows for sensitive communications

### Technical Implementation

#### Dependencies Added
- **openai**: Official OpenAI SDK for GPT-5 integration
- **AI Schemas**: Extended Zod validation schemas for AI request/response handling
- **Audit Extensions**: Database schema additions for AI usage logging

#### Database Schema Extensions
- **AI Audit Logs**: Track all AI generation requests with user attribution
- **Content Versioning**: Store generated content variations for analysis
- **Performance Metrics**: Track effectiveness of AI-generated content

#### Error Handling & Resilience
- **API Failures**: Graceful fallback to manual content creation
- **Rate Limits**: User-friendly messaging with retry suggestions
- **Validation**: Comprehensive input validation before AI processing
- **Monitoring**: Health checks and usage analytics

### Performance Impact
The AI integration maintains platform performance through:
- **Asynchronous Processing**: Non-blocking AI requests with loading states
- **Smart Caching**: Reuse of similar content to reduce API calls
- **Progressive Enhancement**: AI features enhance but don't replace core functionality
- **Optimized Requests**: Efficient prompting to minimize token usage

This AI integration transforms the fundraising platform into an intelligent assistant that significantly improves campaign effectiveness, donor engagement, and grant writing efficiency while maintaining the platform's reliability and security standards.