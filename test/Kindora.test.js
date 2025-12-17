// TEST SUITE 4: Trading Control Tests

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Trading Control Tests", function () {
  let contract, owner, addr1, addr2;

  beforeEach(async function () {
    const Contract = await ethers.getContractFactory("KindoraToken");
    [owner, addr1, addr2] = await ethers.getSigners();
    contract = await Contract.deploy();
    await contract.deployed();
  });

  it("Should start with trading disabled", async function () {
    expect(await contract.tradingEnabled()).to.be.false;
  });

  it("Should revert transfers when trading disabled (except excluded addresses)", async function () {
    await expect(contract.connect(addr1).transfer(addr2.address, 100)).to.be.revertedWith("Trading is disabled");
  });

  it("Should allow excluded addresses to transfer when trading disabled", async function () {
    await contract.setExcludedFromTrading(addr1.address, true);
    await expect(contract.connect(addr1).transfer(addr2.address, 100)).to.not.be.reverted;
  });

  it("Should require charity wallet before enabling trading", async function () {
    await expect(contract.enableTrading()).to.be.revertedWith("Charity wallet not set");
  });

  it("Should enable trading successfully when charity wallet is set", async function () {
    await contract.setCharityWallet(addr1.address);
    await contract.enableTrading();
    expect(await contract.tradingEnabled()).to.be.true;
  });

  it("Should emit TradingEnabled event", async function () {
    await contract.setCharityWallet(addr1.address);
    await expect(contract.enableTrading()).to.emit(contract, "TradingEnabled");
  });

  it("Should lock charity wallet after enabling trading", async function () {
    await contract.setCharityWallet(addr1.address);
    await contract.enableTrading();
    await expect(contract.setCharityWallet(addr2.address)).to.be.revertedWith("Charity wallet is locked");
  });

  it("Should NOT allow disabling trading after enabled (one-way)", async function () {
    await contract.setCharityWallet(addr1.address);
    await contract.enableTrading();
    await expect(contract.disableTrading()).to.be.revertedWith("Trading cannot be disabled");
  });

  it("Should NOT allow changing charity wallet after locked", async function () {
    await contract.setCharityWallet(addr1.address);
    await contract.enableTrading();
    await expect(contract.setCharityWallet(addr2.address)).to.be.revertedWith("Charity wallet is locked");
  });

  it("Should allow setting charity wallet before trading enabled", async function () {
    await expect(contract.setCharityWallet(addr1.address)).to.not.be.reverted;
  });

  it("Should revert setting charity wallet to zero address", async function () {
    await expect(contract.setCharityWallet(ethers.constants.AddressZero)).to.be.revertedWith("Charity wallet cannot be zero address");
  });
});
