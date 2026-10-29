# SwiftChain Frontend — Implementation Index: 100 Issues Mapped to 22 Figma Design Areas

## Overview

This document maps all **100 granular issues** (Implementation, Enhancement, Test, and Docs) to the **22 Figma UI/UX (Light Mode) design areas** for the SwiftChain Frontend. Each theme lists its required issues with numbers, associated components/hooks/services/types, and a checklist table for tracking completion status.

- **Repository**: [SwiftChain-Frontend](https://github.com/SwiftChainn/SwiftChain_Frontend)
- **Figma Design**: [Swiftchainn Frontend](https://www.figma.com/design/9KgeY0xE2bfqkFuyFLAOWl/Swiftchainn-Frontend?node-id=0-1&t=FNZlR3fgUB2KjxR8-1)
- **Design System Reference**: [Stellar Project Fig](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)
- **Architecture**: Strict Component → Hook → Service layered pattern
- **Data Source**: Backend API only — no inline mock objects
- **Contribution Guide**: [CONTRIBUTING.md](../CONTRIBUTING.md)

---

## Summary of All 22 Design Areas

| # | Design Area | Issues | Frontend | Enhancement | Test | Docs |
|---|---|---|---|---|---|---|
| 1 | Hero Section | 5 | 3 | 0 | 1 | 1 |
| 2 | Delivery Workflow Cards | 5 | 2 | 1 | 1 | 1 |
| 3 | Header – Navbar | 5 | 1 | 2 | 1 | 1 |
| 4 | Login Page | 4 | 2 | 1 | 1 | 0 |
| 5 | Register Page | 4 | 2 | 1 | 1 | 0 |
| 6 | Footer | 4 | 2 | 1 | 1 | 0 |
| 7 | Dashboard Overview | 5 | 2 | 1 | 1 | 1 |
| 8 | Customer Active Deliveries | 5 | 2 | 1 | 1 | 1 |
| 9 | New Delivery – Sender & Receiver Details | 5 | 1 | 2 | 1 | 1 |
| 10 | New Delivery – Cargo Type & Dimensions | 4 | 2 | 1 | 1 | 0 |
| 11 | Live Currency Converter & Exchange Rates | 5 | 1 | 2 | 1 | 1 |
| 12 | Global Unified Search | 4 | 1 | 2 | 1 | 0 |
| 13 | Fleet & Partner Network | 5 | 2 | 1 | 1 | 1 |
| 14 | Fleet Manager Vehicle Tracking | 4 | 1 | 2 | 1 | 0 |
| 15 | Escrow Payment Checkout | 5 | 2 | 1 | 1 | 1 |
| 16 | Driver Job Marketplace | 4 | 1 | 2 | 1 | 0 |
| 17 | Wholesale & Retail Bulk Shipment Import | 5 | 1 | 2 | 1 | 1 |
| 18 | View Estimated Delivery Date & Route Progress | 5 | 2 | 1 | 1 | 1 |
| 19 | Receipt Verification Page | 4 | 2 | 0 | 1 | 1 |
| 20 | Activity Center | 4 | 2 | 1 | 1 | 0 |
| 21 | Cross-Border Transaction History | 4 | 2 | 1 | 1 | 0 |
| 22 | Statistics & Choose Plan | 5 | 1 | 2 | 1 | 1 |

---

## Figma Design Area Reference Links

| Design Area | Figma Node Reference |
|---|---|
| Hero Section | `node-id=227-112` |
| Delivery Workflow Cards | `node-id=227-112` |
| Header – Navbar | `node-id=227-112` |
| Login Page | `node-id=227-2&p=f&t=j0tZfGASSvOL8oxc-0` |
| Register Page | `node-id=227-2&p=f&t=j0tZfGASSvOL8oxc-0` |
| Footer | `node-id=227-2&p=f&t=j0tZfGASSvOL8oxc-0` |
| Dashboard Overview | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| Customer Active Deliveries | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| New Delivery – Sender & Receiver Details | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| New Delivery – Cargo Type & Dimensions | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| Live Currency Converter & Exchange Rates | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| Global Unified Search | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| Fleet & Partner Network | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| Fleet Manager Vehicle Tracking | `node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0` |
| Escrow Payment Checkout | `node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0` |
| Driver Job Marketplace | `node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0` |
| Wholesale & Retail Bulk Shipment Import | `node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0` |
| View Estimated Delivery Date & Route Progress | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| Receipt Verification Page | `node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0` |
| Activity Center | `node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0` |
| Cross-Border Transaction History | `node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0` |
| Statistics & Choose Plan | `node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0` |

---

## Theme 1: Hero Section (Issues 1–5)

**Figma Reference**: [Hero Section](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-112)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 1 | Frontend | Implement Hero Section with Animated Stats Display | Component rendering platform headline, live XLM price ticker, and animated statistics counters. Uses `useHeroStats` for data. | `components/landing/HeroSection.tsx`, `components/landing/Statistics.tsx` | `useHeroStats.ts`, `useXLMPriceChart.ts` | `landingService.ts`, `fxService.ts` | `types/valueProp.ts` | `components/landing/__tests__/HeroSection.test.tsx` |
| 2 | Frontend | Build Trustless Escrow Section UI | Dark mode mobile landing hero showcasing escrow flow. Integrates `WalletConnect` and `useEscrowLock`. | `components/landing/TrustlessEscrow.tsx` | `useEscrowLock.ts`, `useWallet.ts` | `escrowService.ts` | `types/escrow.ts` | `components/landing/__tests__/TrustlessEscrow.test.tsx` |
| 3 | Frontend | Add Delivery Workflow Cards to Hero Landing | Four-step workflow cards (Send → Lock → Deliver → Confirm) with responsive grid and `lucide-react` icons. | `components/deliveries/WorkflowCards.tsx` | `useWorkflowCards.ts` | `deliveryWorkflowService.ts` | `types/delivery.ts` | `components/deliveries/__tests__/WorkflowCards.test.tsx` |
| 4 | Docs | Document Hero Section Architecture and Patterns | Create implementation guide for landing page component structure, hook integration, and service call patterns. | `docs/hero-architecture.md` | — | — | — | — |
| 5 | Test | Hero Section Unit Tests — Stats and Animations | Test animated counter rendering, XLM price fetch, responsive breakpoints, and dark mode compatibility. | `components/landing/__tests__/HeroSection.test.tsx`, `components/landing/__tests__/Statistics.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 1, 2, 3 | — | ✅ 5 | ✅ 4 |

---

## Theme 2: Delivery Workflow Cards (Issues 6–10)

**Figma Reference**: [Delivery Workflow Cards](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-112)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 6 | Enhancement | Local Landmark Address Integration for Workflow Cards | Add optional Landmark field to cards. Highlight with distinct badge. Handle null gracefully without breaking layout. | `components/deliveries/WorkflowCards.tsx` | `useWorkflowCards.ts` | `deliveryWorkflowService.ts` | `types/delivery.ts` | `components/deliveries/__tests__/WorkflowCards.test.tsx` |
| 7 | Frontend | Build Step-by-Step Delivery Progress Indicators | Visual step indicators for Send → Lock → Deliver → Confirm flow with active/inactive states. | `components/deliveries/WorkflowCards.tsx`, `components/deliveries/StepIndicator.tsx` | `useWorkflowCards.ts`, `useExpandableDelivery.ts` | `deliveryWorkflowService.ts` | `types/delivery.ts` | — |
| 8 | Frontend | Implement Driver Acceptance Card Component | Card showing delivery request details with Accept/Decline buttons. Connects to `useDriverJobs`. | `components/deliveries/DriverJobCard.tsx` | `useDriverJobs.ts` | `driverJobService.ts` | `types/delivery.ts` | — |
| 9 | Test | Workflow Cards Rendering and Interaction Tests | Verify card layout, landmark display, step progression, driver acceptance, and responsive behavior across breakpoints. | `components/deliveries/__tests__/WorkflowCards.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 10 | Docs | Document Delivery Workflow Cards Component Patterns | Create guide for workflow card structure, state management, and hook integration. | `docs/workflow-cards-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 7, 8 | ✅ 6 | ✅ 9 | ✅ 10 |

---

## Theme 3: Header – Navbar (Issues 11–15)

**Figma Reference**: [Header – Navbar](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-112)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 11 | Frontend | Build Responsive Header with Role-Based Navigation | Customer, Driver, and Admin nav items. Uses `useRequireRole` and `useAuth`. | `components/layout/Header.tsx`, `components/wallet/AccountHeader.tsx` | `useAccountMenu.ts`, `useRequireRole.ts`, `useAuth.ts` | `authService.ts` | `types/wallet.types.ts` | `components/layout/__tests__/Header.test.tsx` |
| 12 | Enhancement | Implement Dynamic Breadcrumb Routing Mapping | Parse Web3/Logistics URLs to human-readable labels. Map `/escrow/contract-id` to `Escrow > Contract`. | `components/shared/BreadcrumbNav.tsx` | `useBreadcrumbs.ts` | `breadcrumbService.ts` | — | — |
| 13 | Enhancement | Add OS-Aware Theme Toggle in Header | Respect OS `prefers-color-scheme`, save to localStorage. Prevent FOUC with blocking script. | `components/shared/ThemeToggle.tsx` | `useTheme.ts` | `themeService.ts` | — | `components/ui/__tests__/ThemeToggle.test.tsx` |
| 14 | Test | Header Navigation and Auth Flow Tests | Verify role-based nav rendering, dropdown functionality, logout redirects, and theme toggle state. | `components/layout/__tests__/Header.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 15 | Docs | Document Header and Navigation Architecture | Create guide for nav structure, role-based access, breadcrumb mapping, and theme persistence. | `docs/header-nav-architecture.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 11 | ✅ 12, 13 | ✅ 14 | ✅ 15 |

---

## Theme 4: Login Page (Issues 16–19)

**Figma Reference**: [Login Page](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=j0tZfGASSvOL8oxc-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 16 | Frontend | Build Login Form with Email/Password Authentication | React Hook Form with Zod validation. JWT token storage. Redirect on success. | `components/auth/LoginForm.tsx` | `useLogin.ts` | `authService.ts` | — | `components/auth/__tests__/LoginForm.test.tsx` |
| 17 | Frontend | Implement OAuth Login with Stellar Wallet Connect | Freighter wallet integration. `useWallet` hook for authentication flow. | `components/auth/OAuthButtons.tsx` | `useWallet.ts`, `useLogin.ts` | `walletService.ts` | `types/wallet.types.ts` | — |
| 18 | Enhancement | Add Remember Me and Password Reset Features | Session persistence with localStorage. Password reset via `sessionService`. | `components/auth/LoginForm.tsx` | `useLogin.ts` | `sessionService.ts` | — | — |
| 19 | Test | Login Form Validation and Submission Tests | Test valid/invalid inputs, wallet connection, error handling, and redirect logic. | `components/auth/__tests__/LoginForm.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 16, 17 | ✅ 18 | ✅ 19 | — |

---

## Theme 5: Register Page (Issues 20–23)

**Figma Reference**: [Register Page](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=j0tZfGASSvOL8oxc-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 20 | Frontend | Build Multi-Role Registration Form | Customer/Driver/Admin role selection with role-specific fields. | `components/auth/RegisterForm.tsx` | `useRegistration.ts`, `useAuth.ts` | `registrationService.ts` | `types/delivery.ts` | `features/auth/__tests__/Registration.test.tsx` |
| 21 | Frontend | Implement Driver Registration with KYC Upload | KYC document upload. `useKycUpload` hook. | `components/forms/KYCUploadForm.tsx` | `useKycUpload.ts` | `kycService.ts`, `uploadService.ts` | — | — |
| 22 | Enhancement | Add Address Autocomplete and Geocoding | `useAddressAutocomplete` hook. `places.ts` for geocoding. | `components/forms/AddressAutocomplete.tsx` | `useAddressAutocomplete.ts` | `places.ts`, `geofenceService.ts` | `types/geofence.ts` | — |
| 23 | Test | Registration Form Validation and KYC Tests | Test role-specific validation, KYC upload flow, and address autocomplete. | `features/auth/__tests__/Registration.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 20, 21 | ✅ 22 | ✅ 23 | — |

---

## Theme 6: Footer (Issues 24–27)

**Figma Reference**: [Footer](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=j0tZfGASSvOL8oxc-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 24 | Frontend | Build Footer with Navigation Links and Social Media | Responsive footer with links, social icons, and newsletter signup. | `components/layout/Footer.tsx` | `useFooter.ts` | `footerService.ts` | — | `components/layout/__tests__/Footer.test.tsx` |
| 25 | Frontend | Implement Footer Legal and Compliance Section | MIT License link, Privacy Policy, Terms of Service. | `components/layout/Footer.tsx` | `useFooter.ts` | — | — | — |
| 26 | Enhancement | Add Footer Contact and Support Links | Contact Us page link, FAQ link, support email. | `components/footer/FooterLinks.tsx` | `useFooter.ts` | `contactService.ts` | — | — |
| 27 | Test | Footer Component Rendering and Link Tests | Verify all links render, responsive layout, social icon rendering. | `components/layout/__tests__/Footer.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 24, 25 | ✅ 26 | ✅ 27 | — |

---

## Theme 7: Dashboard Overview (Issues 28–32)

**Figma Reference**: [Dashboard Overview](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 28 | Frontend | Build Admin Dashboard with Key Metrics Overview | Total deliveries, revenue, active drivers, pending escrows. Uses `useAdminDashboard`. | `components/dashboard/Statistics.tsx` | `useAdminDashboard.ts`, `useDeliveries.ts` | `adminService.ts, `deliveries.service.ts` | `types/delivery.ts, `types/transaction.ts` | `components/dashboard/__tests__/Statistics.test.tsx` |
| 29 | Frontend | Implement Customer Dashboard with Active Deliveries | Table view of active/past deliveries. `useDeliveries` hook. | `components/dashboard/RecentDeliveries.tsx` | `useDeliveries.ts, `useJobFilters.ts` | `deliveries.service.ts` | `types/delivery.ts, `types/filters.ts` | — |
| 30 | Enhancement | Fix Statistics Section Skeleton Loader Cumulative Layout Shift | Set strict min-height on skeleton wrappers. Lighthouse CLS = 0.00. | `components/dashboard/Statistics.tsx` | `useAdminDashboard.ts` | — | — | `components/dashboard/__tests__/Statistics.test.tsx` |
| 31 | Test | Dashboard Metrics and Statistics Rendering Tests | Verify metric cards render with API data, skeleton states, and responsive layout. | `components/dashboard/__tests__/Statistics.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 32 | Docs | Document Dashboard Architecture and Widget System | Create guide for dashboard layout, widget composition, and API integration patterns. | `docs/dashboard-architecture.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 28, 29 | ✅ 30 | ✅ 31 | ✅ 32 |

---

## Theme 8: Customer Active Deliveries (Issues 33–37)

**Figma Reference**: [Customer Active Deliveries](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 33 | Frontend | Build Delivery List with Table, List, and Grid Views | Toggle views with `useTablePagination`. `deliveries.service.ts` for data. | `components/deliveries/DeliveryList.tsx` | `useDeliveries.ts`, `useJobFilters.ts, `useTablePagination.ts` | `deliveries.service.ts` | `types/delivery.ts, `types/filters.ts` | `components/deliveries/__tests__/DeliveryList.test.tsx` |
| 34 | Enhancement | Implement DOM Virtualization for Enterprise Fleet Table | `@tanstack/react-virtual` for 1,000+ rows. 60fps scrolling. Sticky headers. | `components/fleet/EnterpriseDashboard.tsx` | `useDeliveries.ts`, `useTablePagination.ts` | `deliveries.service.ts` | `types/fleet.ts` | `components/fleet/__tests__/EnterpriseDashboard.test.tsx` |
| 35 | Frontend | Build Delivery Filtering and Sorting Controls | Filter by status, date, driver. Sort by cost, ETA. | `components/deliveries/FilterBar.tsx` | `useJobFilters.ts`, `useTablePagination.ts` | `deliveries.service.ts` | `types/filters.ts` | — |
| 36 | Test | Delivery List View Rendering and Interaction Tests | Verify table/list/grid toggle, pagination, filtering, sorting, and virtualization. | `components/deliveries/__tests__/DeliveryList.test.tsx`, `components/fleet/__tests__/EnterpriseDashboard.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 37 | Docs | Document Delivery List and View Architecture | Create guide for multi-view delivery listing, filtering patterns, and virtualization. | `docs/delivery-list-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 33, 35 | ✅ 34 | ✅ 36 | ✅ 37 |

---

## Theme 9: New Delivery – Sender & Receiver Details (Issues 38–42)

**Figma Reference**: [New Delivery – Sender & Receiver Details](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 38 | Frontend | Build Sender & Receiver Details Form Step | React Hook Form with Zod validation. Pickup/destination fields. | `components/forms/DeliveryForm.tsx` | `useCreateDelivery.ts`, `useAddressAutocomplete.ts` | `deliveries.service.ts` | `types/delivery.ts` | `components/forms/__tests__/DeliveryForm.test.tsx` |
| 39 | Enhancement | Implement Address Autocomplete with Google Places API | `useAddressAutocomplete` hook. `places.ts` for geocoding. | `components/forms/AddressAutocomplete.tsx` | `useAddressAutocomplete.ts` | `places.ts`, `geofenceService.ts` | `types/geofence.ts` | — |
| 40 | Enhancement | Add Pickup and Destination Map Preview | `react-leaflet` map integration. Show pickup/destination pins. | `components/forms/LocationMap.tsx` | `useDriverLocations.ts, `useCreateDelivery.ts` | `driverJobService.ts, `trackingService.ts` | `types/geofence.ts` | — |
| 41 | Test | Delivery Form Step Validation and Submission Tests | Test form validation, step progression, API integration, and error handling. | `components/forms/__tests__/DeliveryForm.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 42 | Docs | Document Delivery Creation Form Architecture | Create guide for multi-step delivery form, address autocomplete, and map integration. | `docs/delivery-form-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 38 | ✅ 39, 40 | ✅ 41 | ✅ 42 |

---

## Theme 10: New Delivery – Cargo Type & Dimensions (Issues 43–46)

**Figma Reference**: [New Delivery – Cargo Type & Dimensions](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 43 | Frontend | Build Cargo Type and Package Dimensions Form Step | Weight, dimensions, cargo type dropdown with conditional fields. | `components/forms/CargoDetailsForm.tsx` | `useCreateDelivery.ts`, `useFormValidation.ts` | `deliveries.service.ts` | `types/delivery.ts` | `components/forms/__tests__/CargoDetailsForm.test.tsx` |
| 44 | Enhancement | Implement Cargo Insurance & Liability Protection Selection | Insurance tier selection with `insuranceService.ts` pricing. | `components/forms/InsuranceSelect.tsx` | `useCreateDelivery.ts` | `insuranceService.ts` | `types/insurance.ts` | — |
| 45 | Frontend | Add Delivery Schedule and Time Window Selector | Date/time picker for scheduled delivery. | `components/forms/SchedulePicker.tsx` | `useCreateDelivery.ts` | `deliveries.service.ts` | — | — |
| 46 | Test | Cargo Details Form and Validation Tests | Test all cargo type fields, insurance selection, and conditional rendering. | `components/forms/__tests__/CargoDetailsForm.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 43, 45 | ✅ 44 | ✅ 46 | — |

---

## Theme 11: Live Currency Converter & Exchange Rates (Issues 47–51)

**Figma Reference**: [Live Currency Converter & Exchange Rates](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 47 | Frontend | Build Live Currency Converter Widget | NGN ↔ XLM real-time conversion. `fxService` for rates. | `components/escrow/CurrencyConverter.tsx` | `useCurrencyConversion.ts, `useLocalizedFiatPreview.ts` | `fxService.ts, `currencyRateService.ts` | `types/fee.ts` | `services/__tests__/currencyConversion.test.ts` |
| 48 | Enhancement | Implement Localized Fiat-to-XLM Preview in Escrow Payment Lock | Display real-time NGN/USD below XLM total with tooltip. | `components/escrow/PaymentLock.tsx` | `useLocalizedFiatPreview.ts, `useFiatXlmSlippage.ts` | `fiatXlmSlippageService.ts, `fxService.ts` | `types/escrow.ts` | `components/escrow/__tests__/FiatXlmPreview.test.tsx` |
| 49 | Enhancement | Add Cross-Border Slippage Warning on Fiat-to-XLM Conversions | >2% warning, >5% critical with checkbox acknowledgment. | `components/escrow/FiatXlmPreview.tsx` | `useFiatXlmSlippage.ts` | `fiatXlmSlippageService.ts` | `types/fee.ts` | `services/__tests__/fiatXlmSlippageService.test.ts` |
| 50 | Test | Currency Conversion and Rate Display Tests | Verify conversion accuracy, widget rendering, rate update intervals. | `services/__tests__/currencyConversion.test.ts`, `components/escrow/__tests__/CurrencyConverter.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 51 | Docs | Document Currency Conversion and Slippage Service Architecture | Create guide for FX rate tracking, slippage calculation, and chart integration. | `docs/currency-slippage-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 47 | ✅ 48, 49 | ✅ 50 | ✅ 51 |

---

## Theme 12: Global Unified Search (Issues 52–55)

**Figma Reference**: [Global Unified Search](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 52 | Frontend | Build Global Unified Search Bar | Search across deliveries, drivers, transactions. Cmd+K shortcut. | `components/shared/CommandPalette.tsx` | `useCommandPalette.ts`, `useGlobalSearch.ts, `useDebounce.ts` | `commandPaletteService.ts, `globalSearchService.ts` | — | `components/ui/__tests__/CommandPalette.test.tsx` |
| 53 | Enhancement | Implement Search Results with Filter Categories | Categorized results. `globalSearchService.ts`. | `components/search/SearchResults.tsx` | `useGlobalSearch.ts` | `globalSearchService.ts` | `types/delivery.ts` | — |
| 54 | Enhancement | Add Search History and Recent Queries | `localStorage` for search history. `useCommandPalette` for persistence. | `components/search/SearchHistory.tsx` | `useCommandPalette.ts` | — | — | — |
| 55 | Test | Command Palette and Search Navigation Tests | Verify keyboard triggers, query filtering, Escape to unmount. | `components/ui/__tests__/CommandPalette.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 52 | ✅ 53, 54 | ✅ 55 | — |

---

## Theme 13: Fleet & Partner Network (Issues 56–60)

**Figma Reference**: [Fleet & Partner Network](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 56 | Frontend | Build Fleet & Partner Network Page | List of partner fleets and drivers. `fleetService.ts`. | `components/fleet/EnterpriseDashboard.tsx` | `useFleet.ts, `useDriverJobs.ts` | `fleetService.ts, `driverJobService.ts` | `types/fleet.ts` | `components/fleet/__tests__/EnterpriseDashboard.test.tsx` |
| 57 | Enhancement | Implement Driver Reputation Tokenized Score Integration | On-chain Soroban reputation score. `reputationService.ts`. | `components/fleet/DriverReputation.tsx` | `useDriverReputation.ts` | `reputationService.ts` | `types/fleet.ts` | `components/fleet/__tests__/DriverReputation.test.tsx` |
| 58 | Frontend | Implement Driver Profile Cards with Rating System | Star ratings, on-chain scores, delivery history. | `components/fleet/DriverProfileCard.tsx` | `useDriverReputation.ts`, `useDriverJobs.ts` | `reputationService.ts` | `types/fleet.ts` | — |
| 59 | Test | Fleet Dashboard and Driver Reputation Tests | Verify fleet table rendering, reputation display, driver profile cards. | `components/fleet/__tests__/EnterpriseDashboard.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 60 | Docs | Document Fleet and Driver Management Architecture | Create guide for fleet listing, driver reputation, and profile cards. | `docs/fleet-management-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 56, 58 | ✅ 57 | ✅ 59 | ✅ 60 |

---

## Theme 14: Fleet Manager Vehicle Tracking (Issues 61–64)

**Figma Reference**: [Fleet Manager Vehicle Tracking](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 61 | Frontend | Build Live Map View with Driver Markers | Leaflet map showing real-time driver positions. `useDriverLocations`. | `components/fleet/FleetMap.tsx` | `useDriverLocations.ts, `useLiveUpdates.ts` | `driverJobService.ts, `iotDashboardService.ts` | `types/geofence.ts` | `components/fleet/__tests__/FleetMap.test.tsx` |
| 62 | Enhancement | Implement Geofence Boundary Visualization | Draw geofence zones on map. Alert on boundary breach. | `components/fleet/GeofenceMap.tsx` | `useDriverLocations.ts`, `useGeofence.ts` | `geofenceService.ts` | `types/geofence.ts` | — |
| 63 | Enhancement | Add IoT Sensor Data Panel for Fleet Vehicles | Temperature, humidity, shock sensors. `iotDashboardService.ts`. | `components/fleet/IoTDataPanel.tsx` | `useIoTDashboard.ts` | `iotDashboardService.ts` | `types/geofence.ts` | — |
| 64 | Test | Fleet Map and Geofence Visualization Tests | Verify map rendering, marker positioning, geofence drawing. | `components/fleet/__tests__/FleetMap.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 61 | ✅ 62, 63 | ✅ 64 | — |

---

## Theme 15: Escrow Payment Checkout (Issues 65–69)

**Figma Reference**: [Escrow Payment Checkout](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 65 | Frontend | Build Escrow Payment Lock Interface | Display total cost, lock button, confirmation modal. `useEscrowLock`. | `components/escrow/EscrowLock.tsx` | `useEscrowLock.ts` | `escrowService.ts` | `types/escrow.ts` | `features/escrow/components/__tests__/EscrowLock.test.tsx` |
| 66 | Enhancement | Implement Multi-Signature Escrow Release UI | Two-of-two signature threshold. `useEscrowRelease`. | `components/escrow/PayoutUI.tsx` | `useEscrowRelease.ts`, `useMultiSigApprovals.ts` | `escrowService.ts` | `types/escrow.ts` | `__tests__/components/escrow/PayoutUI.test.tsx` |
| 67 | Frontend | Build Escrow Payout Confirmation and Success States | Success/error states, transaction hash display. `useEscrowPayout`. | `components/escrow/PayoutConfirmation.tsx` | `useEscrowPayout.ts` | `escrowService.ts` | `types/escrow.ts` | — |
| 68 | Test | Escrow Release and Payout UI Multi-Signature Tests | Mock 1-of-2 and 2-of-2 states. Verify button logic. | `__tests__/components/escrow/PayoutUI.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 69 | Docs | Document Escrow Payment Flow Architecture | Create guide for escrow lock, payout, release, and multi-sig patterns. | `docs/escrow-payment-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 65, 67 | ✅ 66 | ✅ 68 | ✅ 69 |

---

## Theme 16: Driver Job Marketplace (Issues 70–73)

**Figma Reference**: [Driver Job Marketplace](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 70 | Frontend | Build Driver Job Marketplace with Advanced Search | Filterable job list. `useDriverJobs`. `driverJobService.ts`. | `components/deliveries/DriverJobCard.tsx` | `useDriverJobs.ts`, `useJobFilters.ts` | `driverJobService.ts` | `types/delivery.ts` | `features/driver/__tests__/JobMarketplace.test.tsx` |
| 71 | Enhancement | Implement Driver Job Application and Acceptance Flow | Accept/decline buttons. Toast notifications on action. | `components/deliveries/DriverJobCard.tsx` | `useDriverJobs.ts` | `driverJobService.ts` | — | — |
| 72 | Enhancement | Add Driver Earnings and Payout History Dashboard | `transactionHistoryService.ts`. Chart of earnings. | `components/driver/EarningsDashboard.tsx` | `useTransactionExport.ts` | `transactionHistoryService.ts` | `types/transaction.ts` | — |
| 73 | Test | Driver Job Marketplace Filtering and Application Tests | Verify job listing, filtering, application flow, acceptance logic. | `features/driver/__tests__/JobMarketplace.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 70 | ✅ 71, 72 | ✅ 73 | — |

---

## Theme 17: Wholesale & Retail Bulk Shipment Import (Issues 74–78)

**Figma Reference**: [Wholesale & Retail Bulk Shipment Import](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 74 | Frontend | Build Bulk Shipment Import System with CSV Upload | CSV file upload with `csvParser` and `csvExport` lib. | `components/forms/BulkShipmentForm.tsx` | `useExportData.ts`, `useImportData.ts` | `exportDataService.ts` | `types/delivery.ts` | `__tests__/lib/csvExport.test.ts` |
| 75 | Enhancement | Implement Excel/PDF Document Upload for Shipment Details | `uploadService.ts`. File validation. Progress indicators. | `components/forms/BulkDocumentUpload.tsx` | `useFileUpload.ts` | `uploadService.ts` | — | — |
| 76 | Enhancement | Add Bulk Shipment Validation and Error Reporting | Validate all rows before import. Display error summary. | `components/deliveries/BulkImportTable.tsx` | `useImportData.ts` | `deliveries.service.ts` | `types/delivery.ts` | — |
| 77 | Test | Bulk Import and CSV Upload Tests | Verify CSV parsing, validation, error handling, and import flow. | `__tests__/lib/csvExport.test.ts`, `__tests__/lib/csvParser.test.ts` | `Jest` | — | — | — |
| 78 | Docs | Document Bulk Shipment Import Architecture | Create guide for CSV import, document upload, and batch pricing. | `docs/bulk-import-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 74 | ✅ 75, 76 | ✅ 77 | ✅ 78 |

---

## Theme 18: View Estimated Delivery Date & Route Progress (Issues 79–83)

**Figma Reference**: [View Estimated Delivery Date & Route Progress](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 79 | Frontend | Build Estimated Delivery Date Display with Route Progress | Map and timeline showing route with ETA calculation. | `components/shipments/RouteProgress.tsx` | `useTrackingRoute.ts`, `useStatusTimeline.ts` | `trackingService.ts` | `types/tracking.ts` | `features/shipments/__tests__/ShipmentTracking.test.tsx` |
| 80 | Frontend | Implement Shipment Status Timeline with Real-Time Updates | Status steps with WebSocket updates. | `components/shipments/DeliveryTimeline.tsx` | `useLiveDeliveryStatus.ts, `useStatusTimeline.ts` | `trackingService.ts, `shipmentService.ts` | `types/status.ts` | — |
| 81 | Enhancement | Add Shipment Handoff QR Code for Driver-Customer Verification | `useHandoffQR` hook. Offline-capable QR generation. | `components/shipments/HandoffQR.tsx` | `useHandoffQR.ts, `useOfflineQr.ts` | `qrScannerService.ts, `shipmentHandoffService.ts` | — | — |
| 82 | Test | Shipment Tracking and Timeline Rendering Tests | Verify timeline rendering, status updates, route display, QR generation. | `features/shipments/__tests__/ShipmentTracking.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 83 | Docs | Document Shipment Tracking and Route Progress Architecture | Create guide for timeline display, QR handoff, blockchain verification. | `docs/shipment-tracking-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 79, 80 | ✅ 81 | ✅ 82 | ✅ 83 |

---

## Theme 19: Receipt Verification Page (Issues 84–87)

**Figma Reference**: [Receipt Verification Page](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=LhlzEJ7fINwVaUuh-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 84 | Frontend | Build Smart Contract Receipt Verification Page | Verify delivery on Soroban. Display contract state. | `components/shipments/ReceiptVerification.tsx` | `useContractMockup.ts, `useProofUpload.ts` | `contractMockupService.ts, `proofService.ts` | `types/shipment.ts` | `components/shipments/__tests__/ReceiptVerification.test.tsx` |
| 85 | Frontend | Implement Proof of Delivery Upload and Display | Image/PDF upload. Thumbnail preview. | `components/deliveries/ImageCapture.tsx` | `useProofUpload.ts, `useFileUpload.ts` | `proofService.ts, `uploadService.ts` | `types/shipment.ts` | — |
| 86 | Test | Receipt Verification and Smart Contract Tests | Verify contract data fetching, proof upload, on-chain verification flow. | `components/shipments/__tests__/ReceiptVerification.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 87 | Docs | Document Receipt Verification and Blockchain Integration | Create guide for smart contract verification, proof upload, disputes. | `docs/receipt-verification-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 84, 85 | — | ✅ 86 | ✅ 87 |

---

## Theme 20: Activity Center (Issues 88–91)

**Figma Reference**: [Activity Center](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 88 | Frontend | Build Activity Center with Real-Time Event Feed | Live event feed for all delivery actions. `useLiveUpdates`. | `components/support/ActivityCenter.tsx` | `useLiveUpdates.ts`, `useNotifications.ts` | `notificationService.ts` | `types/transaction.ts` | `components/support/__tests__/ActivityCenter.test.tsx` |
| 89 | Enhancement | Add Activity Filtering and Category Tagging | Filter by delivery, payment, system events. | `components/support/ActivityCenter.tsx` | `useNotifications.ts` | `notificationService.ts` | — | — |
| 90 | Frontend | Implement Notification History and Read Status | Mark notifications as read. Persistent history. | `components/support/NotificationList.tsx` | `useNotifications.ts` | `notificationService.ts` | — | — |
| 91 | Test | Activity Center Rendering and Interaction Tests | Verify event feed, filtering, notification marking. | `components/support/__tests__/ActivityCenter.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 88, 90 | ✅ 89 | ✅ 91 | — |

---

## Theme 21: Cross-Border Transaction History (Issues 92–95)

**Figma Reference**: [Cross-Border Transaction History](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 92 | Frontend | Build Cross-Border Transaction History Table | Table view of all cross-border transactions. `transactionHistoryService.ts`. | `components/transactions/TransactionHistory.tsx` | `useTransactionExport.ts` | `transactionHistoryService.ts` | `types/transactionHistory.ts` | `components/transactions/__tests__/TransactionHistory.test.tsx` |
| 93 | Enhancement | Implement Currency Conversion Summary for Transactions | Show original and converted amounts with FX rate. | `components/transactions/CurrencySummary.tsx` | `useCurrencyConversion.ts` | `currencyRateService.ts` | `types/transactionHistory.ts` | — |
| 94 | Frontend | Add Export and Download Functionality for Transaction Data | CSV/Excel export. `exportDataService.ts`. | `components/transactions/ExportButton.tsx` | `useTransactionExport.ts` | `exportDataService.ts` | — | — |
| 95 | Test | Transaction History Rendering and Export Tests | Verify table rendering, currency conversion, and export functionality. | `components/transactions/__tests__/TransactionHistory.test.tsx` | `Jest, React Testing Library` | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 92, 94 | ✅ 93 | ✅ 95 | — |

---

## Theme 22: Statistics & Choose Plan (Issues 96–100)

**Figma Reference**: [Statistics & Choose Plan](https://www.figma.com/design/2kP82C0Z8z0X3CncLQmfhB/Stellar-Project-Fig?node-id=227-2&p=f&t=zOzuCCgfIl3q2L5F-0)

| Issue # | Type | Title | Requirements | Components | Hooks | Services | Types | Tests |
|---|---|---|---|---|---|---|---|---|
| 96 | Frontend | Build Statistics Section with Key Metrics | Platform statistics with animated counters. `useHeroStats`. | `components/dashboard/Statistics.tsx` | `useHeroStats.ts` | `adminService.ts` | `types/valueProp.ts` | `components/dashboard/__tests__/Statistics.test.tsx` |
| 97 | Enhancement | Implement Pricing Tier Cards with Comparison | Feature comparison across pricing tiers. `pricingService.ts`. | `components/pricing/PricingCards.tsx` | `usePricingCards.ts`, `usePricingComparison.ts` | `pricingService.ts` | `types/pricing.ts` | — |
| 98 | Enhancement | Add Dark Mode Statistics and Plan Card Styling | Consistent dark mode theming for statistics and pricing. | `components/dashboard/Statistics.tsx`, `components/pricing/PricingCards.tsx` | `useTheme.ts` | `themeService.ts` | — | — |
| 99 | Test | Statistics and Pricing Card Rendering Tests | Verify metrics, pricing tier comparison, and dark mode rendering. | `components/dashboard/__tests__/Statistics.test.tsx` | `Jest, React Testing Library` | — | — | — |
| 100 | Docs | Document Statistics and Pricing Page Architecture | Create guide for metrics display, pricing tiers, and dark mode patterns. | `docs/statistics-pricing-guide.md` | — | — | — | — |

**Checklist**:

| Frontend | Enhancement | Test | Docs |
|---|---|---|---|
| ✅ 96 | ✅ 97, 98 | ✅ 99 | ✅ 100 |

---

## Contribution Workflow

### For Each Issue:

1. **Assignment**: Comment on the issue to request assignment
2. **Branch**: `git checkout -b [type]/[design-area]-[issue-number]`
3. **Implementation**: Follow Component → Hook → Service pattern
4. **Testing**: Write unit tests with Jest + React Testing Library
5. **Documentation**: Update relevant docs files
6. **PR**: `Closes #[issue_id]` in description with work summary
7. **Screenshot**: Include UI screenshots in PR

### Issue Types:
- **Frontend**: New UI components, page implementations
- **Enhancement**: Feature additions, bug fixes, performance improvements
- **Test**: Unit tests, integration tests, e2e tests
- **Docs**: Implementation guides, API documentation, architecture docs

### Strict Layered Architecture Pattern:

``
┌─────────────────────────────────────────┐
│   Component (UI Layer)                  │
│   - React JSX                           │
│   - TailwindCSS styling                 │
│   - Props and state rendering           │
└──────────────┬──────────────────────────┘
               │ uses
┌──────────────▼──────────────────────────┐
│   Hook (State Management Layer)         │
│   - React hooks                         │
│   - React Query integration              │
│   - Lifecycle management                │
└──────────────┬──────────────────────────┘
               │ calls
┌──────────────▼──────────────────────────┐
│   Service (Data Layer)                  │
│   - API calls (Axios)                   │
│   - Soroban/Stellar RPC                 │
│   - Backend integration                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Types (TypeScript Definitions)        │
│   - interfaces                           │
│   - type aliases                         │
└─────────────────────────────────────────┘
``

---

## Technology Stack Reference

| Category | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5.0 |
| Styling | TailwindCSS 4.2 |
| State Management | React Query, Zustand |
| Forms | React Hook Form + Zod |
| HTTP Client | Axios |
| Blockchain | Stellar SDK, Soroban RPC |
| Testing | Jest, React Testing Library |
| Maps | React Leaflet |
| Charts | Recharts |
| QR | qrcode.react |
| Real-time | Socket.io-client |
| Notifications | Sonner |
| Auth | JWT |
| Animation | Framer Motion |
| Virtualization | @tanstack/react-virtual |
| Image Compression | browser-image-compression |

---

## Checklist for Contributors

- [ ] Issue assigned (comment to request)
- [ ] Branch created with proper naming convention
- [ ] Component → Hook → Service pattern followed
- [ ] Data from backend API (no inline mocks)
- [ ] TypeScript types defined for all interfaces
- [ ] Unit tests written and passing
- [ ] Dark mode support implemented
- [ ] Responsive design tested (mobile 375px + desktop)
- [ ] Accessibility compliant (WCAG AA, ARIA labels)
- [ ] ESLint and TypeScript checks pass
- [ ] Screenshots included in PR
- [ ] `Closes #[issue_id]` in PR description
- [ ] PR complies with [CONTRIBUTING.md](../CONTRIBUTING.md)
- [ ] No AI-generated PR submissions

---

*This implementation index maps 100 issues across 22 Figma UI/UX (Light Mode) design areas for the SwiftChain Frontend project. All issues follow the strict layered architecture pattern and require backend API integration.*
