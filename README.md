# Finance Tracker

A React Native finance tracking application built with Expo, allowing users to manage multiple businesses and track income/expenses.

## Features

- 📊 **Dashboard**: View balance, income, and expenses at a glance
- 💼 **Multiple Businesses**: Track finances for multiple businesses separately
- 💰 **Transactions**: Add and view income and expense transactions
- 🎨 **Customizable Theme**: Easily change the primary color through the theme system

## Tech Stack

- **Expo SDK 54**
- **React Native 0.81.5**
- **TypeScript 5.3+**
- **React Navigation** for navigation
- **AsyncStorage** for local data persistence
- **Lucide React Native** for icons

## Project Structure

```
finance-tracker/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── BusinessChip.tsx
│   │   ├── BusinessItem.tsx
│   │   ├── StatCard.tsx
│   │   └── TransactionItem.tsx
│   ├── screens/          # Screen components
│   │   ├── DashboardScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   └── BusinessesScreen.tsx
│   ├── styles/           # Global styles
│   │   └── globalStyles.ts
│   ├── theme/            # Theme configuration
│   │   └── theme.ts
│   ├── utils/            # Utility functions
│   │   └── storage.ts
│   └── types.ts          # TypeScript type definitions
├── App.tsx               # Main app entry point
├── tsconfig.json         # TypeScript configuration
└── package.json
```

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo Go app on your mobile device (SDK 54 compatible)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd finance-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Scan the QR code with Expo Go app (Android) or Camera app (iOS)

## Customizing the Theme

The app uses a centralized theme system that makes it easy to customize colors. To change the primary color:

1. Open `src/theme/theme.ts`
2. Modify the `primary` color in the `colors` object:

```typescript
export const theme = {
  colors: {
    primary: '#000000', // Change this to your desired color
    // ... other colors
  },
  // ... spacing and borderRadius
};
```

All components using the primary color will automatically update to reflect your changes.

### Available Theme Colors

- `primary`: Main brand color (used for active states, buttons, etc.)
- `background`: Main background color
- `card`: Card/surface background color
- `surface`: Secondary surface color
- `text`: Primary text color
- `textSecondary`: Secondary text color
- `textInverse`: Text color on primary background
- `border`: Border color
- `borderLight`: Light border color
- `error`: Error/negative state color
- `placeholder`: Placeholder text color
- `success`: Success/positive state color

## TypeScript Migration

This project has been fully converted to TypeScript for better type safety and developer experience. Key type definitions can be found in `src/types.ts`:

- `Business`: Business entity type
- `Transaction`: Transaction entity type

## Scripts

- `npm start`: Start the Expo development server
- `npm run android`: Run on Android device/emulator
- `npm run ios`: Run on iOS device/simulator
- `npm run web`: Run in web browser

## Data Storage

The app uses AsyncStorage to persist data locally on the device. Data includes:
- List of businesses
- Transaction history

## License

This project is private and not licensed for public use.
