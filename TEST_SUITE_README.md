# Kindora Smart Contract - Comprehensive Testing Suite

This repository contains a comprehensive Hardhat testing suite for the Kindora (KNR) smart contract with 100% functionality coverage.

## Overview

The Kindora token is an ultra-secure charity token with the following features:
- Fixed 5% tax on DEX buys/sells (3% charity, 1% liquidity, 1% burn)
- No tax on wallet-to-wallet transfers
- Anti-whale mechanisms (2% max transaction/wallet)
- Buy cooldown (10 seconds between buys)
- Immutable after launch - trading cannot be paused, tax cannot be changed
- Charity wallet locked after trading enabled
- Fail-safe for charity transfers

## Test Suites

The testing suite is organized into 15 comprehensive categories:

### 1. Unit Tests (`Kindora.comprehensive.test.js`)
- Individual function testing
- Modifier validation
- State variable initialization
- Basic contract properties

### 2. Access Control Tests (`Kindora.comprehensive.test.js`)
- Owner-only function restrictions
- Permission validations
- Ownership management
- Unauthorized access prevention

### 3. Fee Handling Tests (`Kindora.comprehensive.test.js`)
- Fee calculation accuracy (5% total: 3% charity, 1% liquidity, 1% burn)
- Fee routing verification
- Fee exclusion mechanics
- Swap behavior validation

### 4. Liquidity Management Tests (`Kindora.comprehensive.test.js`)
- Liquidity addition through router
- LP token handling
- Auto-liquidity mechanisms
- Swap threshold triggers

### 5. Trading Logic Tests (`Kindora.comprehensive.test.js`)
- Trading enablement
- Buy/sell detection
- Pre-launch restrictions
- Trading state management

### 6. Cooldown Enforcement Tests (`Kindora.comprehensive.test.js`)
- Buy cooldown period (10 seconds)
- Cooldown bypass for excluded addresses
- Time manipulation testing
- Cooldown enable/disable

### 7. Charity Logic Tests (`Kindora.comprehensive.test.js`)
- Charity wallet management
- Charity wallet locking
- Charity transfer handling
- Pending BNB recovery
- Failed transfer handling

### 8. Limit Tests (`Kindora.comprehensive.part2.test.js`)
- Max transaction limits (2% of supply)
- Max wallet limits (2% of supply)
- Limit tightening before launch
- Limit loosening after launch
- Limit exclusions

### 9. Ownership Renouncement Tests (`Kindora.comprehensive.part2.test.js`)
- Renouncement requirements
- Contract immutability after renouncement
- Post-renouncement restrictions

### 10. Integration Tests (`Kindora.integration.test.js`)
- Complete launch sequence
- Multi-user trading scenarios
- Fee distribution workflows
- Swap threshold mechanics
- Limit management workflows
- Charity failure recovery
- Token rescue workflows

### 11. Edge Cases & Attack Vectors (`Kindora.edge.test.js`)
- Zero amount transfers
- Zero address validations
- Balance overflow/underflow prevention
- Maximum value handling
- Concurrent transaction handling
- Reentrancy protection

### 12. Gas Usage Tests (`Kindora.gas.test.js`)
- Deployment gas measurement
- Function call gas consumption
- Gas optimization validation
- Threshold comparisons

### 13. Event Emission Tests (`Kindora.events.test.js`)
- Transfer events
- Approval events
- Custom event emissions
- Event parameter validation
- Multi-event transactions

### 14. Token Rescue Functionality Tests (`Kindora.comprehensive.part2.test.js`)
- ERC20 token rescue
- Rescue restrictions (cannot rescue KNR or LP)
- Owner-only rescue
- Multi-token rescue

### 15. Mock Contract Failure Tests (`Kindora.comprehensive.part2.test.js`)
- Router failure handling
- Liquidity addition failures
- Charity wallet rejection
- Gas-heavy charity handling
- Zero ETH output handling
- Graceful degradation

## Test Files

- `test/Kindora.test.js` - Basic unit tests
- `test/Kindora.comprehensive.test.js` - Suites 1-7
- `test/Kindora.comprehensive.part2.test.js` - Suites 8-15
- `test/Kindora.integration.test.js` - Integration tests
- `test/Kindora.edge.test.js` - Edge case tests
- `test/Kindora.events.test.js` - Event emission tests
- `test/Kindora.gas.test.js` - Gas usage tests

## Mock Contracts

The test suite includes comprehensive mock contracts:

- `MockPancakeRouter` - Full router simulation with configurable behavior
- `MockPancakeFactory` - Factory with pair creation
- `MockWETH` - WETH9 implementation
- `MockCharityWallet` - Standard charity wallet
- `MockRejectingCharity` - Charity that rejects transfers
- `MockGasHeavyCharity` - Gas-intensive charity for testing limits
- `MockERC20` - Generic ERC20 for rescue testing

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run specific test suite
npm run test:integration
npm run test:edge

# Run with gas reporting
npm run test:gas

# Run coverage
npm run coverage
```

## Test Helpers

The test suite includes helper functions for common operations:

- `deployContracts()` - Deploy all necessary contracts
- `increaseTime(seconds)` - Time manipulation for cooldown testing
- `addLiquidity(tokenAmount, ethAmount)` - Add liquidity helper
- `simulateBuy(buyer, amount)` - Buy simulation
- `simulateSell(seller, amount)` - Sell simulation

## Key Testing Features

### Time Manipulation
Tests use `evm_increaseTime` and `evm_mine` to test time-dependent features like cooldowns:

```javascript
await ethers.provider.send("evm_increaseTime", [seconds]);
await ethers.provider.send("evm_mine");
```

### Event Validation
Events are thoroughly tested with parameter validation:

```javascript
await expect(kindora.transfer(addr1.address, amount))
  .to.emit(kindora, "Transfer")
  .withArgs(owner.address, addr1.address, amount);
```

### Gas Measurement
Gas usage is logged and validated against thresholds:

```javascript
const receipt = await tx.wait();
console.log("Gas used:", receipt.gasUsed.toString());
expect(receipt.gasUsed).to.be.lt(100000n);
```

### Failure Scenarios
Both positive and negative test cases are included:

```javascript
// Positive case
await expect(kindora.transfer(addr1.address, amount)).to.not.be.reverted;

// Negative case
await expect(kindora.transfer(ethers.ZeroAddress, amount))
  .to.be.revertedWith("ERC20: transfer to zero");
```

## Coverage Goals

The test suite aims for:
- **95%+ line coverage**
- **95%+ statement coverage**
- **100% function coverage**
- **90%+ branch coverage**

## Contract Security Features Tested

1. **Immutability**: Contract becomes immutable after ownership renouncement
2. **No Honeypot**: Trading cannot be disabled once enabled
3. **Tax Immutability**: Tax rates are constant and cannot be changed
4. **Charity Lock**: Charity wallet cannot be changed after trading enabled
5. **Anti-Whale**: Max transaction and wallet limits protect against dumps
6. **Cooldown**: Buy cooldown prevents sandwich attacks
7. **Fail-Safe**: Failed charity transfers don't revert transactions
8. **Token Rescue**: Allows recovery of accidentally sent tokens

## Development

### Adding New Tests

1. Create test file in `test/` directory
2. Follow naming convention: `Kindora.[category].test.js`
3. Use provided helper functions
4. Include both positive and negative test cases
5. Add gas measurements where appropriate
6. Validate all events and state changes

### Test Structure

```javascript
describe("Test Suite Name", function () {
  beforeEach(async function () {
    // Setup
  });
  
  it("Should test specific functionality", async function () {
    // Arrange
    // Act
    // Assert
  });
});
```

## Dependencies

- Hardhat: ^2.19.0
- Ethers.js: ^6.9.0
- Chai: ^4.3.10
- @nomicfoundation/hardhat-toolbox: ^4.0.0
- @openzeppelin/contracts: ^5.0.0

## License

MIT
