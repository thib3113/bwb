describe('Boks Basic Flow (Simulator)', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/', {
      onBeforeLoad(win) {
        // Force enable simulator BEFORE app loads
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

  it('should open the door via simulator (Auto-Provisioned)', () => {
    // 1. Connect
    cy.get('button[aria-label="connect"]').click();
    cy.get('svg[data-testid="BluetoothIcon"]', { timeout: 10000 }).should('exist');

    // Wait a bit for device context to settle
    cy.wait(500);

    // 2. Click Open Door
    // Force click in case the tooltip or something interferes
    cy.get('button[aria-label="open door"]').click({ force: true });

    // 3. Verify Feedback
    // Since we auto-provisioned the PIN code, the door should open successfully
    // Look for "Opening..." or "Door closed"
    // (Wait for toast or UI update)
    cy.contains('Opening door...', { timeout: 5000 }).should('exist');

    // 4. Wait for close (UI might just remove "Opening..." or show "Door Open" then "Door Closed")
    // Let's just check that "Opening..." eventually disappears
    cy.contains('Opening door...', { timeout: 15000 }).should('not.exist');
    // And that we are back to a stable state (Open Door button enabled again)
    cy.get('button[aria-label="open door"]').should('be.enabled');
  });
});
