// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./MockPancakeFactory.sol";

/**
 * @title MockPancakeRouter
 * @dev Mock implementation of PancakeSwap Router for testing
 */
contract MockPancakeRouter {
    address public immutable factory;
    address public immutable WETH;
    
    // Track swaps for testing
    uint256 public lastSwapAmount;
    uint256 public lastLiquidityTokenAmount;
    uint256 public lastLiquidityETHAmount;
    
    // Control swap behavior
    bool public shouldFailSwap;
    bool public shouldFailLiquidity;
    uint256 public mockETHOutput = 1 ether; // Default ETH output for swaps
    
    constructor(address _factory, address _weth) {
        factory = _factory;
        WETH = _weth;
    }
    
    function setMockETHOutput(uint256 _amount) external {
        mockETHOutput = _amount;
    }
    
    function setShouldFailSwap(bool _shouldFail) external {
        shouldFailSwap = _shouldFail;
    }
    
    function setShouldFailLiquidity(bool _shouldFail) external {
        shouldFailLiquidity = _shouldFail;
    }
    
    function swapExactTokensForETHSupportingFeeOnTransferTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external {
        require(!shouldFailSwap, "Mock: Swap failed");
        require(deadline >= block.timestamp, "Router: EXPIRED");
        require(path.length >= 2, "Router: INVALID_PATH");
        
        lastSwapAmount = amountIn;
        
        // Transfer tokens from sender
        IERC20Mock(path[0]).transferFrom(msg.sender, address(this), amountIn);
        
        // Send ETH to recipient (simulate swap)
        if (mockETHOutput > 0) {
            payable(to).transfer(mockETHOutput);
        }
    }
    
    function addLiquidityETH(
        address token,
        uint256 amountTokenDesired,
        uint256 amountTokenMin,
        uint256 amountETHMin,
        address to,
        uint256 deadline
    ) external payable returns (uint256 amountToken, uint256 amountETH, uint256 liquidity) {
        require(!shouldFailLiquidity, "Mock: Liquidity failed");
        require(deadline >= block.timestamp, "Router: EXPIRED");
        
        lastLiquidityTokenAmount = amountTokenDesired;
        lastLiquidityETHAmount = msg.value;
        
        // Transfer tokens from sender
        IERC20Mock(token).transferFrom(msg.sender, address(this), amountTokenDesired);
        
        return (amountTokenDesired, msg.value, amountTokenDesired + msg.value);
    }
    
    receive() external payable {}
}

interface IERC20Mock {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}
