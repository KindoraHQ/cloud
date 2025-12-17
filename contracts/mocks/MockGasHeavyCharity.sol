// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MockGasHeavyCharity
 * @dev This contract simulates a gas-heavy operation in its receive function.
 */
contract MockGasHeavyCharity {
    event DonationReceived(address indexed donor, uint256 amount);

    /**
     * @dev This fallback function is called when the contract receives Ether.
     * Simulates a gas-heavy operation by performing a loop.
     */
    receive() external payable {
        // Simulate a gas-heavy computation
        uint256 counter = 0;
        for (uint256 i = 0; i < 10000; i++) {
            counter += i;
        }

        emit DonationReceived(msg.sender, msg.value);
    }
}