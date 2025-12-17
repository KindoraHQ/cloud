// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MockRejectingCharity
 * @notice This mocking contract simulates a rejecting charity by reverting any received funds.
 */
contract MockRejectingCharity {

    /**
     * @notice Fallback function to reject any delegated calls.
     */
    fallback() external payable {
        revert("Fallback function rejects calls.");
    }

    /**
     * @notice Receive function to reject direct transfers.
     */
    receive() external payable {
        revert("Receive function rejects calls.");
    }
}