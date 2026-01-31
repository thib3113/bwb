describe('Boks Basic Flow (Simulator)', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/', {
      onBeforeLoad(win) {
        // Force enable simulator BEFORE app loads
        // @ts-ignore
        win.BOKS_SIMULATOR_ENABLED = true;
      },
    });
  });

  it('should load the dashboard', () => {
    cy.contains('Boks BLE').should('be.visible');
  });

  it('should connect using the simulator', () => {
    // Check we are initially disconnected (BluetoothDisabledIcon)
    cy.get('svg[data-testid="BluetoothDisabledIcon"]').should('exist');

    // Click the connect button
    cy.get('button[aria-label="connect"]').click();

    // Wait for connection (BluetoothIcon should appear)
    cy.get('svg[data-testid="BluetoothIcon"]', { timeout: 10000 }).should('exist');
    cy.get('svg[data-testid="BluetoothDisabledIcon"]').should('not.exist');

    // Optional: Check if we received data (e.g., Codes count)
    // The simulator sends 0xC3 with counts. The dashboard updates "Codes (Total: ...)"
    cy.contains('Codes (Total:', { timeout: 10000 }).should('be.visible');
  });

  it('should attempt to open the door (Master Code Check)', () => {
    // 1. Connect
    cy.get('button[aria-label="connect"]').click();
    cy.get('svg[data-testid="BluetoothIcon"]', { timeout: 10000 }).should('exist');

    // Wait a bit for device context to settle (just in case)
    cy.wait(500);

    // 2. Click Open Door
    // Force click in case the tooltip or something interferes
    cy.get('button[aria-label="open door"]').click({ force: true });
    
    // 3. Verify Logic
    // We expect an error message because no master code is set.
    // We check for the Alert component specifically.
    cy.get('.MuiAlert-message', { timeout: 5000 }).should('exist');
    cy.get('.MuiAlert-message').should('contain', 'Master code required');
  });
});
