/**
 * E2E Tests: Role-Based Route Protection Middleware
 *
 * Verifies that the role-based access control middleware correctly:
 * - Blocks users with wrong roles from accessing protected routes
 * - Redirects to appropriate destinations based on auth state
 * - Allows authorized users to access their role-specific routes
 * - Prevents regressions by ensuring users can still access appropriate routes
 *
 * Issue: #485
 */

describe('E2E: Role-Based Route Protection', () => {
  /**
   * Test 1: NEGATIVE TEST - Customer role blocked from Fleet Manager route
   * Verifies that a Customer user cannot access /dashboard/fleet and is redirected to /
   */
  describe('Customer role access control', () => {
    beforeEach(() => {
      // Mock external API dependencies
      cy.intercept('GET', '**/fleet/drivers', {
        statusCode: 200,
        body: {
          drivers: [],
          summary: { total_drivers: 0, active_drivers: 0, total_deliveries: 0 }
        }
      }).as('getFleetDrivers');

      cy.intercept('GET', '**/api/fleet/drivers', {
        statusCode: 200,
        body: {
          drivers: [],
          summary: { total_drivers: 0, active_drivers: 0, total_deliveries: 0 }
        }
      }).as('getFleetDriversApi');

      // Seed auth store with Customer role user via onBeforeLoad
      cy.visit('/dashboard/fleet', {
        onBeforeLoad(win) {
          // Set auth token to pass middleware check
          win.localStorage.setItem('authToken', 'mock-customer-jwt-token');
          
          // Access Zustand store and set Customer role user
          // We need to wait for the store to be available
          cy.wrap(null).then(() => {
            // Try to access the store if it's globally available
            if (typeof (win as any).useAuthStore !== 'undefined') {
              const useAuthStore = (win as any).useAuthStore;
              useAuthStore.setState({
                user: {
                  id: 'customer-1',
                  email: 'customer@example.com',
                  role: 'Customer'
                },
                isAuthenticated: true
              });
            }
          });
        }
      });
    });

    it('should redirect Customer user from /dashboard/fleet to / (homepage)', () => {
      // Customer should be redirected to home page
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      
      // Fleet Dashboard content should NOT be rendered
      cy.contains('Fleet Dashboard').should('not.exist');
      cy.get('[data-testid="job-card"]').should('not.exist');
    });

    it('should not display Fleet Dashboard content when Customer attempts direct URL access', () => {
      // Even with direct URL navigation, the redirect should happen
      cy.url().should('not.include', '/fleet');
      cy.contains('Fleet Dashboard').should('not.exist');
    });
  });

  /**
   * Test 2: POSITIVE TEST - Fleet Operator can access Fleet Manager route
   * Verifies that a Fleet Operator user CAN access /dashboard/fleet successfully
   */
  describe('Fleet Operator role access control', () => {
    beforeEach(() => {
      // Mock fleet drivers API with sample data
      cy.intercept('GET', '**/fleet/drivers', {
        statusCode: 200,
        body: {
          drivers: [
            {
              id: 'driver-1',
              name: 'John Driver',
              email: 'john@example.com',
              phone: '+234801234567',
              status: 'active',
              rating: 4.8,
              completedJobs: 125,
              location: { lat: 6.5244, lng: 3.3792 }
            }
          ],
          summary: {
            total_drivers: 1,
            active_drivers: 1,
            total_deliveries: 125
          }
        }
      }).as('getFleetDrivers');

      cy.intercept('GET', '**/api/fleet/drivers', {
        statusCode: 200,
        body: {
          drivers: [
            {
              id: 'driver-1',
              name: 'John Driver',
              email: 'john@example.com',
              phone: '+234801234567',
              status: 'active',
              rating: 4.8,
              completedJobs: 125,
              location: { lat: 6.5244, lng: 3.3792 }
            }
          ],
          summary: {
            total_drivers: 1,
            active_drivers: 1,
            total_deliveries: 125
          }
        }
      }).as('getFleetDriversApi');

      // Seed auth store with Fleet Operator role user
      cy.visit('/dashboard/fleet', {
        onBeforeLoad(win) {
          // Set auth token
          win.localStorage.setItem('authToken', 'mock-fleet-operator-jwt-token');
          
          // Set Fleet Operator user in auth store
          if (typeof (win as any).useAuthStore !== 'undefined') {
            const useAuthStore = (win as any).useAuthStore;
            useAuthStore.setState({
              user: {
                id: 'fleet-operator-1',
                email: 'fleet@example.com',
                role: 'Fleet Operator'
              },
              isAuthenticated: true
            });
          }
        }
      });
    });

    it('should allow Fleet Operator to access /dashboard/fleet successfully', () => {
      // URL should remain at /dashboard/fleet (no redirect)
      cy.url().should('include', '/fleet');
      
      // Fleet Dashboard page should render
      cy.contains('Fleet Dashboard').should('be.visible');
    });

    it('should display fleet data for authorized Fleet Operator', () => {
      // Wait for drivers API call to complete
      cy.wait('@getFleetDrivers').then((interception) => {
        expect(interception.response?.statusCode).to.equal(200);
      });
      
      // Fleet Dashboard content should be visible
      cy.contains('Fleet Dashboard').should('be.visible');
      cy.contains('Live view of drivers in your fleet').should('be.visible');
    });

    it('should render the refresh button and controls', () => {
      // Fleet Manager controls should be accessible
      cy.contains('button', /refresh/i).should('be.visible');
      
      // Page title and description visible
      cy.contains('Fleet Dashboard').should('be.visible');
    });
  });

  /**
   * Test 3: EDGE CASE - Unauthenticated user accessing Fleet Manager route
   * Verifies that users without authentication are redirected to login
   */
  describe('Unauthenticated user access control', () => {
    beforeEach(() => {
      // Mock login page to verify redirect
      cy.intercept('GET', '**/api/auth/user', {
        statusCode: 401,
        body: { message: 'Unauthorized' }
      }).as('getAuthUser');
    });

    it('should redirect unauthenticated user to /login when accessing /dashboard/fleet', () => {
      // Visit without setting auth token or user
      cy.visit('/dashboard/fleet', { failOnStatusCode: false });
      
      // Should be redirected to login page
      cy.url().should('include', '/login');
      
      // Login page should be visible
      cy.contains(/sign in/i).should('be.visible');
    });

    it('should not render Fleet Dashboard for unauthenticated access', () => {
      cy.visit('/dashboard/fleet', { failOnStatusCode: false });
      
      // Fleet Dashboard content should NOT be rendered
      cy.contains('Fleet Dashboard').should('not.exist');
      cy.contains('Live view of drivers in your fleet').should('not.exist');
    });
  });

  /**
   * Test 4: EDGE CASE - Admin role accessing Fleet Manager route
   * Verifies the behavior when Admin role attempts to access Fleet Operator-only route
   * Note: Admin does not have explicit Fleet Operator role, so should be blocked
   */
  describe('Admin role access to Fleet Manager route', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/fleet/drivers', {
        statusCode: 200,
        body: {
          drivers: [],
          summary: { total_drivers: 0, active_drivers: 0, total_deliveries: 0 }
        }
      }).as('getFleetDrivers');

      cy.visit('/dashboard/fleet', {
        onBeforeLoad(win) {
          // Set auth token
          win.localStorage.setItem('authToken', 'mock-admin-jwt-token');
          
          // Set Admin user (who does not have Fleet Operator role)
          if (typeof (win as any).useAuthStore !== 'undefined') {
            const useAuthStore = (win as any).useAuthStore;
            useAuthStore.setState({
              user: {
                id: 'admin-1',
                email: 'admin@example.com',
                role: 'Admin'
              },
              isAuthenticated: true
            });
          }
        }
      });
    });

    it('should block Admin user from accessing Fleet Manager route (Admin != Fleet Operator)', () => {
      // Admin should be redirected since Admin role !== Fleet Operator role
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      
      // Fleet Dashboard should not render
      cy.contains('Fleet Dashboard').should('not.exist');
    });
  });

  /**
   * Test 5: REGRESSION TEST - Customer can access customer-appropriate routes
   * Verifies that the role check doesn't over-block and correctly allows Customer access
   * to routes where Customer role is permitted
   */
  describe('Regression: Customer access to appropriate routes', () => {
    beforeEach(() => {
      // Mock deliveries API
      cy.intercept('GET', '**/api/deliveries*', {
        statusCode: 200,
        body: {
          deliveries: [
            {
              id: 'delivery-1',
              status: 'pending',
              pickupLocation: 'Lagos',
              destination: 'Abuja',
              createdAt: new Date().toISOString()
            }
          ]
        }
      }).as('getDeliveries');

      cy.visit('/dashboard/deliveries', {
        onBeforeLoad(win) {
          // Set Customer auth token
          win.localStorage.setItem('authToken', 'mock-customer-jwt-token');
          
          // Set Customer user
          if (typeof (win as any).useAuthStore !== 'undefined') {
            const useAuthStore = (win as any).useAuthStore;
            useAuthStore.setState({
              user: {
                id: 'customer-1',
                email: 'customer@example.com',
                role: 'Customer'
              },
              isAuthenticated: true
            });
          }
        }
      });
    });

    it('should allow Customer to access /dashboard/deliveries without blocking', () => {
      // Customer should NOT be redirected when accessing their own route
      cy.url().should('include', '/deliveries');
      cy.url().should('not.eq', Cypress.config().baseUrl + '/');
      
      // Deliveries page content should render (or loading state should be visible)
      // The page might show "Loading..." or actual deliveries
      cy.contains(/deliveries|loading/i).should('exist');
    });

    it('should not redirect Customer away from deliveries page', () => {
      // Verify no redirect back to homepage
      cy.url().then((url) => {
        expect(url).to.include('/deliveries');
        expect(url).to.not.equal(Cypress.config().baseUrl + '/');
      });
    });
  });

  /**
   * Test 6: REGRESSION TEST - Direct URL navigation is protected
   * Verifies that middleware/useRequireRole catches role violations regardless
   * of whether the URL was reached via link click or direct navigation
   */
  describe('Middleware protection regardless of navigation method', () => {
    beforeEach(() => {
      cy.intercept('GET', '**/fleet/drivers', {
        statusCode: 200,
        body: {
          drivers: [],
          summary: { total_drivers: 0, active_drivers: 0, total_deliveries: 0 }
        }
      }).as('getFleetDrivers');
    });

    it('should protect /dashboard/fleet via direct URL navigation with Customer role', () => {
      // Visit directly using cy.visit() - simulating direct URL bar navigation
      cy.visit('/dashboard/fleet', {
        onBeforeLoad(win) {
          win.localStorage.setItem('authToken', 'mock-customer-jwt-token');
          if (typeof (win as any).useAuthStore !== 'undefined') {
            const useAuthStore = (win as any).useAuthStore;
            useAuthStore.setState({
              user: {
                id: 'customer-1',
                email: 'customer@example.com',
                role: 'Customer'
              },
              isAuthenticated: true
            });
          }
        }
      });

      // Should be redirected away despite direct URL access
      cy.url().should('eq', Cypress.config().baseUrl + '/');
      cy.contains('Fleet Dashboard').should('not.exist');
    });

    it('should allow /dashboard/fleet direct navigation when Fleet Operator role is set', () => {
      cy.visit('/dashboard/fleet', {
        onBeforeLoad(win) {
          win.localStorage.setItem('authToken', 'mock-fleet-operator-jwt-token');
          if (typeof (win as any).useAuthStore !== 'undefined') {
            const useAuthStore = (win as any).useAuthStore;
            useAuthStore.setState({
              user: {
                id: 'fleet-operator-1',
                email: 'fleet@example.com',
                role: 'Fleet Operator'
              },
              isAuthenticated: true
            });
          }
        }
      });

      // Should NOT be redirected
      cy.url().should('include', '/fleet');
      cy.contains('Fleet Dashboard').should('be.visible');
    });
  });

  /**
   * Test 7: POSITIVE CONTROL - Verify test framework works
   * Ensures our mocking and session setup works correctly by testing
   * that Fleet Operator DOES see the page (confirming test isn't always passing/failing)
   */
  describe('Test framework verification', () => {
    it('confirms Fleet Operator session is properly seeded and page loads', () => {
      cy.intercept('GET', '**/fleet/drivers', {
        statusCode: 200,
        body: {
          drivers: [
            {
              id: 'driver-1',
              name: 'Test Driver',
              email: 'driver@example.com',
              status: 'active'
            }
          ],
          summary: {
            total_drivers: 1,
            active_drivers: 1,
            total_deliveries: 50
          }
        }
      }).as('getFleetDrivers');

      cy.visit('/dashboard/fleet', {
        onBeforeLoad(win) {
          win.localStorage.setItem('authToken', 'mock-fleet-jwt');
          if (typeof (win as any).useAuthStore !== 'undefined') {
            const useAuthStore = (win as any).useAuthStore;
            useAuthStore.setState({
              user: {
                id: 'fleet-1',
                email: 'fleet@example.com',
                role: 'Fleet Operator'
              },
              isAuthenticated: true
            });
          }
        }
      });

      // Positive control: verify the page actually loads when authorized
      cy.contains('Fleet Dashboard', { timeout: 5000 }).should('be.visible');
      cy.url().should('include', '/fleet');
    });
  });
});
