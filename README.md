# CarSpottr

A React Native Expo app for car spotting and collection management.

## Features

- 📱 Cross-platform mobile app (iOS, Android, Web)
- 🚗 Car collection management
- 📸 Photo upload and storage
- 🔍 AI-powered car identification
- 👤 User authentication
- 💳 In-app purchases (iOS)

## Tech Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Backend**: Supabase
- **AI**: OpenAI
- **Payments**: RevenueCat
- **Storage**: Supabase Storage

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn
- Expo CLI

### Installation

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd carspottr
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in `.env`:
   - Get your Supabase URL and anon key from your Supabase project
   - Get your OpenAI API key from OpenAI
   - Get your RevenueCat API key for iOS purchases

### Running the App

Start the development server:
```bash
npm run dev
```

Or run on specific platforms:
```bash
npm run dev:ios      # iOS
npm run dev:android  # Android
npm run dev:web      # Web
```

## Environment Variables

See `.env.example` for all required environment variables.

## Project Structure

```
app/                 # Expo Router app directory
  (tabs)/           # Tab navigation screens
  auth.tsx          # Authentication screen
  auth-success.tsx  # Auth success callback
lib/                 # Utility libraries
  supabase.ts       # Supabase client
  openai.ts         # OpenAI client
  purchases.ts      # RevenueCat purchases
  storage.ts        # File upload utilities
supabase/           # Database migrations
  migrations/       # Supabase migration files
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and not intended for public distribution.
