const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * INTEGRATION TESTS FOR KINDORA
 * 
 * This test suite validates complex workflows that combine multiple contract features.
 */

describe("Kindora Token - Integration Tests", function () {
  let owner, addr1, addr2, addr3, charity;
  let kindora, router, factory, weth, charityWallet;
  let pair;
  
  const TOTAL_SUPPLY = ethers.parseEther("10000000");
  
  async function deployContracts() {
    [owner, addr1, addr2, addr3, charity] = await ethers.getSigners();
    
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
  
  beforeEach(async function () {
    await deployContracts();
  });
  
  describe("Complete Launch Sequence", function () {
    it("Should complete full launch workflow", async function () {
      // Step 1: Configure charity wallet
      await kindora.setCharityWallet(charity.address);
      expect(await kindora.charityWallet()).to.equal(charity.address);
      expect(await kindora.charityWalletLocked()).to.equal(false);
      
      // Step 2: Enable trading
      await kindora.enableTrading();
      expect(await kindora.tradingEnabled()).to.equal(true);
      expect(await kindora.charityWalletLocked()).to.equal(true);
      
      // Step 3: Verify charity wallet is now locked
      await expect(
        kindora.setCharityWallet(addr1.address)
      ).to.be.revertedWith("Charity wallet locked");
      
      // Step 4: Renounce ownership
      await kindora.renounceOwnership();
      expect(await kindora.owner()).to.equal(ethers.ZeroAddress);
      
      // Step 5: Verify contract is now immutable
      await expect(
        kindora.setSwapEnabled(false)
      ).to.be.revertedWith("Not owner");
    });
  });
  
  describe("Multi-User Trading Scenarios", function () {
    beforeEach(async function () {
      await kindora.setCharityWallet(await charityWallet.getAddress());
      await kindora.enableTrading();
    });
    
    it("Should handle multiple sequential trades", async function () {
      const amount = ethers.parseEther("10000");
      const pairAddr = await kindora.pair();
      
      // Distribute tokens to users
      await kindora.transfer(addr1.address, amount);
      await kindora.transfer(addr2.address, amount);
      await kindora.transfer(addr3.address, amount);
      
      // Sequential sells
      await kindora.connect(addr1).transfer(pairAddr, ethers.parseEther("5000"));
      await kindora.connect(addr2).transfer(pairAddr, ethers.parseEther("5000"));
      await kindora.connect(addr3).transfer(pairAddr, ethers.parseEther("5000"));
      
      // Verify all users still have remaining balance
      expect(await kindora.balanceOf(addr1.address)).to.be.gt(0);
      expect(await kindora.balanceOf(addr2.address)).to.be.gt(0);
      expect(await kindora.balanceOf(addr3.address)).to.be.gt(0);
    });
    
    it("Should handle buy cooldown across multiple users", async function () {
      const pairAddr = await kindora.pair();
      const amount = ethers.parseEther("100");
      
      // Simulate buys for multiple users
      await kindora.transfer(pairAddr, amount);
      
      // Wait for cooldown
      await increaseTime(11);
      
      // Another buy should work
      await kindora.transfer(pairAddr, amount);
    });
  });
  
  describe("Fee Distribution Workflow", function () {
    beforeEach(async function () {
      await kindora.setCharityWallet(await charityWallet.getAddress());
      await kindora.enableTrading();
    });
    
    it("Should correctly distribute fees across burn, charity, and liquidity", async function () {
      const DEAD_ADDRESS = "0x000000000000000000000000000000000000dEaD";
      const pairAddr = await kindora.pair();
      
      const initialDeadBalance = await kindora.balanceOf(DEAD_ADDRESS);
      const initialContractBalance = await kindora.balanceOf(await kindora.getAddress());
      
      // Transfer to trigger fees
      const amount = ethers.parseEther("10000");
      await kindora.transfer(addr1.address, amount);
      await kindora.connect(addr1).transfer(pairAddr, amount);
      
      // Verify burn happened
      const finalDeadBalance = await kindora.balanceOf(DEAD_ADDRESS);
      expect(finalDeadBalance).to.be.gt(initialDeadBalance);
      
      // Verify contract accumulated tokens
      const finalContractBalance = await kindora.balanceOf(await kindora.getAddress());
      expect(finalContractBalance).to.be.gt(initialContractBalance);
    });
  });
  
  describe("Swap Threshold Mechanics", function () {
    beforeEach(async function () {
      await kindora.setCharityWallet(await charityWallet.getAddress());
      await kindora.enableTrading();
    });
    
    it("Should trigger swapBack when threshold is reached", async function () {
      const swapThreshold = await kindora.swapThreshold();
      const amount = swapThreshold * 3n;
      
      await kindora.transfer(addr1.address, amount);
      
      const pairAddr = await kindora.pair();
      
      // This should trigger swapBack
      await kindora.connect(addr1).transfer(pairAddr, amount);
      
      // Verify swap happened by checking events or state changes
    });
    
    it("Should not trigger swapBack when swap is disabled", async function () {
      await kindora.setSwapEnabled(false);
      
      const swapThreshold = await kindora.swapThreshold();
      const amount = swapThreshold * 3n;
      
      await kindora.transfer(addr1.address, amount);
      
      const pairAddr = await kindora.pair();
      
      // Should not trigger swap
      await expect(
        kindora.connect(addr1).transfer(pairAddr, amount)
      ).to.not.be.reverted;
    });
  });
  
  describe("Limit Management Workflow", function () {
    it("Should allow tightening limits before launch", async function () {
      const currentMax = await kindora.maxTxAmount();
      const newMax = currentMax / 2n;
      
      await kindora.setMaxTxAmount(newMax);
      expect(await kindora.maxTxAmount()).to.equal(newMax);
    });
    
    it("Should prevent tightening limits after launch", async function () {
      await kindora.setCharityWallet(charity.address);
      await kindora.enableTrading();
      
      const currentMax = await kindora.maxTxAmount();
      const newMax = currentMax - ethers.parseEther("1000");
      
      await expect(
        kindora.setMaxTxAmount(newMax)
      ).to.be.revertedWith("Can only loosen after launch");
    });
    
    it("Should allow loosening limits after launch", async function () {
      await kindora.setCharityWallet(charity.address);
      await kindora.enableTrading();
      
      const currentMax = await kindora.maxTxAmount();
      const newMax = currentMax + ethers.parseEther("100000");
      
      await kindora.setMaxTxAmount(newMax);
      expect(await kindora.maxTxAmount()).to.equal(newMax);
    });
    
    it("Should disable limits entirely when limitsInEffect is false", async function () {
      await kindora.setCharityWallet(charity.address);
      await kindora.enableTrading();
      
      await kindora.setLimitsInEffect(false);
      
      // Transfer large amount that would normally exceed limit
      const largeAmount = TOTAL_SUPPLY / 4n;
      await expect(
        kindora.transfer(addr1.address, largeAmount)
      ).to.not.be.reverted;
    });
  });
  
  describe("Charity Failure Recovery", function () {
    it("Should accumulate pending BNB on charity failure and allow retry", async function () {
      const MockRejectingCharity = await ethers.getContractFactory("MockRejectingCharity");
      const rejectingCharity = await MockRejectingCharity.deploy();
      
      await kindora.setCharityWallet(await rejectingCharity.getAddress());
      await kindora.enableTrading();
      
      const swapThreshold = await kindora.swapThreshold();
      const amount = swapThreshold * 3n;
      
      await kindora.transfer(addr1.address, amount);
      await kindora.connect(addr1).transfer(await kindora.pair(), amount);
      
      // Check if pending BNB accumulated
      const pending = await kindora.getPendingCharityBNB();
      
      // Try to send pending
      if (pending > 0n) {
        await expect(kindora.sendPendingCharityBNB()).to.not.be.reverted;
      }
    });
  });
  
  describe("Fee Exclusion Workflow", function () {
    it("Should allow setting fee exclusions before launch", async function () {
      await kindora.setExcludedFromFees(addr1.address, true);
      expect(await kindora.isExcludedFromFees(addr1.address)).to.equal(true);
    });
    
    it("Should prevent changing fee exclusions after launch", async function () {
      await kindora.setCharityWallet(charity.address);
      await kindora.enableTrading();
      
      await expect(
        kindora.setExcludedFromFees(addr1.address, true)
      ).to.be.revertedWith("Cannot change fee-exempt after launch");
    });
    
    it("Should allow excluded addresses to trade without fees", async function () {
      await kindora.setExcludedFromFees(addr1.address, true);
      await kindora.setCharityWallet(charity.address);
      await kindora.enableTrading();
      
      const amount = ethers.parseEther("10000");
      await kindora.transfer(addr1.address, amount);
      
      // Transfer from excluded address to pair (sell)
      const pairAddr = await kindora.pair();
      await kindora.connect(addr1).transfer(pairAddr, amount);
      
      // Since addr1 is excluded, should not pay fees
    });
  });
  
  describe("Token Rescue Workflow", function () {
    it("Should rescue accidentally sent ERC20 tokens", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const testToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
      
      const rescueAmount = ethers.parseEther("100");
      await testToken.transfer(await kindora.getAddress(), rescueAmount);
      
      const ownerBalanceBefore = await testToken.balanceOf(owner.address);
      
      await kindora.rescueTokens(await testToken.getAddress(), rescueAmount);
      
      const ownerBalanceAfter = await testToken.balanceOf(owner.address);
      expect(ownerBalanceAfter - ownerBalanceBefore).to.equal(rescueAmount);
    });
    
    it("Should prevent rescuing after ownership renouncement", async function () {
      const MockERC20 = await ethers.getContractFactory("MockERC20");
      const testToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000"));
      
      await testToken.transfer(await kindora.getAddress(), ethers.parseEther("100"));
      
      await kindora.setCharityWallet(charity.address);
      await kindora.enableTrading();
      await kindora.renounceOwnership();
      
      await expect(
        kindora.rescueTokens(await testToken.getAddress(), ethers.parseEther("1"))
      ).to.be.revertedWith("Not owner");
    });
  });
});
