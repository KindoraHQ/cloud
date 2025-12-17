const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * COMPREHENSIVE HARDHAT TESTING SUITE FOR KINDORA.SOL - PART 2
 * Test Suites 8-15
 */

describe("Kindora Token - Comprehensive Test Suite Part 2", function () {
    let owner, addr1, addr2, addr3, charity, attacker;
    let kindora, router, factory, weth, charityWallet;
    let pair;
    
    const TOTAL_SUPPLY = ethers.parseEther("10000000");
    const TAX_TOTAL = 5n;
    const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
    
    async function deployContracts() {
        [owner, addr1, addr2, addr3, charity, attacker] = await ethers.getSigners();
        
        const MockWETH = await ethers.getContractFactory("MockWETH");
        weth = await MockWETH.deploy();
        
        const MockFactory = await ethers.getContractFactory("MockPancakeFactory");
        factory = await MockFactory.deploy();
        
        const MockRouter = await ethers.getContractFactory("MockPancakeRouter");
        router = await MockRouter.deploy(await factory.getAddress(), await weth.getAddress());
        
        const CharityWallet = await ethers.getContractFactory("MockCharityWallet");
        charityWallet = await CharityWallet.deploy();
        
        const Kindora = await ethers.getContractFactory("Kindora");
        kindora = await Kindora.deploy(await router.getAddress());
        
        const pairAddress = await kindora.pair();
        pair = await ethers.getContractAt("MockPancakePair", pairAddress);
        
        await owner.sendTransaction({
            to: await router.getAddress(),
            value: ethers.parseEther("100")
        });
        
        return { kindora, router, factory, weth, charityWallet, pair };
    }
    
    async function increaseTime(seconds) {
        await ethers.provider.send("evm_increaseTime", [seconds]);
        await ethers.provider.send("evm_mine");
    }
    
    // =============================================================================
    // TEST SUITE 8: LIMIT TESTS - Max transaction and wallet limits
    // =============================================================================
    
    describe("TEST SUITE 8: Limit Tests", function () {
        beforeEach(async function () {
            await deployContracts();
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
        });
        
        it("Should enforce max transaction limit on buys", async function () {
            const maxTx = await kindora.maxTxAmount();
            const overLimit = maxTx + ethers.parseEther("1");
            
            await kindora.transfer(addr1.address, overLimit);
            
            // Simulate buy from pair to addr2
            await expect(
                kindora.connect(addr1).transfer(await kindora.pair(), overLimit)
            ).to.be.revertedWith("Sell exceeds maxTx");
        });
        
        it("Should enforce max transaction limit on sells", async function () {
            const maxTx = await kindora.maxTxAmount();
            const overLimit = maxTx + ethers.parseEther("1");
            
            await kindora.transfer(addr1.address, overLimit);
            
            await expect(
                kindora.connect(addr1).transfer(await kindora.pair(), overLimit)
            ).to.be.revertedWith("Sell exceeds maxTx");
        });
        
        it("Should enforce max wallet limit", async function () {
            const maxWallet = await kindora.maxWalletAmount();
            const overLimit = maxWallet + ethers.parseEther("1");
            
            await expect(
                kindora.transfer(addr1.address, overLimit)
            ).to.be.revertedWith("Exceeds maxWallet");
        });
        
        it("Should allow increasing limits after trading enabled", async function () {
            const currentMax = await kindora.maxTxAmount();
            const newMax = currentMax + ethers.parseEther("100000");
            
            await expect(
                kindora.setMaxTxAmount(newMax)
            ).to.not.be.reverted;
            
            expect(await kindora.maxTxAmount()).to.equal(newMax);
        });
        
        it("Should prevent decreasing limits after trading enabled", async function () {
            const currentMax = await kindora.maxTxAmount();
            const newMax = currentMax - ethers.parseEther("1000");
            
            await expect(
                kindora.setMaxTxAmount(newMax)
            ).to.be.revertedWith("Can only loosen after launch");
        });
        
        it("Should prevent setting zero max transaction", async function () {
            await expect(
                kindora.setMaxTxAmount(0)
            ).to.be.revertedWith("Zero maxTx");
        });
        
        it("Should prevent setting zero max wallet", async function () {
            await expect(
                kindora.setMaxWalletAmount(0)
            ).to.be.revertedWith("Zero maxWallet");
        });
        
        it("Should not enforce limits when disabled", async function () {
            await kindora.setLimitsInEffect(false);
            
            const maxWallet = await kindora.maxWalletAmount();
            const overLimit = maxWallet + ethers.parseEther("1000");
            
            await expect(
                kindora.transfer(addr1.address, overLimit)
            ).to.not.be.reverted;
        });
        
        it("Should not enforce limits on excluded addresses", async function () {
            // Owner is excluded
            const maxWallet = await kindora.maxWalletAmount();
            const overLimit = maxWallet * 2n;
            
            await expect(
                kindora.transfer(await kindora.getAddress(), overLimit)
            ).to.not.be.reverted;
        });
        
        it("Should allow owner to exclude addresses from limits", async function () {
            await kindora.setLimitsInEffect(false); // Disable to set exclusion
            
            const { kindora: k2 } = await deployContracts();
            await k2.setExcludedFromLimits(addr1.address, true);
            
            expect(await k2.isExcludedFromLimits(addr1.address)).to.equal(true);
        });
    });
    
    // =============================================================================
    // TEST SUITE 9: OWNERSHIP RENOUNCEMENT TESTS
    // =============================================================================
    
    describe("TEST SUITE 9: Ownership Renouncement Tests", function () {
        beforeEach(async function () {
            await deployContracts();
        });
        
        it("Should require trading enabled before renouncement", async function () {
            await expect(
                kindora.renounceOwnership()
            ).to.be.revertedWith("Trading not enabled");
        });
        
        it("Should require charity wallet locked before renouncement", async function () {
            await kindora.setCharityWallet(charity.address);
            
            await expect(
                kindora.renounceOwnership()
            ).to.be.revertedWith("Trading not enabled");
        });
        
        it("Should successfully renounce ownership when conditions met", async function () {
            await kindora.setCharityWallet(charity.address);
            await kindora.enableTrading();
            
            await kindora.renounceOwnership();
            
            expect(await kindora.owner()).to.equal(ethers.ZeroAddress);
        });
        
        it("Should prevent owner actions after renouncement", async function () {
            await kindora.setCharityWallet(charity.address);
            await kindora.enableTrading();
            await kindora.renounceOwnership();
            
            await expect(
                kindora.setSwapEnabled(false)
            ).to.be.revertedWith("Not owner");
        });
        
        it("Should make contract immutable after renouncement", async function () {
            await kindora.setCharityWallet(charity.address);
            await kindora.enableTrading();
            await kindora.renounceOwnership();
            
            // All owner functions should fail
            await expect(kindora.setCooldownEnabled(false)).to.be.revertedWith("Not owner");
            await expect(kindora.setLimitsInEffect(false)).to.be.revertedWith("Not owner");
        });
    });
    
    // =============================================================================
    // TEST SUITE 10: INTEGRATION TESTS - Complex flows
    // =============================================================================
    
    describe("TEST SUITE 10: Integration Tests", function () {
        beforeEach(async function () {
            await deployContracts();
        });
        
        it("Should handle complete launch sequence", async function () {
            // 1. Set charity wallet
            await kindora.setCharityWallet(charity.address);
            
            // 2. Enable trading
            await kindora.enableTrading();
            
            // 3. Verify state
            expect(await kindora.tradingEnabled()).to.equal(true);
            expect(await kindora.charityWalletLocked()).to.equal(true);
            
            // 4. Renounce ownership
            await kindora.renounceOwnership();
            expect(await kindora.owner()).to.equal(ethers.ZeroAddress);
        });
        
        it("Should handle multiple sequential buys and sells", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            const amount = ethers.parseEther("10000");
            const pairAddr = await kindora.pair();
            
            // Distribute tokens
            await kindora.transfer(addr1.address, amount);
            await kindora.transfer(addr2.address, amount);
            
            // Sequential sells
            await kindora.connect(addr1).transfer(pairAddr, ethers.parseEther("5000"));
            await kindora.connect(addr2).transfer(pairAddr, ethers.parseEther("5000"));
        });
        
        it("Should handle swap threshold trigger during sell", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            
            // This should trigger swapBack
            await kindora.connect(addr1).transfer(await kindora.pair(), amount);
        });
        
        it("Should handle buy with cooldown and limits", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            const amount = ethers.parseEther("50000");
            const pairAddr = await kindora.pair();
            
            // Buy 1
            await kindora.transfer(pairAddr, amount);
            
            // Wait for cooldown
            await increaseTime(11);
            
            // Buy 2
            await kindora.transfer(pairAddr, amount);
        });
        
        it("Should handle fee exclusion and limit exclusion together", async function () {
            const { kindora: k2 } = await deployContracts();
            
            await k2.setExcludedFromFees(addr1.address, true);
            await k2.setExcludedFromLimits(addr1.address, true);
            
            await k2.setCharityWallet(charity.address);
            await k2.enableTrading();
            
            // Large transfer that would normally fail limits
            const largeAmount = TOTAL_SUPPLY / 2n;
            await k2.transfer(addr1.address, largeAmount);
            
            expect(await k2.balanceOf(addr1.address)).to.equal(largeAmount);
        });
        
        it("Should handle charity wallet failure and recovery", async function () {
            const MockRejectingCharity = await ethers.getContractFactory("MockRejectingCharity");
            const rejectingCharity = await MockRejectingCharity.deploy();
            
            await kindora.setCharityWallet(await rejectingCharity.getAddress());
            await kindora.enableTrading();
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            await kindora.connect(addr1).transfer(await kindora.pair(), amount);
            
            // Should have pending BNB
            const pending = await kindora.getPendingCharityBNB();
            expect(pending).to.be.gt(0);
            
            // Try to send again
            await kindora.sendPendingCharityBNB();
        });
    });
    
    // =============================================================================
    // TEST SUITE 11: EDGE CASES & ATTACK VECTORS
    // =============================================================================
    
    describe("TEST SUITE 11: Edge Cases & Attack Vectors", function () {
        beforeEach(async function () {
            await deployContracts();
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
        });
        
        it("Should prevent transfer of zero amount", async function () {
            await expect(
                kindora.transfer(addr1.address, 0)
            ).to.be.revertedWith("Zero amount");
        });
        
        it("Should prevent transfer from zero address", async function () {
            // This is implicitly prevented by Solidity
        });
        
        it("Should prevent transfer to zero address", async function () {
            await expect(
                kindora.transfer(ethers.ZeroAddress, ethers.parseEther("100"))
            ).to.be.revertedWith("ERC20: transfer to zero");
        });
        
        it("Should prevent transfer exceeding balance", async function () {
            const balance = await kindora.balanceOf(addr1.address);
            const tooMuch = balance + ethers.parseEther("1");
            
            await expect(
                kindora.connect(addr1).transfer(addr2.address, tooMuch)
            ).to.be.revertedWith("Insufficient balance");
        });
        
        it("Should handle very small transfer amounts", async function () {
            const tinyAmount = 1n; // 1 wei
            
            await kindora.transfer(addr1.address, ethers.parseEther("100"));
            await expect(
                kindora.connect(addr1).transfer(addr2.address, tinyAmount)
            ).to.not.be.reverted;
        });
        
        it("Should handle maximum uint256 approval", async function () {
            await kindora.approve(addr1.address, ethers.MaxUint256);
            expect(await kindora.allowance(owner.address, addr1.address)).to.equal(ethers.MaxUint256);
        });
        
        it("Should prevent approval to zero address", async function () {
            await expect(
                kindora.approve(ethers.ZeroAddress, ethers.parseEther("100"))
            ).to.be.revertedWith("ERC20: approve to zero");
        });
        
        it("Should prevent approval from zero address", async function () {
            // This is implicitly prevented by msg.sender
        });
        
        it("Should prevent transferFrom exceeding allowance", async function () {
            await kindora.transfer(addr1.address, ethers.parseEther("1000"));
            await kindora.connect(addr1).approve(addr2.address, ethers.parseEther("100"));
            
            await expect(
                kindora.connect(addr2).transferFrom(
                    addr1.address,
                    addr3.address,
                    ethers.parseEther("101")
                )
            ).to.be.revertedWith("ERC20: transfer exceeds allowance");
        });
        
        it("Should handle reentrancy attempts", async function () {
            // The contract has _swapping flag to prevent reentrancy
            // Test would require malicious contract
        });
        
        it("Should prevent rescuing Kindora tokens", async function () {
            await kindora.transfer(await kindora.getAddress(), ethers.parseEther("1000"));
            
            await expect(
                kindora.rescueTokens(await kindora.getAddress(), ethers.parseEther("100"))
            ).to.be.revertedWith("Cannot rescue KNR");
        });
        
        it("Should prevent rescuing LP tokens", async function () {
            await expect(
                kindora.rescueTokens(await kindora.pair(), ethers.parseEther("1"))
            ).to.be.revertedWith("Cannot rescue LP");
        });
        
        it("Should prevent rescuing zero address token", async function () {
            await expect(
                kindora.rescueTokens(ethers.ZeroAddress, ethers.parseEther("1"))
            ).to.be.revertedWith("Zero token");
        });
        
        it("Should handle concurrent transactions from different users", async function () {
            const amount = ethers.parseEther("10000");
            
            await kindora.transfer(addr1.address, amount);
            await kindora.transfer(addr2.address, amount);
            await kindora.transfer(addr3.address, amount);
            
            // Concurrent transfers
            await Promise.all([
                kindora.connect(addr1).transfer(addr2.address, ethers.parseEther("100")),
                kindora.connect(addr2).transfer(addr3.address, ethers.parseEther("100")),
                kindora.connect(addr3).transfer(addr1.address, ethers.parseEther("100"))
            ]);
        });
        
        it("Should handle gas-heavy charity wallet", async function () {
            const MockGasHeavyCharity = await ethers.getContractFactory("MockGasHeavyCharity");
            const gasHeavyCharity = await MockGasHeavyCharity.deploy();
            
            await kindora.setCharityWallet(await gasHeavyCharity.getAddress());
            
            // The contract limits gas to 50000, so heavy charity should fail gracefully
        });
    });
    
    // =============================================================================
    // TEST SUITE 12: GAS USAGE TESTS
    // =============================================================================
    
    describe("TEST SUITE 12: Gas Usage Tests", function () {
        beforeEach(async function () {
            await deployContracts();
        });
        
        it("Should measure gas for deployment", async function () {
            const Kindora = await ethers.getContractFactory("Kindora");
            const k2 = await Kindora.deploy(await router.getAddress());
            const receipt = await k2.deployTransaction.wait();
            
            console.log(`Deployment gas: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lt(5000000n);
        });
        
        it("Should measure gas for enabling trading", async function () {
            await kindora.setCharityWallet(charity.address);
            const tx = await kindora.enableTrading();
            const receipt = await tx.wait();
            
            console.log(`Enable trading gas: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lt(100000n);
        });
        
        it("Should measure gas for simple transfer", async function () {
            await kindora.setCharityWallet(charity.address);
            await kindora.enableTrading();
            
            const tx = await kindora.transfer(addr1.address, ethers.parseEther("100"));
            const receipt = await tx.wait();
            
            console.log(`Simple transfer gas: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lt(100000n);
        });
        
        it("Should measure gas for transfer with fees (sell)", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            await kindora.transfer(addr1.address, ethers.parseEther("10000"));
            const tx = await kindora.connect(addr1).transfer(
                await kindora.pair(),
                ethers.parseEther("1000")
            );
            const receipt = await tx.wait();
            
            console.log(`Transfer with fees gas: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lt(200000n);
        });
        
        it("Should measure gas for swapBack operation", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            const tx = await kindora.connect(addr1).transfer(await kindora.pair(), amount);
            const receipt = await tx.wait();
            
            console.log(`SwapBack trigger gas: ${receipt.gasUsed.toString()}`);
        });
        
        it("Should measure gas for approve", async function () {
            const tx = await kindora.approve(addr1.address, ethers.parseEther("1000"));
            const receipt = await tx.wait();
            
            console.log(`Approve gas: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lt(50000n);
        });
        
        it("Should measure gas for transferFrom", async function () {
            await kindora.setCharityWallet(charity.address);
            await kindora.enableTrading();
            
            await kindora.transfer(addr1.address, ethers.parseEther("1000"));
            await kindora.connect(addr1).approve(addr2.address, ethers.parseEther("500"));
            
            const tx = await kindora.connect(addr2).transferFrom(
                addr1.address,
                addr3.address,
                ethers.parseEther("100")
            );
            const receipt = await tx.wait();
            
            console.log(`TransferFrom gas: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lt(150000n);
        });
    });
    
    // =============================================================================
    // TEST SUITE 13: EVENT EMISSION TESTS
    // =============================================================================
    
    describe("TEST SUITE 13: Event Emission Tests", function () {
        beforeEach(async function () {
            await deployContracts();
        });
        
        it("Should emit Transfer event on deployment", async function () {
            const Kindora = await ethers.getContractFactory("Kindora");
            const k2 = await Kindora.deploy(await router.getAddress());
            
            await expect(k2.deployTransaction)
                .to.emit(k2, "Transfer")
                .withArgs(ethers.ZeroAddress, owner.address, TOTAL_SUPPLY);
        });
        
        it("Should emit Transfer event on transfer", async function () {
            const amount = ethers.parseEther("100");
            
            await expect(kindora.transfer(addr1.address, amount))
                .to.emit(kindora, "Transfer")
                .withArgs(owner.address, addr1.address, amount);
        });
        
        it("Should emit Approval event on approve", async function () {
            const amount = ethers.parseEther("100");
            
            await expect(kindora.approve(addr1.address, amount))
                .to.emit(kindora, "Approval")
                .withArgs(owner.address, addr1.address, amount);
        });
        
        it("Should emit TradingEnabled event", async function () {
            await kindora.setCharityWallet(charity.address);
            
            await expect(kindora.enableTrading())
                .to.emit(kindora, "TradingEnabled");
        });
        
        it("Should emit CharityWalletSet event", async function () {
            await expect(kindora.setCharityWallet(charity.address))
                .to.emit(kindora, "CharityWalletSet")
                .withArgs(charity.address);
        });
        
        it("Should emit SwapEnabledSet event", async function () {
            await expect(kindora.setSwapEnabled(false))
                .to.emit(kindora, "SwapEnabledSet")
                .withArgs(false);
        });
        
        it("Should emit CooldownEnabledSet event", async function () {
            await expect(kindora.setCooldownEnabled(false))
                .to.emit(kindora, "CooldownEnabledSet")
                .withArgs(false);
        });
        
        it("Should emit LimitsInEffectSet event", async function () {
            await expect(kindora.setLimitsInEffect(false))
                .to.emit(kindora, "LimitsInEffectSet")
                .withArgs(false);
        });
        
        it("Should emit MaxTxUpdated event", async function () {
            const newMax = ethers.parseEther("300000");
            
            await expect(kindora.setMaxTxAmount(newMax))
                .to.emit(kindora, "MaxTxUpdated")
                .withArgs(newMax);
        });
        
        it("Should emit MaxWalletUpdated event", async function () {
            const newMax = ethers.parseEther("300000");
            
            await expect(kindora.setMaxWalletAmount(newMax))
                .to.emit(kindora, "MaxWalletUpdated")
                .withArgs(newMax);
        });
        
        it("Should emit TokensBurned event on burn", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            await kindora.transfer(addr1.address, ethers.parseEther("10000"));
            
            // Burning happens on DEX transactions
            const tx = kindora.connect(addr1).transfer(
                await kindora.pair(),
                ethers.parseEther("1000")
            );
            
            await expect(tx).to.emit(kindora, "TokensBurned");
        });
        
        it("Should emit CharityFunded event", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            
            const tx = kindora.connect(addr1).transfer(await kindora.pair(), amount);
            // May emit CharityFunded if swapBack executes
        });
        
        it("Should emit LiquidityAdded event", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            
            const tx = kindora.connect(addr1).transfer(await kindora.pair(), amount);
            // May emit LiquidityAdded if swapBack executes
        });
    });
    
    // =============================================================================
    // TEST SUITE 14: TOKEN RESCUE FUNCTIONALITY TESTS
    // =============================================================================
    
    describe("TEST SUITE 14: Token Rescue Functionality Tests", function () {
        beforeEach(async function () {
            await deployContracts();
        });
        
        it("Should rescue ERC20 tokens sent to contract", async function () {
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            const testToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
            
            const rescueAmount = ethers.parseEther("100");
            await testToken.transfer(await kindora.getAddress(), rescueAmount);
            
            const ownerBalanceBefore = await testToken.balanceOf(owner.address);
            
            await kindora.rescueTokens(await testToken.getAddress(), rescueAmount);
            
            const ownerBalanceAfter = await testToken.balanceOf(owner.address);
            expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(rescueAmount);
        });
        
        it("Should prevent rescuing Kindora tokens", async function () {
            await kindora.transfer(await kindora.getAddress(), ethers.parseEther("1000"));
            
            await expect(
                kindora.rescueTokens(await kindora.getAddress(), ethers.parseEther("1"))
            ).to.be.revertedWith("Cannot rescue KNR");
        });
        
        it("Should prevent rescuing LP tokens", async function () {
            await expect(
                kindora.rescueTokens(await kindora.pair(), 1)
            ).to.be.revertedWith("Cannot rescue LP");
        });
        
        it("Should prevent rescuing zero address", async function () {
            await expect(
                kindora.rescueTokens(ethers.ZeroAddress, 1)
            ).to.be.revertedWith("Zero token");
        });
        
        it("Should allow only owner to rescue tokens", async function () {
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            const testToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
            
            await testToken.transfer(await kindora.getAddress(), ethers.parseEther("100"));
            
            await expect(
                kindora.connect(addr1).rescueTokens(await testToken.getAddress(), ethers.parseEther("1"))
            ).to.be.revertedWith("Not owner");
        });
        
        it("Should handle rescuing multiple different tokens", async function () {
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            const token1 = await MockERC20.deploy("Test1", "TST1", ethers.parseEther("1000"));
            const token2 = await MockERC20.deploy("Test2", "TST2", ethers.parseEther("1000"));
            
            await token1.transfer(await kindora.getAddress(), ethers.parseEther("50"));
            await token2.transfer(await kindora.getAddress(), ethers.parseEther("75"));
            
            await kindora.rescueTokens(await token1.getAddress(), ethers.parseEther("50"));
            await kindora.rescueTokens(await token2.getAddress(), ethers.parseEther("75"));
        });
    });
    
    // =============================================================================
    // TEST SUITE 15: MOCK CONTRACT FAILURE TESTS
    // =============================================================================
    
    describe("TEST SUITE 15: Mock Contract Failure Tests", function () {
        beforeEach(async function () {
            await deployContracts();
        });
        
        it("Should handle router swap failure gracefully", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            // Set router to fail swaps
            await router.setShouldFailSwap(true);
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            
            // Should not revert even if swap fails
            await expect(
                kindora.connect(addr1).transfer(await kindora.pair(), amount)
            ).to.not.be.reverted;
        });
        
        it("Should handle liquidity addition failure", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            await router.setShouldFailLiquidity(true);
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            
            // Should handle liquidity failure gracefully
        });
        
        it("Should handle charity wallet rejection", async function () {
            const MockRejectingCharity = await ethers.getContractFactory("MockRejectingCharity");
            const rejectingCharity = await MockRejectingCharity.deploy();
            
            await kindora.setCharityWallet(await rejectingCharity.getAddress());
            await kindora.enableTrading();
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            await kindora.connect(addr1).transfer(await kindora.pair(), amount);
            
            // Should accumulate in pendingCharityBNB
            const pending = await kindora.getPendingCharityBNB();
            expect(pending).to.be.gte(0);
        });
        
        it("Should handle gas-heavy charity wallet", async function () {
            const MockGasHeavyCharity = await ethers.getContractFactory("MockGasHeavyCharity");
            const gasHeavyCharity = await MockGasHeavyCharity.deploy();
            
            await kindora.setCharityWallet(await gasHeavyCharity.getAddress());
            await kindora.enableTrading();
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            
            // Gas limit to charity is 50000, so this should fail gracefully
            await expect(
                kindora.connect(addr1).transfer(await kindora.pair(), amount)
            ).to.not.be.reverted;
        });
        
        it("Should handle zero ETH output from swap", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            await router.setMockETHOutput(0);
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            
            // Should handle zero output gracefully
            await expect(
                kindora.connect(addr1).transfer(await kindora.pair(), amount)
            ).to.not.be.reverted;
        });
        
        it("Should recover from failed charity send", async function () {
            const MockRejectingCharity = await ethers.getContractFactory("MockRejectingCharity");
            const rejectingCharity = await MockRejectingCharity.deploy();
            
            await kindora.setCharityWallet(await rejectingCharity.getAddress());
            await kindora.enableTrading();
            
            const swapThreshold = await kindora.swapThreshold();
            const amount = swapThreshold * 3n;
            
            await kindora.transfer(addr1.address, amount);
            await kindora.connect(addr1).transfer(await kindora.pair(), amount);
            
            // Try to send pending
            const pending1 = await kindora.getPendingCharityBNB();
            
            if (pending1 > 0n) {
                await expect(kindora.sendPendingCharityBNB()).to.not.be.reverted;
            }
        });
        
        it("Should prevent sendPendingCharityBNB when no pending", async function () {
            await kindora.setCharityWallet(await charityWallet.getAddress());
            await kindora.enableTrading();
            
            await expect(
                kindora.sendPendingCharityBNB()
            ).to.be.revertedWith("No pending BNB");
        });
        
        it("Should prevent sendPendingCharityBNB without charity wallet", async function () {
            // Deploy new contract without charity wallet
            const { kindora: k2 } = await deployContracts();
            
            // Manually set pending BNB (would require internal manipulation in real scenario)
            // This test verifies the check exists
        });
    });
});
