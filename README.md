# Finance Tracker 🚀

A premium, feature-rich React Native finance tracking application built with Expo. This app empowers users to manage multiple business cashbooks, track every cent with precision, and maintain organized financial records with a modern, high-end UI.

## ✨ Features

### 🏢 Multi-Business Management

- **Isolated Cashbooks**: Create and manage multiple businesses independently.
- **Real-time Totals**: View "Net Balance", "Total Cash In", and "Total Cash Out" for each business at a glance.
- **Custom Currencies**: Support for different currency symbols based on business location (handled via helpers).

### 🏷️ Intelligent Category System

- **Dynamic Filtering**: The app intelligently filters categories based on the transaction type. "Cash In" shows income categories, while "Cash Out" shows expense categories.
- **Full Customization**: Add, edit, or delete any category. Unlike traditional apps, you have full control over "default" categories, allowing you to tailor the app to your specific niche.
- **Visual Icons**: Categories are paired with clear icons for easy visual identification in the transaction list.

### 💸 Transaction Management

- **Cash In & Cash Out**: Simple, two-button workflow for recording financial entries.
- **Detailed Records**: Add amounts, select categories, and write optional remarks for every transaction.
- **Edit & Delete**: Full CRUD capabilities for all transactions. Accidentally entered the wrong amount? Just tap to edit.

### 🔍 Advanced History & Export

- **Search & Filter**: Find any transaction by amount, remark, or category. Sort history by "Today", "This Week", or "This Month".
- **CSV Export**: Generate professional CSV reports for your businesses. Share them via Email, WhatsApp, or cloud storage directly from your device.

### 🎨 Modern UI/UX

- **Dark Mode Support**: Seamlessly switch between light and premium dark themes that adapt to your eyes.
- **Aesthetic Design**: Clean typography (Inter/Outfit), smooth gradients, and glassmorphism-inspired components.
- **Safe Area Conscious**: Optimized for all screen types, including those with notches and dynamic islands.

### 👤 Personalized Profile

- **User Identity**: Set your name and email in the Settings screen to personalize your dashboard experience.
- **Easy Updates**: Seamlessly update your information with a unified "Save Changes" workflow.

### 💰 Smart Budgeting

- **Budget Planning**: Set monthly, weekly, or yearly budgets for each business with per-category allocation.
- **Real-time Tracking**: Monitor spending with a budget health score and color-coded progress bars (green/yellow/red).
- **Smart Notifications**: Get instant alerts when you're approaching or exceeding category budgets.
- **Visual Dashboard**: See at-a-glance budget status with percentage indicators and remaining amounts.
- **Flexible Management**: Edit budgets mid-period and validate that category budgets don't exceed total limits.

### 🔔 Smart Reminders

- **Fun Engagement**: Receive "fun and corny" reminders twice a day to remind you to log your entries. It makes finance management feel less like a chore.

---

## 🛠️ How Features Work

### 1. Setting Up Your Business

Upon launch, you can create a new business profile. This creates an isolated storage bucket for all transactions related to that specific entity. You can switch between businesses from the main dashboard.

### 2. Managing Categories

Navigate to **Settings > General > Categories**. Here you can define what "Income" and "Expense" types exist for your business. For example, if you run a cafe, you might add "Coffee Sales" as an Income and "Bean Supply" as an Expense.

### 3. Recording a Transaction

Tap a business to view its details, then select **CASH IN** or **CASH OUT**.

1. Enter the amount.
2. Select a category (the app automatically shows the right ones).
3. (Optional) Add a remark for context.
4. Save. Your business balance and history update instantly.

### 4. Searching and Exporting

In the business view, use the search bar or the quick-filter chips (Today/Week/Month). To generate a report, tap the **Download** icon to create a CSV file containing all filtered records.

---

## 🚀 Tech Stack

- **Framework**: Expo SDK 54 / React Native 0.81.5
- **Language**: TypeScript (Strongly typed for stability)
- **Navigation**: React Navigation (Drawer & Bottom Tabs)
- **Icons**: Lucide React Native
- **Storage**: AsyncStorage (Secure local persistence)
- **Themes**: Custom Theme Provider (Light/Dark support)

## 📁 Project Structure

```
finance-tracker/
├── src/
│   ├── components/        # Reusable UI components (StatCards, Modals)
│   ├── screens/           # Main views (Dashboard, Business Detail, Settings)
│   ├── theme/             # Styling tokens and Dark Mode logic
│   ├── utils/             # Business logic, CSV Export, and Storage helpers
│   ├── styles/            # Shared component styles
│   └── types/             # Centralized TypeScript interfaces
├── App.tsx                # Context providers & Navigation root
└── package.json           # Dependencies and scripts
```

## 📦 Getting Started

1. **Install Dependencies**:
    ```bash
    npm install
    ```
2. **Start Expo**:
    ```bash
    npx expo start
    ```
3. **Run on Device**:
   Scan the QR code with the **Expo Go** app on Android or the Camera app on iOS.

## 💾 Data Persistence

All your data is saved locally on your device using `AsyncStorage`. This ensures that your financial records are private and available even without an internet connection.

---

_Built with ❤️ for better financial management._
