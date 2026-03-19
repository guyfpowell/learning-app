/**
 * Feature flags for the PocketChange app.
 *
 * Some features require a custom dev build and are not available in Expo Go.
 * Toggle them by setting the corresponding env var in your .env.local file.
 */
export const features = {
  /**
   * Stripe in-app wallet top-up (initPaymentSheet / presentPaymentSheet).
   *
   * Requires: EAS Build — @stripe/stripe-react-native uses native modules
   *           that are NOT included in the Expo Go app.
   *
   * To enable: set EXPO_PUBLIC_STRIPE_ENABLED=true in .env.local and build
   *            with EAS Build.
   */
  stripePayments: process.env.EXPO_PUBLIC_STRIPE_ENABLED === 'true',

  /**
   * Stripe hosted checkout — opens Stripe's payment page in a browser.
   *
   * Works in Expo Go. Uses POST /users/me/wallet/checkout on the backend
   * and redirects back to the app via the pocketchange:// deep link scheme.
   *
   * To enable: set EXPO_PUBLIC_STRIPE_CHECKOUT_ENABLED=true in .env.local.
   */
  stripeCheckout: process.env.EXPO_PUBLIC_STRIPE_CHECKOUT_ENABLED === 'true',
} as const;
