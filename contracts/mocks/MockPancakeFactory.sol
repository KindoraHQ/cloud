// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title MockPancakeFactory
 * @dev Mock implementation of PancakeSwap Factory for testing
 */
contract MockPancakeFactory {
    mapping(address => mapping(address => address)) private _pairs;
    address[] public allPairs;
    
    event PairCreated(address indexed token0, address indexed token1, address pair, uint256);
    
    function createPair(address tokenA, address tokenB) external returns (address pair) {
        require(tokenA != tokenB, "Factory: IDENTICAL_ADDRESSES");
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "Factory: ZERO_ADDRESS");
        require(_pairs[token0][token1] == address(0), "Factory: PAIR_EXISTS");
        
        // Deploy a mock pair
        pair = address(new MockPancakePair(token0, token1));
        _pairs[token0][token1] = pair;
        _pairs[token1][token0] = pair;
        allPairs.push(pair);
        
        emit PairCreated(token0, token1, pair, allPairs.length);
    }
    
    function getPair(address tokenA, address tokenB) external view returns (address) {
        return _pairs[tokenA][tokenB];
    }
    
    function allPairsLength() external view returns (uint256) {
        return allPairs.length;
    }
}

contract MockPancakePair {
    address public token0;
    address public token1;
    
    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
    }
    
    function sync() external {}
}
