// TEST SUITE 12: Gas Usage Tests
// This suite measures gas limits for various operations in the Kindora smart contract.
// Specifically, it covers deploy, enable trading, and transfer operations.

const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TEST SUITE 12: Gas Usage Tests", function () {
  let Contract, contract, deployer;

  before(async function () {
    [deployer] = await ethers.getSigners();
    Contract = await ethers.getContractFactory("Kindora");
  });

  beforeEach(async function () {
    contract = await Contract.deploy();
    await contract.deployed();
  });

  it("Should measure gas used for deployment", async function () {
    const tx = contract.deployTransaction;
    const receipt = await tx.wait();
    console.log("Gas used for deployment:", receipt.gasUsed.toString());
    expect(receipt.gasUsed.toNumber()).to.be.below(5000000); // Replace with appropriate threshold
  });

  it("Should measure gas used for enabling trading", async function () {
    const tx = await contract.enableTrading();
    const receipt = await tx.wait();
    console.log("Gas used for enabling trading:", receipt.gasUsed.toString());
    expect(receipt.gasUsed.toNumber()).to.be.below(100000); // Replace with appropriate threshold
  });

  it("Should measure gas used for transfers", async function () {
    await contract.enableTrading();
    const tx = await contract.transfer("0x0000000000000000000000000000000000000001", 100);
    const receipt = await tx.wait();
    console.log("Gas used for transfers:", receipt.gasUsed.toString());
    expect(receipt.gasUsed.toNumber()).to.be.below(65000); // Replace with appropriate threshold
  });
});