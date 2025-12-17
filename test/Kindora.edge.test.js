const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * TEST SUITE 11: EDGE CASE TESTS
 * 
 * This test suite validates edge cases and boundary conditions for the Kindora contract.
 * Includes tests for zero amounts, address validations, and extreme values.
 */

describe("TEST SUITE 11: Edge Case Tests", function () {
  let owner, addr1, addr2;
  let kindora, router, factory, weth;
  
  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    
    const MockWETH = await ethers.getContractFactory("MockWETH");
    weth = await MockWETH.deploy();
    
    const MockFactory = await ethers.getContractFactory("MockPancakeFactory");
    factory = await MockFactory.deploy();
    
    const MockRouter = await ethers.getContractFactory("MockPancakeRouter");
    router = await MockRouter.deploy(await factory.getAddress(), await weth.getAddress());
    
    const Kindora = await ethers.getContractFactory("Kindora");
    kindora = await Kindora.deploy(await router.getAddress());
    
    await kindora.setCharityWallet(addr1.address);
    await kindora.enableTrading();
  });
  
  it("Should prevent transfer of zero amount", async function () {
    await expect(
      kindora.transfer(addr1.address, 0)
    ).to.be.revertedWith("Zero amount");
  });
  
  it("Should prevent transfer to zero address", async function () {
    await expect(
      kindora.transfer(ethers.ZeroAddress, ethers.parseEther("100"))
    ).to.be.revertedWith("ERC20: transfer to zero");
  });
  
  it("Should handle very small transfer amounts (1 wei)", async function () {
    const amount = ethers.parseEther("1000");
    await kindora.transfer(addr1.address, amount);
    
    const tinyAmount = 1n;
    await expect(
      kindora.connect(addr1).transfer(addr2.address, tinyAmount)
    ).to.not.be.reverted;
  });
  
  it("Should prevent transfer exceeding balance", async function () {
    const balance = await kindora.balanceOf(addr1.address);
    const tooMuch = balance + ethers.parseEther("1");
    
    await expect(
      kindora.connect(addr1).transfer(addr2.address, tooMuch)
    ).to.be.revertedWith("Insufficient balance");
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
  
  it("Should prevent transferFrom exceeding allowance", async function () {
    const amount = ethers.parseEther("1000");
    await kindora.transfer(addr1.address, amount);
    await kindora.connect(addr1).approve(addr2.address, ethers.parseEther("100"));
    
    await expect(
      kindora.connect(addr2).transferFrom(
        addr1.address,
        owner.address,
        ethers.parseEther("101")
      )
    ).to.be.revertedWith("ERC20: transfer exceeds allowance");
  });
  
  it("Should prevent setting zero address as charity wallet", async function () {
    const { kindora: k2 } = await deployFreshContracts();
    
    await expect(
      k2.setCharityWallet(ethers.ZeroAddress)
    ).to.be.revertedWith("Zero address");
  });
  
  it("Should prevent enabling trading without charity wallet", async function () {
    const { kindora: k2 } = await deployFreshContracts();
    
    await expect(
      k2.enableTrading()
    ).to.be.revertedWith("Set charity wallet first");
  });
  
  it("Should handle concurrent transactions", async function () {
    const amount = ethers.parseEther("10000");
    
    await kindora.transfer(addr1.address, amount);
    await kindora.transfer(addr2.address, amount);
    
    // Execute concurrent transfers
    await Promise.all([
      kindora.connect(addr1).transfer(addr2.address, ethers.parseEther("100")),
      kindora.connect(addr2).transfer(addr1.address, ethers.parseEther("100"))
    ]);
    
    // Verify balances are correct
    expect(await kindora.balanceOf(addr1.address)).to.be.gt(0);
    expect(await kindora.balanceOf(addr2.address)).to.be.gt(0);
  });
  
  async function deployFreshContracts() {
    const [owner] = await ethers.getSigners();
    
    const MockWETH = await ethers.getContractFactory("MockWETH");
    const weth = await MockWETH.deploy();
    
    const MockFactory = await ethers.getContractFactory("MockPancakeFactory");
    const factory = await MockFactory.deploy();
    
    const MockRouter = await ethers.getContractFactory("MockPancakeRouter");
    const router = await MockRouter.deploy(await factory.getAddress(), await weth.getAddress());
    
    const Kindora = await ethers.getContractFactory("Kindora");
    const kindora = await Kindora.deploy(await router.getAddress());
    
    return { kindora, router, factory, weth };
  }
});