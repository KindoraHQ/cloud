const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Kindora Token", function () {
  let Kindora, kindora, owner, addr1, addr2;

  beforeEach(async function () {
    Kindora = await ethers.getContractFactory("Kindora");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();

    kindora = await Kindora.deploy("Kindora Token", "KIN", 1000000);
    await kindora.deployed();
  });

  describe("Deployment", function () {
    it("Should set the correct token name, symbol, and total supply", async function () {
      expect(await kindora.name()).to.equal("Kindora Token");
      expect(await kindora.symbol()).to.equal("KIN");
      expect(await kindora.totalSupply()).to.equal(1000000);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
      const ownerBalance = await kindora.balanceOf(owner.address);
      expect(await kindora.totalSupply()).to.equal(ownerBalance);
    });
  });

  describe("Ownership", function () {
    it("Should set the correct owner on deployment", async function () {
      expect(await kindora.owner()).to.equal(owner.address);
    });

    it("Should allow the owner to transfer ownership", async function () {
      await kindora.transferOwnership(addr1.address);
      expect(await kindora.owner()).to.equal(addr1.address);
    });

    it("Should not allow non-owners to transfer ownership", async function () {
      await expect(
        kindora.connect(addr1).transferOwnership(addr2.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      await kindora.transfer(addr1.address, 500);
      expect(await kindora.balanceOf(addr1.address)).to.equal(500);

      await kindora.connect(addr1).transfer(addr2.address, 200);
      expect(await kindora.balanceOf(addr1.address)).to.equal(300);
      expect(await kindora.balanceOf(addr2.address)).to.equal(200);
    });

    it("Should fail if sender doesn’t have enough tokens", async function () {
      const initialOwnerBalance = await kindora.balanceOf(owner.address);
      await expect(
        kindora.connect(addr1).transfer(owner.address, 1)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");

      expect(await kindora.balanceOf(owner.address)).to.equal(
        initialOwnerBalance
      );
    });

    it("Should update allowances correctly", async function () {
      await kindora.approve(addr1.address, 300);
      expect(await kindora.allowance(owner.address, addr1.address)).to.equal(300);

      await kindora.connect(addr1).transferFrom(owner.address, addr2.address, 200);
      expect(await kindora.balanceOf(addr2.address)).to.equal(200);
      expect(await kindora.allowance(owner.address, addr1.address)).to.equal(100);
    });

    it("Should fail if transfer amount exceeds allowance", async function () {
      await kindora.approve(addr1.address, 100);
      await expect(
        kindora.connect(addr1).transferFrom(owner.address, addr2.address, 200)
      ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
    });
  });
});
