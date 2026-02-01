describe('Maintenance Page', () => {
  beforeEach(() => {
    // Enable simulator mode
    cy.visit('/', {
      onBeforeLoad(win) {
        // @ts-expect-error - Custom global flag
        win.BOKS_SIMULATOR_ENABLED = true;
      },
    });

    // Attempt to connect if not already
    cy.get('button[aria-label="connect"]').click();
    cy.wait(1000); // Give it a moment
  });

  it('should navigate to maintenance page and run clean master codes script', () => {
    // 1. Open Menu
    cy.get('button[aria-label="menu"]').click();

    // 2. Click Maintenance
    cy.contains('Maintenance').click();

    // 3. Verify Page Title
    cy.get('h4').contains('Maintenance').should('be.visible');

    // 4. Verify Script Card exists
    cy.contains('Clean Master Codes').should('be.visible');

    // 5. Run Script
    cy.contains('button', 'Run').click();

    // 6. Check for immediate error
    cy.get('.MuiAlert-standardError').should('not.exist');

    // 7. Verify Logs appear (Fetching count is the first step)
    cy.contains('Fetching initial code count...', { timeout: 10000 }).should('exist');

    // 8. Wait for ANY finish state
    // We check for existence first to avoid visibility issues during scroll/update
    cy.contains(/Finished|Script finished/, { timeout: 60000 }).should('exist');

    // Verify Progress 100%
    cy.contains('100%', { timeout: 10000 }).should('exist');
  });
});
