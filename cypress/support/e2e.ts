// Cypress Support File

// Add custom command to window
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      enableSimulator(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('enableSimulator', () => {
  cy.window().then((win) => {
    // @ts-expect-error - Custom simulator flag
    win.BOKS_SIMULATOR_ENABLED = true;
    console.log('✅ Cypress: Simulator Enabled');
  });
});
