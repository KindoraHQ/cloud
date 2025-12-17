// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MockCharityWallet
 * @dev A mock contract simulating a charity wallet that can accept ETH.
 */
contract MockCharityWallet {
    event DonationReceived(address indexed from, uint256 amount);

    /**
     * @dev Accept ETH donations and emit an event.
     */
    receive() external payable {
        emit DonationReceived(msg.sender, msg.value);
    }

    /**
     * @dev Fallback function to handle unexpected calls or non-ETH transfers.
     */
    fallback() external payable {
        emit DonationReceived(msg.sender, msg.value);
    }
}