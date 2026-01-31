// Cypress Support File

// Add custom command to window
declare global {
  namespace Cypress {
    interface Chainable {
      enableSimulator(): Chainable<void>;
    }
  }
}

Cypress.Commands.add('enableSimulator', () => {
  cy.window().then((win) => {
    // @ts-ignore
    win.BOKS_SIMULATOR_ENABLED = true;
    console.log('✅ Cypress: Simulator Enabled');
  });
});
