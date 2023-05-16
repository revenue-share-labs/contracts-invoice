import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  Invoice,
  InvoiceFactory,
  InvoiceFactory__factory,
  Invoice__factory,
  TestToken,
  TestToken__factory,
} from "../typechain-types";
import { randomSigners, snapshot } from "./utils";

describe("Invoice Max recipients test", () => {
  let invoiceFactory: InvoiceFactory,
    invoice: Invoice,
    testToken: TestToken,
    owner: SignerWithAddress,
    snapId: string;

  before(async () => {
    [owner] = await ethers.getSigners();

    testToken = await new TestToken__factory(owner).deploy();
    invoiceFactory = await new InvoiceFactory__factory(owner).deploy();
    const tx = await invoiceFactory.createInvoice({
      controller: owner.address,
      distributors: [owner.address],
      isImmutableRecipients: false,
      recipientsData: [{ recipient: owner.address, amount: 10000000 }],
      token: ethers.constants.AddressZero,
      creationId: ethers.constants.HashZero,
    });
    const receipt = await tx.wait();
    const invoiceContractAddress = receipt.events?.[3].args?.[0];
    invoice = await Invoice__factory.connect(
        invoiceContractAddress,
      owner
    );
    
  });

  beforeEach(async () => {
    snapId = await snapshot.take();
  });

  afterEach(async () => {
    await snapshot.restore(snapId);
  });

  describe("Different recipients values", () => {
    it("Gas test with 16 recipients", async () => {
      const recipient = randomSigners(16).map((signer) => signer.address);
      const amount: number[] = new Array(16).fill(ethers.utils.parseEther("3.125"));
      const recipients = recipient.map((recipient, i) => {
        return { recipient, amount: amount[i] };
      });

      await expect(invoice.setRecipients(recipients)).to.emit(
        invoice,
        "SetRecipients"
      );
      expect(await invoice.numberOfRecipients()).to.be.equal(16);

      const alice = recipients[0].recipient;
      const bob = recipients[14].recipient;
      const aliceBalanceBefore = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceBefore = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      await owner.sendTransaction({
        to: invoice.address,
        value: ethers.utils.parseEther("50"),
      });

      const tx = await invoice.redistributeNativeToken();

      const receipt = tx.wait();
      const totalGasUsed = (await receipt).gasUsed.toNumber();
      console.log("16 recipient gas used: ", totalGasUsed);

      const aliceBalanceAfter = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceAfter = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      expect(aliceBalanceAfter).to.be.equal(
        aliceBalanceBefore + ethers.utils.parseEther("3.125").toBigInt()
      );
      expect(bobBalanceAfter).to.be.equal(
        bobBalanceBefore + ethers.utils.parseEther("3.125").toBigInt()
      );
    });

    it("Gas test with 25 recipients", async () => {
      const recipient = randomSigners(25).map((signer) => signer.address);
      const amount: number[] = new Array(25).fill(ethers.utils.parseEther("2"));
      const recipients = recipient.map((recipient, i) => {
        return { recipient, amount: amount[i] };
      });

      await expect(invoice.setRecipients(recipients)).to.emit(
        invoice,
        "SetRecipients"
      );
      expect(await invoice.numberOfRecipients()).to.be.equal(25);

      const alice = recipients[3].recipient;
      const bob = recipients[22].recipient;
      const aliceBalanceBefore = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceBefore = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      await owner.sendTransaction({
        to: invoice.address,
        value: ethers.utils.parseEther("50"),
      });

      const tx = await invoice.redistributeNativeToken();

      const receipt = tx.wait();
      const totalGasUsed = (await receipt).gasUsed.toNumber();
      console.log("25 recipient gas used: ", totalGasUsed);

      const aliceBalanceAfter = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceAfter = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      expect(aliceBalanceAfter).to.be.equal(
        aliceBalanceBefore + ethers.utils.parseEther("2").toBigInt()
      );
      expect(bobBalanceAfter).to.be.equal(
        bobBalanceBefore + ethers.utils.parseEther("2").toBigInt()
      );
    });

    it("Gas test with 40 recipients", async () => {
        const recipient = randomSigners(40).map((signer) => signer.address);
        const amount: number[] = new Array(40).fill(ethers.utils.parseEther("1.25"));
        const recipients = recipient.map((recipient, i) => {
          return { recipient, amount: amount[i] };
        });

      await expect(invoice.setRecipients(recipients)).to.emit(
        invoice,
        "SetRecipients"
      );
      expect(await invoice.numberOfRecipients()).to.be.equal(40);

      const alice = recipients[15].recipient;
      const bob = recipients[36].recipient;
      const aliceBalanceBefore = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceBefore = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      await owner.sendTransaction({
        to: invoice.address,
        value: ethers.utils.parseEther("50"),
      });

      const tx = await invoice.redistributeNativeToken();

      const receipt = tx.wait();
      const totalGasUsed = (await receipt).gasUsed.toNumber();
      console.log("40 recipient gas used: ", totalGasUsed);

      const aliceBalanceAfter = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceAfter = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      expect(aliceBalanceAfter).to.be.equal(
        aliceBalanceBefore + ethers.utils.parseEther("1.25").toBigInt()
      );
      expect(bobBalanceAfter).to.be.equal(
        bobBalanceBefore + ethers.utils.parseEther("1.25").toBigInt()
      );
    });

    it("Gas test with 50 recipients", async () => {
        const recipient = randomSigners(50).map((signer) => signer.address);
        const amount: number[] = new Array(50).fill(ethers.utils.parseEther("1"));
        const recipients = recipient.map((recipient, i) => {
          return { recipient, amount: amount[i] };
        });

      await expect(invoice.setRecipients(recipients)).to.emit(
        invoice,
        "SetRecipients"
      );
      expect(await invoice.numberOfRecipients()).to.be.equal(50);

      const alice = recipients[7].recipient;
      const bob = recipients[43].recipient;
      const aliceBalanceBefore = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceBefore = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      await owner.sendTransaction({
        to: invoice.address,
        value: ethers.utils.parseEther("50"),
      });

      const tx = await invoice.redistributeNativeToken();

      const receipt = tx.wait();
      const totalGasUsed = (await receipt).gasUsed.toNumber();
      console.log("50 recipient gas used: ", totalGasUsed);

      const aliceBalanceAfter = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceAfter = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      expect(aliceBalanceAfter).to.be.equal(
        aliceBalanceBefore + ethers.utils.parseEther("1").toBigInt()
      );
      expect(bobBalanceAfter).to.be.equal(
        bobBalanceBefore + ethers.utils.parseEther("1").toBigInt()
      );
    });

    it("Gas test with 80 recipients", async () => {
        const recipient = randomSigners(80).map((signer) => signer.address);
        const amount: number[] = new Array(80).fill(ethers.utils.parseEther("0.625"));
        const recipients = recipient.map((recipient, i) => {
          return { recipient, amount: amount[i] };
        });

      await expect(invoice.setRecipients(recipients)).to.emit(
        invoice,
        "SetRecipients"
      );
      expect(await invoice.numberOfRecipients()).to.be.equal(80);

      const alice = recipients[9].recipient;
      const bob = recipients[71].recipient;
      const aliceBalanceBefore = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceBefore = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      await owner.sendTransaction({
        to: invoice.address,
        value: ethers.utils.parseEther("50"),
      });

      const tx = await invoice.redistributeNativeToken();

      const receipt = tx.wait();
      const totalGasUsed = (await receipt).gasUsed.toNumber();
      console.log("80 recipient gas used: ", totalGasUsed);

      const aliceBalanceAfter = (
        await ethers.provider.getBalance(alice)
      ).toBigInt();
      const bobBalanceAfter = (
        await ethers.provider.getBalance(bob)
      ).toBigInt();

      expect(aliceBalanceAfter).to.be.equal(
        aliceBalanceBefore + ethers.utils.parseEther("0.625").toBigInt()
      );
      expect(bobBalanceAfter).to.be.equal(
        bobBalanceBefore + ethers.utils.parseEther("0.625").toBigInt()
      );
    });
  });
});
