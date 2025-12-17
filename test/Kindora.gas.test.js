const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * TEST SUITE 12: GAS USAGE TESTS
 * 
 * This suite measures gas consumption for various operations in the Kindora smart contract.
 * It validates that gas usage stays within acceptable thresholds.
 */

describe("TEST SUITE 12: Gas Usage Tests", function () {
  let owner, addr1, charity;
  let kindora, router, factory, weth, charityWallet;
  
  beforeEach(async function () {
    [owner, addr1, charity] = await ethers.getSigners();
    
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

  it("Should measure gas used for deployment", async function () {
    const Kindora = await ethers.getContractFactory("Kindora");
    const k2 = await Kindora.deploy(await router.getAddress());
    const receipt = await k2.deploymentTransaction().wait();
    
    console.log("Gas used for deployment:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(5000000n);
  });

  it("Should measure gas used for setting charity wallet", async function () {
    const tx = await kindora.setCharityWallet(charity.address);
    const receipt = await tx.wait();
    
    console.log("Gas used for setting charity wallet:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(100000n);
  });

  it("Should measure gas used for enabling trading", async function () {
    await kindora.setCharityWallet(charity.address);
    const tx = await kindora.enableTrading();
    const receipt = await tx.wait();
    
    console.log("Gas used for enabling trading:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(100000n);
  });

  it("Should measure gas used for simple transfers", async function () {
    await kindora.setCharityWallet(charity.address);
    await kindora.enableTrading();
    
    const amount = ethers.parseEther("100");
    const tx = await kindora.transfer(addr1.address, amount);
    const receipt = await tx.wait();
    
    console.log("Gas used for simple transfer:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(100000n);
  });
  
  it("Should measure gas used for transfer with fees (DEX sell)", async function () {
    await kindora.setCharityWallet(await charityWallet.getAddress());
    await kindora.enableTrading();
    
    await kindora.transfer(addr1.address, ethers.parseEther("10000"));
    
    const pairAddr = await kindora.pair();
    const tx = await kindora.connect(addr1).transfer(pairAddr, ethers.parseEther("1000"));
    const receipt = await tx.wait();
    
    console.log("Gas used for transfer with fees:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(300000n);
  });
  
  it("Should measure gas used for approve", async function () {
    const amount = ethers.parseEther("1000");
    const tx = await kindora.approve(addr1.address, amount);
    const receipt = await tx.wait();
    
    console.log("Gas used for approve:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(50000n);
  });
  
  it("Should measure gas used for transferFrom", async function () {
    await kindora.setCharityWallet(charity.address);
    await kindora.enableTrading();
    
    await kindora.transfer(addr1.address, ethers.parseEther("1000"));
    await kindora.connect(addr1).approve(owner.address, ethers.parseEther("500"));
    
    const tx = await kindora.transferFrom(
      addr1.address,
      charity.address,
      ethers.parseEther("100")
    );
    const receipt = await tx.wait();
    
    console.log("Gas used for transferFrom:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(150000n);
  });
  
  it("Should measure gas used for swap trigger", async function () {
    await kindora.setCharityWallet(await charityWallet.getAddress());
    await kindora.enableTrading();
    
    const swapThreshold = await kindora.swapThreshold();
    const amount = swapThreshold * 3n;
    
    await kindora.transfer(addr1.address, amount);
    
    const pairAddr = await kindora.pair();
    const tx = await kindora.connect(addr1).transfer(pairAddr, amount);
    const receipt = await tx.wait();
    
    console.log("Gas used for swap trigger:", receipt.gasUsed.toString());
    // Higher threshold as this includes swapBack logic
    expect(receipt.gasUsed).to.be.lt(500000n);
  });
  
  it("Should measure gas used for renounce ownership", async function () {
    await kindora.setCharityWallet(charity.address);
    await kindora.enableTrading();
    
    const tx = await kindora.renounceOwnership();
    const receipt = await tx.wait();
    
    console.log("Gas used for renounce ownership:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(50000n);
  });
  
  it("Should measure gas for setting swap enabled", async function () {
    const tx = await kindora.setSwapEnabled(false);
    const receipt = await tx.wait();
    
    console.log("Gas used for setSwapEnabled:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(50000n);
  });
  
  it("Should measure gas for setting cooldown enabled", async function () {
    const tx = await kindora.setCooldownEnabled(false);
    const receipt = await tx.wait();
    
    console.log("Gas used for setCooldownEnabled:", receipt.gasUsed.toString());
    expect(receipt.gasUsed).to.be.lt(50000n);
  });
});