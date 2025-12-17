const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * KINDORA TOKEN - BASIC UNIT TESTS
 * 
 * This file contains basic unit tests for the Kindora contract.
 * For comprehensive tests, see Kindora.comprehensive.test.js and Kindora.comprehensive.part2.test.js
 */

describe("Kindora Token - Basic Tests", function () {
  let owner, addr1, addr2;
  let kindora, router, factory, weth;
  
  const TOTAL_SUPPLY = ethers.parseEther("10000000");
  
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy mock contracts
    const MockWETH = await ethers.getContractFactory("MockWETH");
    weth = await MockWETH.deploy();
    
    const MockFactory = await ethers.getContractFactory("MockPancakeFactory");
    factory = await MockFactory.deploy();
    
    const MockRouter = await ethers.getContractFactory("MockPancakeRouter");
    router = await MockRouter.deploy(await factory.getAddress(), await weth.getAddress());
    
    // Deploy Kindora
    const Kindora = await ethers.getContractFactory("Kindora");
    kindora = await Kindora.deploy(await router.getAddress());
  });
  
  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await kindora.owner()).to.equal(owner.address);
    });
    
    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await kindora.balanceOf(owner.address);
      expect(ownerBalance).to.equal(TOTAL_SUPPLY);
    });
    
    it("Should have correct name and symbol", async function () {
      expect(await kindora.name()).to.equal("Kindora");
      expect(await kindora.symbol()).to.equal("KNR");
    });
  });
  
  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      // Transfer requires trading to be enabled first
      await kindora.setCharityWallet(addr1.address);
      await kindora.enableTrading();
      
      const amount = ethers.parseEther("50");
      await kindora.transfer(addr1.address, amount);
      expect(await kindora.balanceOf(addr1.address)).to.equal(amount);
    });
    
    it("Should fail if sender doesn't have enough tokens", async function () {
      await kindora.setCharityWallet(addr1.address);
      await kindora.enableTrading();
      
      const initialOwnerBalance = await kindora.balanceOf(owner.address);
      await expect(
        kindora.connect(addr1).transfer(owner.address, ethers.parseEther("1"))
      ).to.be.revertedWith("Insufficient balance");
    });
  });
  
  describe("Anti-Whale Limits", function () {
    beforeEach(async function () {
      await kindora.setCharityWallet(addr1.address);
      await kindora.enableTrading();
    });
    
    it("Should block a transaction exceeding the max tx limit", async function () {
      const maxTx = await kindora.maxTxAmount();
      const overLimit = maxTx + ethers.parseEther("1");
      
      await expect(
        kindora.transfer(addr1.address, overLimit)
      ).to.be.revertedWith("Exceeds maxWallet");
    });
    
    it("Should allow a transaction below the max tx limit", async function () {
      const maxTx = await kindora.maxTxAmount();
      const underLimit = maxTx - ethers.parseEther("1000");
      
      await expect(
        kindora.transfer(addr1.address, underLimit)
      ).to.not.be.reverted;
    });
    
    it("Should enforce max wallet limit", async function () {
      const maxWallet = await kindora.maxWalletAmount();
      const overLimit = maxWallet + ethers.parseEther("1");
      
      await expect(
        kindora.transfer(addr1.address, overLimit)
      ).to.be.revertedWith("Exceeds maxWallet");
    });
  });
});