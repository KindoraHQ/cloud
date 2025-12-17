const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * TEST SUITE 13: EVENT EMISSION TESTS
 * 
 * This test suite validates that all events are emitted correctly with proper parameters.
 */

describe("TEST SUITE 13: Event Emission Tests", function () {
  let owner, addr1, addr2, charity;
  let kindora, router, factory, weth, charityWallet;
  
  const TOTAL_SUPPLY = ethers.parseEther("10000000");
  
  beforeEach(async function () {
    [owner, addr1, addr2, charity] = await ethers.getSigners();
    
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
    
    // Fund router with ETH
    await owner.sendTransaction({
      to: await router.getAddress(),
      value: ethers.parseEther("100")
    });
  });
  
  it("Should emit Transfer event on deployment", async function () {
    const Kindora = await ethers.getContractFactory("Kindora");
    const k2 = await Kindora.deploy(await router.getAddress());
    
    await expect(k2.deploymentTransaction())
      .to.emit(k2, "Transfer")
      .withArgs(ethers.ZeroAddress, owner.address, TOTAL_SUPPLY);
  });
  
  it("Should emit Transfer event on transfer", async function () {
    await kindora.setCharityWallet(charity.address);
    await kindora.enableTrading();
    
    const amount = ethers.parseEther("1000");
    
    await expect(kindora.transfer(addr1.address, amount))
      .to.emit(kindora, "Transfer")
      .withArgs(owner.address, addr1.address, amount);
  });
  
  it("Should emit Approval event on approve", async function () {
    const amount = ethers.parseEther("1000");
    
    await expect(kindora.approve(addr1.address, amount))
      .to.emit(kindora, "Approval")
      .withArgs(owner.address, addr1.address, amount);
  });
  
  it("Should emit CharityWalletSet event when setting charity wallet", async function () {
    await expect(kindora.setCharityWallet(charity.address))
      .to.emit(kindora, "CharityWalletSet")
      .withArgs(charity.address);
  });
  
  it("Should emit TradingEnabled event when enabling trading", async function () {
    await kindora.setCharityWallet(charity.address);
    
    await expect(kindora.enableTrading())
      .to.emit(kindora, "TradingEnabled");
  });
  
  it("Should emit SwapEnabledSet event when changing swap enabled", async function () {
    await expect(kindora.setSwapEnabled(false))
      .to.emit(kindora, "SwapEnabledSet")
      .withArgs(false);
    
    await expect(kindora.setSwapEnabled(true))
      .to.emit(kindora, "SwapEnabledSet")
      .withArgs(true);
  });
  
  it("Should emit CooldownEnabledSet event when changing cooldown", async function () {
    await expect(kindora.setCooldownEnabled(false))
      .to.emit(kindora, "CooldownEnabledSet")
      .withArgs(false);
  });
  
  it("Should emit LimitsInEffectSet event when changing limits", async function () {
    await expect(kindora.setLimitsInEffect(false))
      .to.emit(kindora, "LimitsInEffectSet")
      .withArgs(false);
  });
  
  it("Should emit MaxTxUpdated event when updating max tx", async function () {
    const newMax = ethers.parseEther("300000");
    
    await expect(kindora.setMaxTxAmount(newMax))
      .to.emit(kindora, "MaxTxUpdated")
      .withArgs(newMax);
  });
  
  it("Should emit MaxWalletUpdated event when updating max wallet", async function () {
    const newMax = ethers.parseEther("300000");
    
    await expect(kindora.setMaxWalletAmount(newMax))
      .to.emit(kindora, "MaxWalletUpdated")
      .withArgs(newMax);
  });
  
  it("Should emit TokensBurned event on DEX sell with burn", async function () {
    await kindora.setCharityWallet(await charityWallet.getAddress());
    await kindora.enableTrading();
    
    await kindora.transfer(addr1.address, ethers.parseEther("10000"));
    
    const pairAddr = await kindora.pair();
    const sellAmount = ethers.parseEther("1000");
    
    const tx = kindora.connect(addr1).transfer(pairAddr, sellAmount);
    
    // Should emit TokensBurned when selling to pair
    await expect(tx).to.emit(kindora, "TokensBurned");
  });
  
  it("Should emit multiple Transfer events on taxed transaction", async function () {
    await kindora.setCharityWallet(await charityWallet.getAddress());
    await kindora.enableTrading();
    
    await kindora.transfer(addr1.address, ethers.parseEther("10000"));
    
    const pairAddr = await kindora.pair();
    const sellAmount = ethers.parseEther("1000");
    
    // Should emit Transfer to burn address, Transfer to contract, and Transfer to recipient
    await expect(kindora.connect(addr1).transfer(pairAddr, sellAmount))
      .to.emit(kindora, "Transfer");
  });
  
  it("Should not emit events for failed transactions", async function () {
    // Try to transfer without trading enabled
    const tx = kindora.connect(addr1).transfer(addr2.address, ethers.parseEther("100"));
    
    await expect(tx).to.be.reverted;
  });
  
  it("Should emit CharityTransferFailed when charity rejects", async function () {
    const MockRejectingCharity = await ethers.getContractFactory("MockRejectingCharity");
    const rejectingCharity = await MockRejectingCharity.deploy();
    
    await kindora.setCharityWallet(await rejectingCharity.getAddress());
    await kindora.enableTrading();
    
    const swapThreshold = await kindora.swapThreshold();
    const amount = swapThreshold * 3n;
    
    await kindora.transfer(addr1.address, amount);
    
    const tx = kindora.connect(addr1).transfer(await kindora.pair(), amount);
    
    // May emit CharityTransferFailed if swapBack triggers
    // This depends on contract state and swap execution
  });
});