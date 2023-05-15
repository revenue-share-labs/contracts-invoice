import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { InvoiceFactory, InvoiceFactory__factory } from "../typechain-types";
import { snapshot } from "./utils";

describe("InvoiceFactory", () => {
  let invoiceFactory: InvoiceFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    snapId: string;

  before(async () => {
    [owner, alice] = await ethers.getSigners();
    invoiceFactory = await new InvoiceFactory__factory(owner).deploy();
  });

  beforeEach(async () => {
    snapId = await snapshot.take();
  });

  afterEach(async () => {
    await snapshot.restore(snapId);
  });

  describe("Deployment", () => {
    it("Should set the correct owner of the contract", async () => {
      expect(await invoiceFactory.owner()).to.be.equal(owner.address);
    });

    it("Should deploy RSC Valve Implementation", async () => {
      expect(await invoiceFactory.contractImplementation()).not.to.be.empty;
    });
  });

  describe("Ownership", () => {
    it("Only owner can renounce ownership", async () => {
      await expect(
        invoiceFactory.connect(alice).renounceOwnership()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only owner can transfer ownership", async () => {
      await expect(
        invoiceFactory.connect(alice).transferOwnership(alice.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Predict deterministic address", () => {
    it("Predicts address correctly", async () => {
      const AbiCoder = new ethers.utils.AbiCoder();
      const salt = ethers.utils.keccak256(
        AbiCoder.encode(
          [
            "address",
            "address[]",
            "bool",
            "bool",
            "uint256",
            "tuple(address addrs, uint256 percentage)[]",
            "bytes32",
            "address",
          ],
          [
            owner.address,
            [owner.address],
            false,
            true,
            0,
            [{ addrs: owner.address, percentage: 10000000 }],
            ethers.constants.HashZero,
            owner.address,
          ]
        )
      );

      const creationCode = [
        "0x3d602d80600a3d3981f3363d3d373d3d3d363d73",
        (await invoiceFactory.contractImplementation())
          .replace(/0x/, "")
          .toLowerCase(),
        "5af43d82803e903d91602b57fd5bf3",
      ].join("");

      const create2Addr = ethers.utils.getCreate2Address(
        invoiceFactory.address,
        salt,
        ethers.utils.keccak256(creationCode)
      );
    });
  });

  it("setPlatformFee()", async () => {
    await expect(
        invoiceFactory.connect(alice).setPlatformFee(2500000)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await invoiceFactory.setPlatformFee(2500000);
    expect(await invoiceFactory.platformFee()).to.be.equal(2500000);
    await expect(
        invoiceFactory.setPlatformFee(10000001)
    ).to.be.revertedWithCustomError(invoiceFactory, "InvalidFeePercentage");

    expect(await invoiceFactory.platformFee()).to.be.equal(2500000);
  });
});