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
    cy.contains('Boks Web BLE').should('be.visible');
  });

  it('should connect using the simulator', () => {
    // Click the connect button (assuming there is one, or FAB)
    // Adjust selector based on actual UI
    cy.get('button[aria-label="connect"]').click();

    // Simulator has a delay, wait for connection status
    cy.contains('Connected to Boks Simulator', { timeout: 10000 }).should('be.visible');
  });

  it('should open the door via simulator', () => {
    // 1. Connect
    cy.get('button[aria-label="connect"]').click();
    cy.contains('Connected to Boks Simulator', { timeout: 10000 }).should('be.visible');

    // 2. Open Door
    cy.contains('Open Door').click();
    
    // 3. Verify Feedback
    // Simulator sends VALID_OPEN_CODE then LOG_DOOR_OPEN
    cy.contains('Door Open').should('be.visible');
    
    // 4. Verify Auto-Close (Simulator closes after 5s)
    cy.contains('Door Closed', { timeout: 8000 }).should('be.visible');
  });
});
